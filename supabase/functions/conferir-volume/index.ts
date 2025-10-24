import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Headers de CORS para permitir que seu HTML chame esta função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Permite qualquer origem
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Função principal que roda no Deno
Deno.serve(async (req) => {
  try {
    // 1. Lidar com a requisição "OPTIONS" (preflight) do CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // 2. Validar o método (só aceitamos POST)
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ message: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Ler o body da requisição
    const { qr_code, lote_id } = await req.json()
    if (!qr_code || !lote_id) {
      return new Response(JSON.stringify({ message: 'qr_code e lote_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Inicializar o Supabase (com a Service Key)
    // As variáveis de ambiente são injetadas automaticamente no deploy
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 5. Buscar o volume específico
    const { data: volume, error: selectError } = await supabase
      .from('volumes_conferencia')
      .select('id, status')
      .eq('lote_id', lote_id)
      .eq('qr_code_esperado', qr_code)
      .single()

    // 6. Validações
    if (selectError || !volume) {
      return new Response(JSON.stringify({ message: 'QR Code não encontrado neste lote!' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (volume.status === 'conferido') {
      return new Response(JSON.stringify({ message: 'Caixa já conferida!' }), {
        status: 409, // Conflito
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 7. Atualiza o status (Bip com sucesso!)
    const { error: updateError } = await supabase
      .from('volumes_conferencia')
      .update({
        status: 'conferido',
        conferido_em: new Date().toISOString()
      })
      .eq('id', volume.id)

    if (updateError) {
      // Se der erro no update, joga o erro para o catch
      throw updateError
    }

    // 8. Retorna sucesso
    return new Response(JSON.stringify({ message: 'Volume conferido com sucesso!' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    // 9. Lidar com erros inesperados
    return new Response(JSON.stringify({ message: 'Erro interno no servidor', error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})