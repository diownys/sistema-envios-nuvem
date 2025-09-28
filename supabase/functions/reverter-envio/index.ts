// Arquivo: supabase/functions/reverter-envio/index.ts (VERSÃO ATUALIZADA)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- NOVA LÓGICA PARA PEGAR O USUÁRIO LOGADO ---
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
        throw new Error("Usuário não autenticado para registrar o log.")
    }
    // --- FIM DA NOVA LÓGICA ---

    const { envio_id } = await req.json();
    if (!envio_id) {
        throw new Error("ID do envio é obrigatório.");
    }
    
    // Usamos o cliente com poderes de admin para fazer o update
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    
    // Reverte o status da venda para 'Pendente'
    const { data, error } = await supabaseAdmin.from('envios').update({ status: 'Pendente' }).eq('id', envio_id).select().single();
    if (error) throw error;
    
    // --- ADICIONANDO O REGISTRO NO LOG ---
    const logEntry = {
      user_id: user.id,
      envio_id: envio_id,
      action: 'venda_revertida' // Ação descritiva
    };
    
    // Usamos o cliente do usuário para inserir o log, respeitando a política RLS
    const { error: logError } = await supabaseClient.from('activity_log').insert(logEntry);
    if (logError) {
      // Se o log falhar, não quebramos a operação principal, mas avisamos no console do servidor
      console.error("Falha ao registrar o log de reversão:", logError);
    }
    // --- FIM DO REGISTRO NO LOG ---
    
    return new Response(JSON.stringify({ message: "Venda revertida com sucesso!", venda: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
})