// Arquivo: supabase/functions/update-envio/index.ts (VERSÃO ATUALIZADA)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// --- NOVA FUNÇÃO AUXILIAR (mesma de antes) ---
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
// --- FIM DA FUNÇÃO AUXILIAR ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }
  try {
    const { id, updates } = await req.json()
    if (!id || !updates) throw new Error("ID e dados para atualização são obrigatórios.")
    
    // --- LÓGICA AUTOMÁTICA DO LOGO ---
    if (updates.janela_coleta) {
        updates.carrier_logo = getLogoUrl(updates.janela_coleta); // Atualiza o logo se a janela for alterada
    }
    
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    
    const { data, error } = await supabase.from('envios').update(updates).eq('id', id).select().single()
    if (error) throw error

    return new Response(JSON.stringify({ envio: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})