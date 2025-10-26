// Arquivo: supabase/functions/get-admin-paginated-logs/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { page_number, search_term } = await req.json();
    const pageSize = 10;
    const offset = (page_number - 1) * pageSize;

    // Cria um cliente com o token do usuário para verificar a permissão
    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: `Bearer ${jwt}` } } });

    // Usa a função RPC `is_admin()` que já sabemos que funciona
    const { data: isAdmin, error: rpcError } = await supabaseClient.rpc('is_admin');
    if (rpcError || !isAdmin) {
      throw new Error("Acesso negado: apenas administradores podem ver os logs.");
    }

    // Usa o cliente com poderes de admin para buscar os dados
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Constrói a consulta principal
    let query = supabaseAdmin.from('activity_log').select(`
      created_at,
      action,
      profiles ( email ),
      envios ( cliente_nome, codigo_venda )
    `, { count: 'exact' });

    // Adiciona o filtro de busca se existir
    if (search_term) {
      query = query.or(`profiles.email.ilike.%${search_term}%,envios.cliente_nome.ilike.%${search_term}%,envios.codigo_venda.ilike.%${search_term}%`, { foreignTable: 'profiles,envios' });
    }

    // Adiciona a ordenação e paginação
    query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const formattedData = data.map(log => ({
        created_at: log.created_at,
        action: log.action,
        user_email: log.profiles?.email,
        cliente_nome: log.envios?.cliente_nome,
        codigo_venda: log.envios?.codigo_venda
    }));

    return new Response(JSON.stringify({ logs: formattedData, totalCount: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função get-admin-paginated-logs:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});