import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
Deno.serve(async (req) => {
  try {
    const { envio_id } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { data, error } = await supabase.from('envios').update({ status: 'Pendente' }).eq('id', envio_id).select().single();
    if (error) throw error;
    // Log de reversão (opcional)
    return new Response(JSON.stringify({ message: "Venda revertida com sucesso!", venda: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
})