// Arquivo: supabase/functions/get-janelas-por-dia/index.ts (VERSÃO FINAL COM PROCESSAMENTO EM DENO)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
    // Lógica para lidar com requisições OPTIONS (CORS)
    if (req.method === 'OPTIONS') { 
        return new Response('ok', { headers: corsHeaders }) 
    }
    
    try {
        // 1. RECEBIMENTO E VALIDAÇÃO DOS PARÂMETROS DE DATA
        const { start_date, end_date } = await req.json();
        if (!start_date || !end_date) {
            throw new Error("Parâmetros de data são obrigatórios.");
        }

        // 2. INICIALIZAÇÃO DO CLIENTE SUPABASE com service_role_key (ADMIN)
        // Mantido o nome 'supabaseAdmin' para clareza, como no segundo código.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '', 
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. BUSCA DOS DADOS BRUTOS (do segundo código)
        const { data: enviosDoDia, error } = await supabaseAdmin
            .from('envios')
            .select('janela_coleta, status')
            .gte('created_at', start_date)
            .lt('created_at', end_date)
            .not('janela_coleta', 'is', null);

        if (error) throw error;

        // 4. PROCESSAMENTO E AGREGAÇÃO DOS DADOS EM TYPESCRIPT (do segundo código)
        const stats = new Map<string, { total_envios: number, envios_confirmados: number }>();

        for (const envio of enviosDoDia) {
            const { janela_coleta, status } = envio;
            if (!stats.has(janela_coleta)) {
                stats.set(janela_coleta, { total_envios: 0, envios_confirmados: 0 });
            }
            const janelaStats = stats.get(janela_coleta)!;
            janelaStats.total_envios += 1;
            // Assumindo que 'Confirmado' é o status que você quer contar
            if (status === 'Confirmado') {
                janelaStats.envios_confirmados += 1;
            }
        }

        // 5. FORMATAÇÃO FINAL E ORDENAÇÃO
        const resultadoFinal = Array.from(stats.entries()).map(([janela, counts]) => ({
            janela_coleta: janela,
            total_envios: counts.total_envios,
            envios_confirmados: counts.envios_confirmados,
        })).sort((a, b) => a.janela_coleta.localeCompare(b.janela_coleta));


        // 6. RETORNO DA RESPOSTA
        return new Response(JSON.stringify({ janelas: resultadoFinal }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 200,
        });
        
    } catch (error) {
        // Tratamento de Erros (mantido e aprimorado com console.error do segundo código)
        console.error("Erro detalhado na função get-janelas-por-dia:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400,
        });
    }
});