// Arquivo: supabase/functions/gerar-etiqueta/index.ts (VERSÃO ATUALIZADA)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Função para gerar o HTML da etiqueta
function gerarHtmlEtiqueta(envio: any): string {
  let etiquetasHtml = '';
  // Loop para criar uma etiqueta para cada volume
  for (let i = 1; i <= envio.volumes; i++) {
    etiquetasHtml += `
      <div class="label">
        <div class="header">
          <img src="https://i.imgur.com/9a6FJDJ.jpeg" alt="Logo Neuvye" class="company-logo">
          ${envio.carrier_logo ? `<img src="${envio.carrier_logo}" alt="Logo Transportadora" class="carrier-logo">` : ''}
        </div>
        <div class="block sender">
          <strong>REMETENTE:</strong>
          <p>Atlas S.A</p>
          <p>CNPJ: 06.110.511/0007-38</p>
          <p>R. Agostinho Mocelin, 700 - Ferrari</p>
          <p>Campo Largo - PR, 83606-310</p>
        </div>
        <div class="block recipient">
          <h4>DESTINATÁRIO:</h4>
          <p><strong>${envio.cliente_nome || ''}</strong></p>
          <p>${envio.endereco || ''}</p>
          <p>${envio.cidade || ''}</p>
        </div>
        <div class="block highlight">
          <p class="volume">VOLUME: ${i} de ${envio.volumes}</p>
          <p class="nfe">NFS-e: ${envio.numero_nota || ''}</p>
        </div>
        <div class="block info">
          <p>VENDA: ${envio.codigo_venda || ''}</p>
          <p>JANELA DE COLETA: ${envio.janela_coleta || ''}</p>
        </div>
      </div>
    `;
  }

  // Retorna o HTML completo com estilos
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Etiqueta - Venda ${envio.codigo_venda}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
        body { font-family: 'Roboto', sans-serif; margin: 0; padding: 20px; }
        .label { width: 440px; height: 610px; border: 2px solid #000; background-color: #fff; display: flex; flex-direction: column; margin: 0 auto 20px auto; page-break-after: always; box-sizing: border-box; }
        .label:last-child { page-break-after: avoid; }
        .block { border-bottom: 1px dashed #999; padding: 8px 16px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; }
        .label .block:last-child { border-bottom: none; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .company-logo { max-width: 40mm; max-height: 15mm; object-fit: contain; padding: 8px; }
        .carrier-logo { max-width: 35mm; max-height: 35mm; object-fit: contain; padding: 8px; }
        .sender { margin-bottom: 4px; font-size: 0.95em; border-bottom: none; }
        .sender p { margin: 1px 0; }
        .recipient h4 { margin: 0 0 6px 0; font-size: 1.1em; }
        .recipient p { margin: 2px 0; font-size: 1em; }
        .highlight { padding: 12px; text-align: center; }
        .highlight p { font-weight: 700; margin: 4px 0; }
        .volume { font-size: 2em; }
        .nfe { font-size: 1.8em; }
        .info { font-size: 1.2em; text-align: center; margin-top: auto; }
        .info p { margin: 1px 0; }
        @media print { body { padding: 0; } .label { margin: 0; border: 2px solid #000; } }
      </style>
    </head>
    <body>${etiquetasHtml}</body>
    </html>
  `;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado.")

    const { envio_id } = await req.json()
    if (!envio_id) throw new Error("O 'envio_id' é obrigatório.")
    
    // 1. Registra a ação no log
    await supabaseClient.from('activity_log').insert({ user_id: user.id, envio_id, action: 'etiqueta_impressa' })
    
    // 2. Busca todos os dados do envio para montar a etiqueta
    const { data: envio, error: envioError } = await supabaseClient
      .from('envios')
      .select('*')
      .eq('id', envio_id)
      .single(); // .single() para pegar apenas um resultado

    if (envioError) throw envioError;
    if (!envio) throw new Error("Venda não encontrada.");

    // 3. Gera o HTML da etiqueta
    const htmlCompleto = gerarHtmlEtiqueta(envio);

    // 4. Retorna o HTML como resposta
    return new Response(htmlCompleto, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      status: 200,
    })
  } catch (error) {
    console.error('Erro na função gerar-etiqueta:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})