// Arquivo: supabase/functions/get-janelas-por-dia/index.ts (VERSÃO FINAL COM RPC)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
    // Lógica para lidar com requisições OPTIONS (CORS)
    if (req.method === 'OPTIONS') { 
        return new Response('ok', { headers: corsHeaders }) 
    }
    
    try {
        // 1. RECEBIMENTO E VALIDAÇÃO DOS PARÂMETROS DE DATA
        const { start_date, end_date } = await req.json();
        if (!start_date || !end_date) {
            throw new Error("Parâmetros de data são obrigatórios.");
        }

        // 2. INICIALIZAÇÃO DO CLIENTE SUPABASE (usando service_role_key para acesso seguro)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '', 
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. EXECUÇÃO DA FUNÇÃO RPC (Substituindo a consulta direta)
        // Isso assume que 'get_janelas_com_stats' é uma função SQL no seu banco
        // que retorna a lista de janelas e suas estatísticas para o período.
        const { data, error } = await supabase.rpc('get_janelas_com_stats', {
            start_date_param: start_date,
            end_date_param: end_date
        });

        if (error) throw error;

        // Os dados (que agora incluem as estatísticas) são retornados diretamente.
        // A chave no JSON de retorno foi mantida como 'janelas',
        // mas agora contém uma lista de objetos em vez de strings simples.
        return new Response(JSON.stringify({ janelas: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 200,
        });

    } catch (error) {
        // Tratamento de Erros
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400,
        });
    }
});