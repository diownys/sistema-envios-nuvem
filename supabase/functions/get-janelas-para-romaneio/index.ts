// Arquivo: supabase/functions/get-janelas-para-romaneio/index.ts (VERSÃO FINAL COM FILTRO DE DATA)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
    // Lógica para lidar com requisições OPTIONS (CORS)
    if (req.method === 'OPTIONS') { 
        return new Response('ok', { headers: corsHeaders }) 
    }
    
    try {
        // 1. RECEBIMENTO E VALIDAÇÃO DOS PARÂMETROS DE DATA (Novo do segundo código)
        const { start_date, end_date } = await req.json();
        if (!start_date || !end_date) {
            throw new Error("Parâmetros de data são obrigatórios.");
        }

        // 2. INICIALIZAÇÃO DO CLIENTE SUPABASE
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '', 
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. EXECUÇÃO DA FUNÇÃO RPC COM PARÂMETROS DE DATA (Atualização central)
        // Isso permite que a função SQL filtre as janelas com base no período fornecido.
        const { data, error } = await supabaseAdmin.rpc('get_janelas_confirmadas', {
            start_date_param: start_date, // Novo
            end_date_param: end_date       // Novo
        });
        
        if (error) throw error;

        // 4. MAPEAMENTO E RETORNO DAS JANELAS (Lógica mantida do primeiro código)
        const janelas = data.map((item: any) => item.janela_coleta);

        return new Response(JSON.stringify({ janelas: janelas }), {
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