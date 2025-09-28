// Arquivo: supabase/functions/get-lista-envios/index.ts (VERSÃO FINAL)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Usamos o cliente de ADMIN para ter a permissão de chamar a função
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // A MÁGICA ACONTECE AQUI:
    // Chamamos a função do banco de dados diretamente
    const { data, error } = await supabaseAdmin.rpc('get_janelas_confirmadas')

    if (error) {
      throw error
    }

    // A função já retorna os dados no formato que queremos, então só precisamos mapear
    const janelas = data.map((item: any) => item.janela_coleta);

    return new Response(JSON.stringify({ janelas: janelas }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Erro na função get-lista-envios:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})