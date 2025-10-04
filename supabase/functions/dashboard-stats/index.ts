import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Busca todos os envios para fazer os cálculos
    const { data: envios, error } = await supabaseAdmin.from('envios').select('*');
    if (error) throw error;
    
    // --- CÁLCULO DOS KPIs ---

    // 1. KPIs Gerais
    const totalEnvios = envios.length;
    const valorTotal = envios.reduce((sum, e) => sum + (e.valor_venda || 0), 0);
    
    // 2. Progresso (Pendentes vs. Concluídos)
    const concluidos = envios.filter(e => e.status === 'Confirmado').length;
    const pendentes = totalEnvios - concluidos;
    
    // 3. Alerta de Refrigerados (conta pendentes que requerem refrigeração)
    const alertaRefrigerados = envios.filter(e => e.status === 'Pendente' && e.requer_refrigeracao === true).length;
    
    // 4. Envios Pendentes por Janela de Coleta
    const pendentesPorJanela = envios
      .filter(e => e.status === 'Pendente' && e.janela_coleta)
      .reduce((acc, e) => {
        acc[e.janela_coleta] = (acc[e.janela_coleta] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
    const pendentesPorJanelaArray = Object.entries(pendentesPorJanela).map(([janela, total]) => ({
        janela_coleta: janela,
        total: total,
    }));
    
    // 5. Envios por UF (para o mapa)
    const enviosPorUF = envios.reduce((acc, e) => {
      if (e.uf) {
        acc[e.uf] = (acc[e.uf] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Monta o objeto de resposta final, no formato que o script.js espera
    const responsePayload = {
      totalEnvios,
      valorTotal,
      progresso: {
        pendentes,
        concluidos,
      },
      alertaRefrigerados,
      pendentesPorJanela: pendentesPorJanelaArray,
      enviosPorUF,
    };
    
    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});