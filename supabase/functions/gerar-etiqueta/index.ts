import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
// Importa o Parser de XML
import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

// ==========================================================
// HELPER FUNCTIONS (PharmUp e XML - Sem alteração)
// ==========================================================

const PHARMUP_USER = Deno.env.get('PHARMUP_USER')
const PHARMUP_PASS = Deno.env.get('PHARMUP_PASS')
const API_BASE = "https://pharmup-industria-api.azurewebsites.net"
const API_HEADERS = {
  "Accept": "application/json, */*;q=0.1", "User-Agent": "Neuvye-Automacao-Supabase/1.0",
  "Origin": "https://pharmup-industria.azurewebsites.net", "Referer": "https://pharmup-industria.azurewebsites.net/",
}

async function getPharmUpToken(): Promise<string> {
  if (!PHARMUP_USER || !PHARMUP_PASS) throw new Error("Credenciais PHARMUP_USER ou PHARMUP_PASS não configuradas.");
  const url = `${API_BASE}/Login?login=${PHARMUP_USER}&senha=${PHARMUP_PASS}`
  const res = await fetch(url, { method: 'POST', headers: API_HEADERS })
  if (!res.ok) throw new Error(`Falha no login PharmUp: ${res.statusText}`)
  const data = await res.json();
  if (!data.token) throw new Error("Login PharmUp OK, mas token não recebido.");
  return data.token
}

function getText(doc: Element | null, selector: string): string | null {
  if (!doc) return null;
  return doc.querySelector(selector)?.textContent || null;
}

function parseNFeXML(xmlString: string) {
  const doc = new DOMParser().parseFromString(xmlString, "text/html");
  if (!doc) throw new Error("Falha ao parsear o XML da NFe.");
  const nfe = doc.querySelector("NFe");
  if (!nfe) throw new Error("Nó <NFe> não encontrado no XML.");
  const ide = nfe.querySelector("ide");
  const emit = nfe.querySelector("emit");
  const dest = nfe.querySelector("dest");
  const total = nfe.querySelector("total ICMSTot");
  const chave = nfe.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || null;
  
  return {
    chave: chave, numero: getText(ide, "nNF"), serie: getText(ide, "serie"),
    dhEmi: getText(ide, "dhEmi") || getText(ide, "dEmi"), natOp: getText(ide, "natOp"),
    emitente: {
      CNPJ: getText(emit, "CNPJ"), xNome: getText(emit, "xNome"), IE: getText(emit, "IE"),
      ender: {
        xLgr: getText(emit, "enderEmit xLgr"), nro: getText(emit, "enderEmit nro"),
        xBairro: getText(emit, "enderEmit xBairro"), xMun: getText(emit, "enderEmit xMun"),
        UF: getText(emit, "enderEmit UF"), CEP: getText(emit, "enderEmit CEP"),
      }
    },
    destinatario: {
      CNPJ: getText(dest, "CNPJ") || getText(dest, "CPF"), xNome: getText(dest, "xNome"),
      ender: {
        xLgr: getText(dest, "enderDest xLgr"), nro: getText(dest, "enderDest nro"),
        xBairro: getText(dest, "enderDest xBairro"), xMun: getText(dest, "enderDest xMun"),
        UF: getText(dest, "enderDest UF"), CEP: getText(dest, "enderDest CEP"),
      }
    },
    itens: [], // Não precisamos dos itens na etiqueta, podemos pular
    totais: { vProd: getText(total, "vProd"), vNF: getText(total, "vNF") }
  };
}


// ==========================================================
// FUNÇÃO DE GERAR ETIQUETA (COM LÓGICA "N/D")
// ==========================================================
function gerarHtmlEtiqueta(envio: any, nfeData: any): string {

  // --- LÓGICA DE SELEÇÃO DO LOGO ---
  const logoNeuvye = 'https://i.imgur.com/9a6FJDJ.jpeg';
  const logoDrogaVET = 'https://i.imgur.com/T3qPHRD.png';
  const logoDaEmpresa = (envio.marca && envio.marca.toLowerCase() === 'drogavet') ? logoDrogaVET : logoNeuvye;
  
  let etiquetasHtml = '';
  // [NOVO] Verifica se temos dados reais da NFe
  const temNFe = nfeData.chave !== 'N/D';
  
  // Define os dados do destinatário e remetente
  // Se não tiver NFe, usa os dados do 'envio' do Supabase como fallback.
  const dest = {
    xNome: temNFe ? nfeData.destinatario.xNome : (envio.cliente_nome || 'DESTINATÁRIO N/D'),
    ender: {
      xLgr: temNFe ? nfeData.destinatario.ender.xLgr : (envio.endereco || 'Endereço N/D'),
      nro: temNFe ? nfeData.destinatario.ender.nro : '',
      xBairro: temNFe ? nfeData.destinatario.ender.xBairro : (envio.cidade || 'Cidade N/D'),
      xMun: temNFe ? nfeData.destinatario.ender.xMun : '',
      UF: temNFe ? nfeData.destinatario.ender.UF : '',
      CEP: temNFe ? nfeData.destinatario.ender.CEP : '',
    }
  }
  const emit = {
    xNome: temNFe ? nfeData.emitente.xNome : 'REMETENTE N/D',
    ender: temNFe ? nfeData.emitente.ender : { xLgr: 'Rua N/D', nro: 'N/D', xBairro: 'Bairro N/D', xMun: 'Cidade N/D', UF: 'UF', CEP: '00000-000' }
  }


  for (let i = 1; i <= envio.volumes; i++) {
    etiquetasHtml += `
      <div class="label"> 
        <div class="topo">
          <img src="${logoDaEmpresa}" alt="Marca" class="company-logo">
          <div class="QRcode_venda"><div id="qrcode-venda-${i}"></div></div>
          ${envio.carrier_logo ? `<img src="${envio.carrier_logo}" alt="Transportadora" class="carrier-logo">` : '<div style="width: 130px;"></div>'}
        </div>

        <div class="info">
          <span><strong>Volume:</strong> ${i} de ${envio.volumes}</span> |
          <span><strong>Nota fiscal:</strong> ${nfeData.numero}</span> |
          <span><strong>Venda:</strong> ${envio.codigo_venda}</span>
        </div>

        <div class="codigo">
          ${nfeData.chave}
        </div>

        <div class="QRcode">
          ${temNFe ? 
            `<div id="qrcode-nfe-${i}"></div>` : 
            `<span class="nfe-nao-emitida">NFe Não Emitida</span>`
          }
        </div>

        <div class="secao">
          <div class="titulo">DESTINATÁRIO</div>
          <div class="texto">
            ${dest.xNome}<br>
            ${dest.ender.xLgr || ''}, ${dest.ender.nro || ''}<br>
            ${dest.ender.xBairro || ''}, ${dest.ender.xMun || ''}/${dest.ender.UF || ''} - ${dest.ender.CEP || ''}
          </div>
        </div>

        <div class="secao">
          <div class="titulo">REMETENTE</div>
          <div class="texto">
            ${emit.xNome}<br>
            ${emit.ender.xLgr || ''}, ${emit.ender.nro || ''}<br>
            ${emit.ender.xBairro || ''}<br>
            ${emit.ender.xMun || ''}-${emit.ender.UF || ''} ${emit.ender.CEP || ''}
          </div>
        </div>
        
        <div class="janela">${envio.janela_coleta || 'SEM JANELA'}</div>
      </div>
    `;
  }

  // --- Script para gerar os QR Codes ---
  const scriptGeradorQR = `
    <script>
      const totalVolumes = ${envio.volumes};
      // [NOVO] Passa a chave (ou "N/D") para o script
      const nfeChave = "${nfeData.chave}"; 
      
      for (let i = 1; i <= totalVolumes; i++) {
        
        // Gera QR Code da Venda (Sempre)
        new QRCode(document.getElementById("qrcode-venda-" + i), {
          text: "${envio.codigo_venda}",
          width: 80, height: 80, correctLevel : QRCode.CorrectLevel.L
        });
        
        // [NOVO] Gera QR Code da NFe (SÓ SE a chave não for "N/D")
        if (nfeChave !== "N/D") {
          new QRCode(document.getElementById("qrcode-nfe-" + i), {
            text: nfeChave,
            width: 140, height: 140, correctLevel : QRCode.CorrectLevel.L
          });
        }
      }
    </script>
  `;

  // --- CSS (Inalterado, apenas adicionei .nfe-nao-emitida) ---
  const estilosCSS = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
      body { font-family: 'Roboto', sans-serif; margin: 0; padding: 20px; }
      .label { 
        width: 440px; height: 610px; border: 2px solid #000; background: #fff;
        display: flex; flex-direction: column; margin: 0 auto 20px auto; 
        page-break-after: always; box-sizing: border-box;
        padding: 25px; gap: 10px;
      }
      .label:last-child { page-break-after: avoid; }
      .topo { display: flex; justify-content: space-between; align-items: center; height: 80px; }
      .topo .company-logo { max-width: 150px; max-height: 55px; object-fit: contain; }
      .topo .carrier-logo { max-width: 130px; max-height: 130px; object-fit: contain; }
      .topo .QRcode_venda { width: 80px; height: 80px; }
      .info { font-size: 14px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; text-align: center; }
      .info span { margin-right: 8px; }
      .codigo { text-align: center; font-weight: bold; font-size: 11px; word-break: break-all; }
      .QRcode { text-align: center; margin: 10px 0; height: 140px; } /* Altura fixa */
      /* [NOVO] Estilo para o texto "NFe Não Emitida" */
      .nfe-nao-emitida { 
        font-size: 16px; font-weight: bold; color: #333; 
        border: 2px dashed #999; padding: 40px 10px; 
        display: inline-block; margin-top: 10px;
      }
      #qrcode-nfe-1, #qrcode-nfe-2, #qrcode-nfe-3 { width: 140px; height: 140px; margin: 0 auto; }
      .secao { border-top: 1px solid #000; padding-top: 8px; line-height: 1.4; font-size: 12px; }
      .titulo { background: #000; color: #fff; padding: 2px 6px; font-weight: bold; display: inline-block; margin-bottom: 3px; font-size: 12px; }
      .texto { line-height: 1.4; }
      .janela { text-align: center; font-weight: bold; font-size: 14px; margin-top: auto; }
      @media print { 
        body { padding: 0; } 
        .label { margin: 0; border: 2px solid #000; } 
        * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    </style>
  `;

  // Retorna o HTML completo
  return `
    <!DOCTYPE html><html lang="pt-BR">
    <head>
      <meta charset="UTF-8"><title>Etiqueta - Venda ${envio.codigo_venda}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      ${estilosCSS}
    </head>
    <body>
      ${etiquetasHtml}
      ${scriptGeradorQR}
    </body>
    </html>`;
}

// ==========================================================
// SERVIDOR DENO (COM BLOCO TRY...CATCH INTERNO)
// ==========================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // [NOVO] O catch principal agora só trata erros fatais (ex: Supabase fora)
  try {
    // 1. AUTENTICAÇÃO
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
    
    // 2. LOG E BUSCA NO SUPABASE (Erro aqui é fatal)
    await supabaseClient.from('activity_log').insert({ user_id: user.id, envio_id, action: 'etiqueta_impressa_v4' }) // v4
    
    const { data: envio, error: envioError } = await supabaseClient
      .from('envios')
      .select('*')
      .eq('id', envio_id)
      .single();

    if (envioError) throw envioError;
    if (!envio) throw new Error("Venda não encontrada no Supabase.");

    // 3. [NOVO] TENTATIVA DE BUSCAR DADOS DA NFe (PharmUp)
    
    // Define o placeholder 'N/D'
    let nfeData: any = {
      chave: "N/D",
      numero: "N/D",
      emitente: { xNome: "REMETENTE N/D", ender: { xLgr: "Rua N/D", nro: "N/D", xBairro: "Bairro N/D", xMun: "Cidade N/D", UF: "UF", CEP: "00000-000" } },
      destinatario: { xNome: "DESTINATÁRIO N/D", ender: {} } // O fallback para destinatário está no gerarHtmlEtiqueta
    };

    const codigoVenda = envio.codigo_venda;

    // [NOVO] Bloco try...catch interno SÓ para o PharmUp
    try {
      if (!codigoVenda) {
        throw new Error("Venda do Supabase não possui 'codigo_venda'.");
      }
      
      const hoje = new Date();
      const dataFim = hoje.toISOString().split('T')[0];
      hoje.setDate(hoje.getDate() - 30); // Busca 30 dias
      const dataIni = hoje.toISOString().split('T')[0];
      const token = await getPharmUpToken();
      
      const listUrl = `${API_BASE}/NotaFiscalSaida/List?filterKey=${codigoVenda}&tipoNota=2&emissaoDe=${dataIni}&emissaoAte=${dataFim}&pageSize=5&sortKey=dataEmissao&sortOrder=desc`;
      const listRes = await fetch(listUrl, { headers: { ...API_HEADERS, 'Authorization': `Bearer ${token}` } });
      if (!listRes.ok) throw new Error(`Erro API PharmUp: ${listRes.statusText}`);
      
      const listData = await listRes.json();
      if (!listData.list || listData.list.length === 0) {
        throw new Error(`Nota com codigoVenda '${codigoVenda}' não encontrada no período.`);
      }
      
      const notaEncontrada = listData.list[0];
      const xmlLink = notaEncontrada.xmlLink;
      if (!xmlLink) throw new Error("Nota encontrada, mas sem xmlLink.");

      const xmlRes = await fetch(xmlLink, { headers: { ...API_HEADERS, 'Authorization': `Bearer ${token}` } });
      if (!xmlRes.ok) throw new Error(`Erro ao baixar XML: ${xmlRes.statusText}`);
      
      const xmlString = await xmlRes.text();
      
      // [NOVO] SUCESSO! Sobrescreve o placeholder
      nfeData = parseNFeXML(xmlString); 
      
    } catch (pharmUpError) {
      // [NOVO] FALHA! Nós não paramos. Apenas logamos o aviso.
      console.warn(`Aviso: Falha ao buscar NFe para venda ${codigoVenda}. Gerando etiqueta com "N/D".`);
      console.warn(pharmUpError.message);
      // O 'nfeData' continua sendo o placeholder "N/D"
    }
    // [FIM DA BUSCA NFe]

    // 4. Gera o HTML da etiqueta (SEMPRE RODA)
    // Passa o 'envio' (real) e 'nfeData' (real ou N/D)
    const htmlCompleto = gerarHtmlEtiqueta(envio, nfeData);

    // 5. Retorna o HTML como resposta
    return new Response(htmlCompleto, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      status: 200,
    })

  } catch (fatalError) {
    // Este 'catch' agora só pega erros FATAIS (ex: Supabase fora ou usuário não logado)
    console.error('Erro fatal na função gerar-etiqueta:', fatalError.message)
    return new Response(JSON.stringify({ error: fatalError.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})