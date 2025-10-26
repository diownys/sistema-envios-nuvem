// Arquivo: supabase/functions/delete-all-envios/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Cria um cliente com o token do usuário para verificar a permissão
    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: `Bearer ${jwt}` } } });

    // 2. Usa a nossa função RPC `is_admin()` para garantir que o usuário é um admin
    const { data: isAdmin, error: rpcError } = await supabaseClient.rpc('is_admin');
    if (rpcError || !isAdmin) {
      throw new Error("Acesso negado: apenas administradores podem executar esta ação.");
    }

    // 3. Se for admin, usa o cliente com "chave mestra" para realizar a exclusão
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. AÇÃO DE EXCLUSÃO: Deleta todos os registros da tabela 'envios'
    // O filtro "neq('id', 0)" é uma segurança para garantir que a tabela inteira seja afetada.
    const { error: deleteError } = await supabaseAdmin
      .from('envios')
      .delete()
      .neq('id', -1); // Condição para deletar todas as linhas

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ message: "Todas as vendas foram excluídas com sucesso." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na função delete-all-envios:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});