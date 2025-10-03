// Arquivo: supabase/functions/update-envio/index.ts (VERSÃO UNIFICADA)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * FUNÇÕES AUXILIARES
 * Implementação da melhoria do Código 2:
 * Agora checa se a string existe e faz .trim(), tornando-a mais robusta.
 */
const removeAccents = (str: string | null): string => {
    // Adiciona a checagem de null/undefined e retorna string vazia se for o caso.
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

/**
 * FUNÇÃO DE LOGO
 * Assinatura do Código 2, que aceita 'marca' como segundo parâmetro.
 * Mantenha o corpo da sua lógica *atualizada* que usa a 'marca' aqui.
 */
const getLogoUrl = (janelaColeta: string | null, marca: string | null): string | null => {
    // Use a lógica do seu Código 2 aqui, que pode usar 'marca'
    // Exemplo (usando a lógica original do Código 1, mas adaptada para a nova função removeAccents):
    if (!janelaColeta && !marca) return null;
    
    // Priorize a marca se ela estiver presente e for mais precisa
    const normalizedJanela = removeAccents(janelaColeta?.toLowerCase() || '');
    const normalizedMarca = removeAccents(marca?.toLowerCase() || '');

    // Lógica Unificada (você pode expandir isso para usar 'marca' de forma mais inteligente)
    if (normalizedMarca.includes('agile') || normalizedJanela.includes('agile')) return 'https://i.imgur.com/GR1yJvH.png';
    if (normalizedMarca.includes('mota') || normalizedJanela.includes('mota')) return 'https://i.imgur.com/PTFnNod.jpeg';
    if (normalizedMarca.includes('moovway') || normalizedJanela.includes('moovway')) return 'https://i.imgur.com/SzhYJKo.png';
    if (normalizedMarca.includes('expresso sao miguel') || normalizedJanela.includes('expresso sao miguel')) return 'https://i.imgur.com/8C151J6.png';
    if (normalizedMarca.includes('braspress') || normalizedJanela.includes('braspress')) return 'https://i.imgur.com/xKxvPRy.png';
    if (normalizedMarca.includes('ice cargo') || normalizedJanela.includes('ice cargo')) return 'https://i.imgur.com/xkWFlz8.jpeg';
    if (normalizedMarca.includes('retirada') || normalizedJanela.includes('retirada')) return 'https://i.imgur.com/4GbUFIi.png';
    return null;
};
// --- FIM DA FUNÇÃO AUXILIAR ---

Deno.serve(async (req) => {
    // Checagem de OPTIONS mantida em ambos
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { id, updates } = await req.json()
        if (!id || !updates) throw new Error("ID e dados para atualização são obrigatórios.")

        /**
         * LÓGICA DE MELHORIA DO CÓDIGO 2 INTEGRADA:
         * O logo é recalculado se qualquer um dos campos (janela ou marca)
         * que influenciam o logo for alterado.
         */
        if (updates.janela_coleta || updates.marca) {
            updates.carrier_logo = getLogoUrl(updates.janela_coleta, updates.marca);
        }

        // Cliente Supabase com Service Role Key mantido em ambos
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

        // Bloco de atualização de dados mantido
        const { data, error } = await supabaseAdmin.from('envios').update(updates).eq('id', id).select().single()
        if (error) throw error

        return new Response(JSON.stringify({ envio: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
    } catch (error) {
        // Bloco de tratamento de erro mantido em ambos
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        })
    }
})