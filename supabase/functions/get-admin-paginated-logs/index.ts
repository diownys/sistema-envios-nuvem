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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // VERIFICA SE O USUÁRIO É ADMIN
    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user?.user_metadata?.is_admin !== true) {
      throw new Error("Acesso negado.");
    }

    // Constrói a consulta principal
    let query = supabaseAdmin.from('activity_log').select(`
      created_at,
      action,
      profiles ( email ),
      envios ( cliente_nome, codigo_venda )
    `, { count: 'exact' }); // Pede para contar o total de registros

    // Adiciona o filtro de busca se existir
    if (search_term) {
      query = query.or(`profiles.email.ilike.%${search_term}%,envios.cliente_nome.ilike.%${search_term}%,envios.codigo_venda.ilike.%${search_term}%`);
    }

    // Adiciona a ordenação e paginação
    query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // Formata os dados para ficarem mais fáceis de usar no frontend
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