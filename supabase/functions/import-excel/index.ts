// Arquivo: supabase/functions/import-excel/index.ts (VERSÃO SIMPLIFICADA)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// As funções auxiliares continuam aqui, pois ainda precisamos delas
const removeAccents = (str: string) => str ? str.normalize("NFD").replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim() : '';
const getLogoUrl = (janela: string | null): string | null => {
    if (!janela) return null;
    const n = removeAccents(janela.toLowerCase());
    if (n.includes('agile')) return 'https://i.imgur.com/GR1yJvH.png';
    if (n.includes('mota')) return 'https://i.imgur.com/PTFnNod.jpeg';
    // ... outras regras
    return null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }
  try {
    // A API agora espera receber os dados já processados em formato JSON
    const vendas = await req.json();
    if (!vendas || !Array.isArray(vendas)) {
      throw new Error("Dados inválidos recebidos.");
    }

    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const dadosParaInserir = vendas.map((venda: any) => {
        return {
            ...venda, // Pega os dados já mapeados do frontend
            user_id: user.id,
            carrier_logo: getLogoUrl(venda.janela_coleta),
        };
    });

    if (dadosParaInserir.length === 0) {
      throw new Error("Nenhuma linha válida recebida para importação.");
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { error } = await supabaseAdmin.from('envios').insert(dadosParaInserir);
    if (error) throw error;

    return new Response(JSON.stringify({ message: `${dadosParaInserir.length} vendas importadas com sucesso!` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    console.error("Erro na função import-excel (simplificada):", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});