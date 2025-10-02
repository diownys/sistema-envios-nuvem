// Arquivo: supabase/functions/get-vendas-por-janela/index.ts (VERSÃO FINAL COM FILTRO DE DATA E JANELA)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
    // Lógica para lidar com requisições OPTIONS (CORS)
    if (req.method === 'OPTIONS') { 
        return new Response('ok', { headers: corsHeaders }) 
    }
    
    try {
        // 1. RECEBIMENTO E VALIDAÇÃO DOS 3 PARÂMETROS
        const { janela, start_date, end_date } = await req.json(); 
        
        if (!janela || !start_date || !end_date) {
            throw new Error("Parâmetros 'janela', 'start_date' e 'end_date' são obrigatórios.");
        }

        // 2. INICIALIZAÇÃO DO CLIENTE SUPABASE
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '', 
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. BUSCA COM OS FILTROS DE JANELA E DATA
        const { data, error } = await supabaseAdmin
            .from('envios')
            .select('*') // Mantido o .select('*') do primeiro código
            .eq('janela_coleta', janela) // Filtro essencial da janela (mantido)
            .gte('created_at', start_date) // Filtro de data de início (novo)
            .lt('created_at', end_date)     // Filtro de data de fim (novo)
            .order('created_at', { ascending: false }); // Ordenação (mantida)

        if (error) {
            throw error
        }

        // 4. RETORNO DA RESPOSTA
        return new Response(JSON.stringify({ vendas: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 200,
        });

    } catch (error) {
        // Tratamento de Erros (mantido do primeiro código)
        console.error('Erro na função get-vendas-por-janela:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400,
        });
    }
});