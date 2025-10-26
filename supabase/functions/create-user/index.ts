// Arquivo: supabase/functions/create-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Pega o token do usuário que está fazendo a chamada
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    )

    // 2. VERIFICAÇÃO DE ADMIN: Usa nossa função `is_admin`!
    const { data: isAdmin, error: rpcError } = await supabaseClient.rpc('is_admin')
    if (rpcError || !isAdmin) {
      throw new Error('Acesso negado: Apenas administradores podem criar usuários.')
    }

    // 3. Se for admin, continua para criar o novo usuário
    const { email, password, role } = await req.json()
    const isAdminUser = role === 'admin'

    // Usa o cliente de ADMIN para criar o usuário sem e-mail de confirmação
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Cria o usuário como já confirmado
      user_metadata: { is_admin: isAdminUser } // Define a permissão
    })

    if (createError) throw createError

    return new Response(JSON.stringify({ message: `Usuário ${email} criado com sucesso!` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    console.error('Erro na função create-user:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})