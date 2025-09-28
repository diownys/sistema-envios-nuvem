import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }

  try {
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.replace('Bearer ', '')
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: `Bearer ${jwt}` } } })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado.")

    const { envio_id, volumes } = await req.json()
    if (!envio_id || !volumes) throw new Error("ID do envio e volumes são obrigatórios.")

    // Atualiza a venda no banco de dados
    const { data, error } = await supabase
      .from('envios')
      .update({ 
        volumes: volumes, 
        status: 'Confirmado' // Muda o status para 'Confirmado'
      })
      .eq('id', envio_id)
      .select()
      .single();

    if (error) throw error;

    // Registra a ação no log de atividades
    await supabase.from('activity_log').insert({ user_id: user.id, envio_id, action: 'envio_confirmado' })

    return new Response(JSON.stringify({ venda: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    console.error('Erro na função confirmar-envio:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})