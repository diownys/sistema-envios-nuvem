// Arquivo: supabase/functions/create-envio/index.ts (VERSÃO DE DEBUG)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Funções auxiliares (sem alteração)
const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const getLogoUrl = (janelaColeta: string | null): string | null => {
    if (!janelaColeta) return null;
    const normalized = removeAccents(janelaColeta.toLowerCase());
    if (normalized.includes('agile')) return 'https://i.imgur.com/GR1yJvH.png';
    if (normalized.includes('mota')) return 'https://i.imgur.com/PTFnNod.jpeg';
    if (normalized.includes('moovway')) return 'https://i.imgur.com/SzhYJKo.png';
    if (normalized.includes('expresso sao miguel')) return 'https://i.imgur.com/8C151J6.png';
    if (normalized.includes('braspress')) return 'https://i.imgur.com/xKxvPRy.png';
    if (normalized.includes('ice cargo')) return 'https://i.imgur.com/xkWFlz8.jpeg';
    if (normalized.includes('retirada')) return 'https://i.imgur.com/4GbUFIi.png';
    return null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const envioData = await req.json()
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: `Bearer ${jwt}` } } })
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado.")

    const dadosParaInserir = {
        ...envioData,
        user_id: user.id,
        carrier_logo: getLogoUrl(envioData.janela_coleta)
    };
    
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    const { data, error } = await supabaseAdmin.from('envios').insert(dadosParaInserir).select().single()
    if (error) throw error

    return new Response(JSON.stringify({ envio: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    // LINHA ADICIONADA PARA DEBUG
    console.error('Erro detalhado na função create-envio:', error)

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})