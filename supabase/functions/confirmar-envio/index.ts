import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

//
// 1. REMOVEMOS A FUNÇÃO ANTIGA 'gerarHtmlEtiqueta' DAQUI.
//    Ela não é mais necessária, pois vamos chamar a 'gerar-etiqueta' principal.
//

// Função Principal Deno.serve (Modificada)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    // 2. AUTENTICAÇÃO (como já estava)
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_ANON_KEY') ?? '', 
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado.")

    // 3. RECEBE DADOS (como já estava)
    const { envio_id, volumes } = await req.json()
    if (!envio_id || !volumes) throw new Error("ID do envio e volumes são obrigatórios.")

    // 4. ATUALIZA A VENDA (como já estava)
    const { error: updateError } = await supabase
      .from('envios')
      .update({ volumes: volumes, status: 'Confirmado' })
      .eq('id', envio_id)
      .select() // Apenas para checar se deu certo
      .single();
    
    if (updateError) {
        console.error('Erro ao atualizar envio:', updateError.message);
        throw new Error(`Falha ao atualizar envio: ${updateError.message}`);
    }

    // 5. REGISTRA O LOG (como já estava)
    await supabase.from('activity_log').insert({ user_id: user.id, envio_id, action: 'envio_confirmado' })

    // 6. [MUDANÇA!] CHAMA A OUTRA FUNÇÃO 'gerar-etiqueta'
    // Em vez de gerar o HTML aqui, nós invocamos a sua função 'gerar-etiqueta'
    // que já tem o layout novo e a busca no PharmUp.
    
    console.log(`Invocando 'gerar-etiqueta' para envio_id: ${envio_id}`);
    
    const { data: htmlEtiqueta, error: invokeError } = await supabase.functions.invoke(
      'gerar-etiqueta', // O nome da função que você quer chamar
      {
        body: { envio_id: envio_id }, // O corpo da requisição que 'gerar-etiqueta' espera
        headers: { 'Authorization': `Bearer ${jwt}` } // Passa a autenticação do usuário
      }
    )
    
    if (invokeError) {
        console.error('Erro ao invocar "gerar-etiqueta":', invokeError.message);
        // Tenta mostrar o erro que veio da outra função
        const errorDetails = await (invokeError.context.data ? invokeError.context.data.text() : invokeError.message);
        throw new Error(`Falha ao chamar a função de etiqueta: ${errorDetails}`);
    }
    
    console.log("HTML da etiqueta recebido com sucesso.");

    // 7. RETORNA O HTML DA ETIQUETA NOVA
    // O 'htmlEtiqueta' agora é o HTML 110x150mm vindo da sua outra função.
    return new Response(htmlEtiqueta, { 
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    })

  } catch (error) {
    // Erro pode ser do update ou da invocação da outra função
    console.error('Erro geral na função confirmar-envio:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})