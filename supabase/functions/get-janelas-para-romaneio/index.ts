// Arquivo: supabase/functions/get-janelas-para-romaneio/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }
  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    // Chama a função SQL que busca apenas janelas com vendas confirmadas
    const { data, error } = await supabaseAdmin.rpc('get_janelas_confirmadas')
    if (error) throw error;

    const janelas = data.map((item: any) => item.janela_coleta);

    return new Response(JSON.stringify({ janelas: janelas }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})