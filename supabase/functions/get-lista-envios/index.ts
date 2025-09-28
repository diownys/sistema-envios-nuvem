// Arquivo: supabase/functions/get-lista-envios/index.ts (VERSÃO CORRETA E LIMPA)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Esta é a forma correta de pegar as chaves no backend
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: todosOsEnvios, error } = await supabaseAdmin
      .from('envios')
      .select('janela_coleta')
      .not('janela_coleta', 'is', null)

    if (error) {
      throw error
    }

    const janelasUnicas = [...new Set(todosOsEnvios.map(item => item.janela_coleta))].sort();

    return new Response(JSON.stringify({ janelas: janelasUnicas }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Se um erro ainda acontecer, ele será retornado
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})