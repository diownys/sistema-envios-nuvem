// Arquivo: supabase/functions/get-janelas-por-dia/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }
  try {
    // Recebe as datas de início e fim do filtro
    const { start_date, end_date } = await req.json();
    if (!start_date || !end_date) throw new Error("Parâmetros de data são obrigatórios.");

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Busca as janelas de coleta distintas que têm envios no período especificado
    const { data, error } = await supabase
      .from('envios')
      .select('janela_coleta')
      .gte('created_at', start_date) // Maior ou igual ao início do dia
      .lt('created_at', end_date)   // Menor que o início do próximo dia
      .not('janela_coleta', 'is', null);

    if (error) throw error;

    // Cria uma lista de janelas únicas
    const janelasUnicas = [...new Set(data.map(item => item.janela_coleta))].sort();

    return new Response(JSON.stringify({ janelas: janelasUnicas }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});