// Arquivo: supabase/functions/get-admin-logs/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // VERIFICA SE O USUÁRIO É ADMIN ANTES DE TUDO
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: `Bearer ${jwt}` } } })
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");
    if (user.user_metadata?.is_admin !== true) {
      throw new Error("Acesso negado.");
    }

    // 1. Busca todos os logs
    const { data: logs, error: logError } = await supabaseAdmin
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false });
    if (logError) throw logError;

    // 2. Busca os perfis e envios necessários de uma só vez para otimizar
    const userIds = [...new Set(logs.map(log => log.user_id))];
    const envioIds = [...new Set(logs.map(log => log.envio_id))];

    const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('id, email').in('id', userIds);
    if (profileError) throw profileError;

    const { data: envios, error: envioError } = await supabaseAdmin.from('envios').select('id, cliente_nome, codigo_venda').in('id', envioIds);
    if (envioError) throw envioError;

    // 3. Junta os dados em JavaScript
    const detailedLogs = logs.map(log => {
      const profile = profiles.find(p => p.id === log.user_id);
      const envio = envios.find(e => e.id === log.envio_id);
      return {
        created_at: log.created_at,
        action: log.action,
        user_email: profile ? profile.email : 'Usuário não encontrado',
        cliente_nome: envio ? envio.cliente_nome : 'Venda não encontrada',
        codigo_venda: envio ? envio.codigo_venda : 'N/A',
      };
    });

    return new Response(JSON.stringify({ logs: detailedLogs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro na função get-admin-logs:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})