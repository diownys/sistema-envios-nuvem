import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// Importa o seu CORS compartilhado
import { corsHeaders } from '../_shared/cors.ts'
// Importa o Parser de XML/HTML
import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

// --- Constantes do PharmUp ---
const PHARMUP_USER = Deno.env.get('PHARMUP_USER')
const PHARMUP_PASS = Deno.env.get('PHARMUP_PASS')
const API_BASE = "https://pharmup-industria-api.azurewebsites.net"
const API_HEADERS = {
  "Accept": "application/json, */*;q=0.1",
  "User-Agent": "Neuvye-Automacao-Supabase/1.0", // Atualizado
  "Origin": "https://pharmup-industria.azurewebsites.net",
  "Referer": "https://pharmup-industria.azurewebsites.net/",
}

// --- Função de Login (do pharmup_client.py) ---
async function getPharmUpToken(): Promise<string> {
  if (!PHARMUP_USER || !PHARMUP_PASS) {
    throw new Error("Credenciais PHARMUP_USER ou PHARMUP_PASS não configuradas.");
  }
  const url = `${API_BASE}/Login?login=${PHARMUP_USER}&senha=${PHARMUP_PASS}`
  const res = await fetch(url, { 
    method: 'POST',
    headers: API_HEADERS
  })

  if (!res.ok) throw new Error(`Falha no login PharmUp: ${res.statusText}`)
  const data = await res.json()
  if (!data.token) throw new Error("Login PharmUp OK, mas token não recebido.");
  return data.token
}

// --- Função de Parse (do pharmup_client.py) ---
// Helper para facilitar a extração de texto do XML
function getText(doc: Element | null, selector: string): string | null {
  if (!doc) return null;
  return doc.querySelector(selector)?.textContent || null;
}

function parseNFeXML(xmlString: string) {
  const doc = new DOMParser().parseFromString(xmlString, "application/xml");
  if (!doc) throw new Error("Falha ao parsear o XML da NFe.");

  const nfe = doc.querySelector("NFe");
  if (!nfe) throw new Error("Nó <NFe> não encontrado no XML.");

  const ide = nfe.querySelector("ide");
  const emit = nfe.querySelector("emit");
  const dest = nfe.querySelector("dest");
  const total = nfe.querySelector("total ICMSTot");

  // Chave (do atributo Id="NFe...")
  const chave = nfe.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || null;

  // Itens (loop)
  const itens: object[] = [];
  nfe.querySelectorAll("det").forEach(det => {
    const prod = det.querySelector("prod");
    if (prod) {
      itens.push({
        cProd: getText(prod, "cProd"),
        xProd: getText(prod, "xProd"),
        NCM: getText(prod, "NCM"),
        CFOP: getText(prod, "CFOP"),
        uCom: getText(prod, "uCom"),
        qCom: getText(prod, "qCom"),
        vUnCom: getText(prod, "vUnCom"),
        vProd: getText(prod, "vProd"),
      });
    }
  });

  // Monta o JSON final
  return {
    chave: chave,
    numero: getText(ide, "nNF"),
    serie: getText(ide, "serie"),
    dhEmi: getText(ide, "dhEmi") || getText(ide, "dEmi"),
    natOp: getText(ide, "natOp"),

    emitente: {
      CNPJ: getText(emit, "CNPJ"),
      xNome: getText(emit, "xNome"),
      IE: getText(emit, "IE"),
      ender: {
        xLgr: getText(emit, "enderEmit xLgr"),
        nro: getText(emit, "enderEmit nro"),
        xBairro: getText(emit, "enderEmit xBairro"),
        xMun: getText(emit, "enderEmit xMun"),
        UF: getText(emit, "enderEmit UF"),
        CEP: getText(emit, "enderEmit CEP"),
      }
    },
    destinatario: {
      CNPJ: getText(dest, "CNPJ") || getText(dest, "CPF"),
      xNome: getText(dest, "xNome"),
      ender: {
        xLgr: getText(dest, "enderDest xLgr"),
        nro: getText(dest, "enderDest nro"),
        xBairro: getText(dest, "enderDest xBairro"),
        xMun: getText(dest, "enderDest xMun"),
        UF: getText(dest, "enderDest UF"),
        CEP: getText(dest, "enderDest CEP"),
      }
    },
    itens: itens,
    totais: {
      vProd: getText(total, "vProd"),
      vFrete: getText(total, "vFrete"),
      vDesc: getText(total, "vDesc"),
      vIPI: getText(total, "vIPI"),
      vNF: getText(total, "vNF"),
    }
  };
}

// --- Handler Principal da Edge Function ---
serve(async (req) => {
  // Trata o OPTIONS (pré-requisição CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { chave, de, ate } = await req.json()
    if (!chave) throw new Error("A 'chave' da NFe é obrigatória.");

    // 1. Autenticar no PharmUp
    const token = await getPharmUpToken()
    const authHeaders = { 
      ...API_HEADERS, 
      'Authorization': `Bearer ${token}` 
    }

    // 2. Achar a nota na listagem (para pegar o xmlLink)
    const tipoNota = 2; // 2 = Transporte (conforme seu app.py)
    const listUrl = `${API_BASE}/NotaFiscalSaida/List?filterKey=${chave}&tipoNota=${tipoNota}&emissaoDe=${de}&emissaoAte=${ate}&pageSize=5`

    const listRes = await fetch(listUrl, { headers: authHeaders })
    if (!listRes.ok) throw new Error(`Erro ao listar notas: ${listRes.statusText}`)

    const listData = await listRes.json()
    if (!listData.list || listData.list.length === 0) {
      throw new Error(`Nota com chave ${chave} não encontrada no período ${de}-${ate}.`);
    }

    const xmlLink = listData.list[0].xmlLink
    if (!xmlLink) throw new Error("Nota encontrada, mas sem xmlLink.");

    // 3. Baixar o XML
    const xmlRes = await fetch(xmlLink, { headers: authHeaders })
    if (!xmlRes.ok) throw new Error(`Erro ao baixar XML: ${xmlRes.statusText}`)
    const xmlString = await xmlRes.text()

    // 4. Parsear o XML
    const nfeData = parseNFeXML(xmlString)

    // 5. Retornar o JSON
    return new Response(
      JSON.stringify(nfeData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})