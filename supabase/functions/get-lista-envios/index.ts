// Arquivo: supabase/functions/get-lista-envios/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // O Supabase exige que a função responda a uma requisição "OPTIONS"
  // para verificar a segurança. Esta parte cuida disso.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cria um cliente de administração para acessar o banco de dados.
    // Ele usa as variáveis de ambiente do Supabase automaticamente.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // A MÁGICA ACONTECE AQUI:
    // 1. from('envios'): Seleciona a tabela "envios".
    // 2. select('*'): Pega todas as colunas.
    // 3. order('created_at', { ascending: false }): Ordena pela data de criação,
    //    mostrando os mais novos primeiro.
    const { data, error } = await supabaseAdmin
      .from('envios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error
    }

    // Retorna os dados encontrados (a lista de envios) como JSON.
    return new Response(JSON.stringify({ envios: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Se der algum erro, retorna uma mensagem de erro.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})