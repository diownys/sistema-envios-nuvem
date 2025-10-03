// Arquivo: supabase/functions/create-envio/index.ts (VERSÃO UNIFICADA)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * FUNÇÕES AUXILIARES
 * Implementação da melhoria do Código 2:
 * Agora checa se a string existe e faz .trim() no final.
 */
const removeAccents = (str: string | null): string => {
    // Adiciona a checagem de null/undefined e retorna string vazia se for o caso.
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

/**
 * FUNÇÃO DE LOGO
 * Mantém a lógica do Código 1, mas com a assinatura do Código 2 
 * (aceitando 'marca' como segundo parâmetro, embora não o use na lógica original).
 * Se a sua getLogoUrl atualizada (do Código 2) usa 'marca', você deve substituir
 * o corpo desta função pela sua lógica atualizada.
 */
const getLogoUrl = (janelaColeta: string | null, marca: string | null): string | null => {
    if (!janelaColeta) return null;
    const normalized = removeAccents(janelaColeta.toLowerCase());
    
    // Se você tiver a lógica atualizada que usa 'marca', insira-a aqui. 
    // Por exemplo, se a 'marca' for mais confiável que 'janelaColeta'
    /*
    const normalizedMarca = removeAccents(marca?.toLowerCase() || '');
    if (normalizedMarca.includes('mota') || normalized.includes('mota')) return 'https://i.imgur.com/PTFnNod.jpeg';
    */

    // Lógica original (do Código 1) usando apenas janelaColeta:
    if (normalized.includes('agile')) return 'https://i.imgur.com/GR1yJvH.png';
    if (normalized.includes('mota')) return 'https://i.imgur.com/PTFnNod.jpeg';
    if (normalized.includes('moovway')) return 'https://i.imgur.com/SzhYJKo.png';
    if (normalized.includes('expresso sao miguel')) return 'https://i.imgur.com/8C151J6.png';
    if (normalized.includes('braspress')) return 'https://i.imgur.com/xKxvPRy.png';
    if (normalized.includes('ice cargo')) return 'https://i.imgur.com/xkWFlz8.jpeg';
    if (normalized.includes('retirada')) return 'https://i.imgur.com/4GbUFIi.png';
    return null;
};

// ---

Deno.serve(async (req) => {
    // Manter a checagem de OPTIONS do Código 1 e 2
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }
    
    try {
        const envioData = await req.json()
        
        /**
         * PARTE CRÍTICA DO CÓDIGO 1 MANTIDA:
         * Autenticação completa via JWT do cabeçalho da requisição.
         * Isso é essencial para saber quem está chamando a função.
         */
        const authHeader = req.headers.get('Authorization')!
        const jwt = authHeader.replace('Bearer ', '')
        
        // Criação do cliente Supabase autenticado
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '', 
            Deno.env.get('SUPABASE_ANON_KEY') ?? '', 
            { global: { headers: { Authorization: `Bearer ${jwt}` } } }
        )
        
        // Checa o usuário
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) throw new Error("Usuário não autenticado.")

        // Prepara os dados
        const dadosParaInserir = {
            ...envioData,
            user_id: user.id,
            /**
             * MELHORIA DO CÓDIGO 2 MANTIDA:
             * Chamada de logo agora usa 'janela_coleta' E 'marca'.
             */
            carrier_logo: getLogoUrl(envioData.janela_coleta, envioData.marca) 
        };
        
        // Inserção com Service Role Key (como em ambos os códigos)
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

        const { data, error } = await supabaseAdmin.from('envios').insert(dadosParaInserir).select().single()
        if (error) throw error

        return new Response(JSON.stringify({ envio: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 200,
        })
    } catch (error) {
        /**
         * LINHA DE DEBUG DO CÓDIGO 1 MANTIDA:
         * Essencial para rastrear erros durante o desenvolvimento ou em produção.
         */
        console.error('Erro detalhado na função create-envio:', error)

        // Resposta de erro
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400,
        })
    }
})