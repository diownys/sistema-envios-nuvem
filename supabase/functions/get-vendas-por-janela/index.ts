// Arquivo: supabase/functions/get-vendas-por-janela/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { janela } = await req.json() // Recebe o nome da janela do frontend

    if (!janela) {
      throw new Error('O parâmetro "janela" é obrigatório.')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Busca no banco filtrando pela janela de coleta
    const { data, error } = await supabaseAdmin
      .from('envios')
      .select('*') // Pega todos os dados da venda
      .eq('janela_coleta', janela) // O filtro mágico acontece aqui!
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ vendas: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Erro na função get-vendas-por-janela:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})