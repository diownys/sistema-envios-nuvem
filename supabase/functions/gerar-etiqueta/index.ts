// Arquivo: supabase/functions/gerar-etiqueta/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // A mágica do Supabase: Ele nos dá o usuário logado através do token!
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
        throw new Error("Usuário não autenticado.")
    }

    const { envio_id } = await req.json()
    if (!envio_id) {
        throw new Error("O 'envio_id' é obrigatório.")
    }

    // Cria a entrada no log de atividades
    const logEntry = {
      user_id: user.id, // ID do usuário que clicou no botão
      envio_id: envio_id, // ID da venda
      action: 'etiqueta_impressa', // A ação que foi realizada
    }

    // Insere o registro na tabela de logs
    const { error: logError } = await supabaseClient.from('activity_log').insert(logEntry)

    if (logError) {
      throw logError
    }

    // Por enquanto, apenas retornamos uma mensagem de sucesso.
    // No futuro, aqui poderíamos gerar um PDF.
    return new Response(JSON.stringify({ message: 'Ação registrada com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Erro na função gerar-etiqueta:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})