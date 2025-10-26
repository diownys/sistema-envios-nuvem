import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// --- Constantes do PharmUp ---
const PHARMUP_USER = Deno.env.get('PHARMUP_USER')
const PHARMUP_PASS = Deno.env.get('PHARMUP_PASS')
const API_BASE = "https://pharmup-industria-api.azurewebsites.net"
const API_HEADERS = {
  "Accept": "application/json, */*;q=0.1",
  "User-Agent": "Neuvye-Automacao-Supabase/1.0",
  "Origin": "https://pharmup-industria.azurewebsites.net",
  "Referer": "https://pharmup-industria.azurewebsites.net/",
}

// --- Login ---
async function getPharmUpToken(): Promise<string> {
  if (!PHARMUP_USER || !PHARMUP_PASS) {
    throw new Error("Credenciais PHARMUP_USER ou PHARMUP_PASS não configuradas.")
  }
  const loginParams = new URLSearchParams({
    login: PHARMUP_USER,
    senha: PHARMUP_PASS,
  })
  const url = `${API_BASE}/Login?${loginParams.toString()}`
  const res = await fetch(url, { method: 'POST', headers: API_HEADERS })
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch {
    throw new Error(`Falha no login PharmUp: corpo inválido (${text.slice(0, 300)})`)
  }
  if (!res.ok) throw new Error(`Falha no login PharmUp (${res.status}): ${res.statusText} | body: ${text.slice(0, 300)}`)
  if (!data.token) throw new Error("Login PharmUp OK, mas 'token' não recebido.")
  return data.token
}

// --- Parse do JSON de impressão ---
function parsePrintData(printData: any) {
  const resultado: Record<string, any> = {}
  const tempItens: Record<number, Record<string, any>> = {}

  if (!printData || !Array.isArray(printData.sessoes)) {
    throw new Error("Estrutura de dados de impressão inesperada. 'sessoes' não encontradas.")
  }

  for (const sessao of printData.sessoes) {
    if (!Array.isArray(sessao.campos)) continue

    if (sessao.tipo === 2) {
      for (const campo of sessao.campos) {
        const linha = campo.linha
        const key = campo.labelId
        const value = campo.labelValue
        if (linha != null && key) {
          if (!tempItens[linha]) tempItens[linha] = {}
          const simpleKey = String(key).replace(/^Itens\./, '')
          tempItens[linha][simpleKey] = value ?? null
        }
      }
    } else if (sessao.tipo === 1) {
      for (const campo of sessao.campos) {
        if (campo.labelId && resultado[campo.labelId] == null) {
          resultado[campo.labelId] = campo.labelValue ?? null
        }
      }
    }
  }

  resultado.itens = Object.values(tempItens)
  return resultado
}

// --- Helpers ---
async function fetchJson(url: string, headers: Record<string,string>) {
  const res = await fetch(url, { headers })
  const body = await res.text()
  let json: any
  try { json = body ? JSON.parse(body) : null } catch {
    throw new Error(`Erro HTTP ${res.status} em ${url} | body: ${body.slice(0, 500)}`)
  }
  if (!res.ok) {
    throw new Error(`Erro HTTP ${res.status} em ${url}: ${res.statusText} | body: ${body.slice(0, 500)}`)
  }
  return json
}

function extrairListaVendas(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.list)) return payload.list
  if (payload && Array.isArray(payload.items)) return payload.items
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

// --- Handler ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const urlObj = new URL(req.url)
  const debug = urlObj.searchParams.get('debug') === '1'

  try {
    const { codigoVenda } = await req.json()
    if (!codigoVenda) throw new Error("O 'codigoVenda' (filterKey) é obrigatório.")

    const token = await getPharmUpToken()
    const authHeaders = { ...API_HEADERS, Authorization: `Bearer ${token}` }

    // Montar query SEM &amp;
    const listParams = new URLSearchParams({
      filterKey: String(codigoVenda),
      sortKey: 'codigo',
      sortOrder: 'desc',
      pageIndex: '0',
      pageSize: '5',
    })
    const listUrl = `${API_BASE}/Venda/ListVendas?${listParams.toString()}`
    const listData = await fetchJson(listUrl, authHeaders)
    const lista = extrairListaVendas(listData)

    if (debug) {
      console.log('[DEBUG] ListVendas shape keys:', Object.keys(listData || {}))
      if (lista[0]) console.log('[DEBUG] First venda keys:', Object.keys(lista[0]))
      console.log('[DEBUG] Qtde retornada:', lista.length)
    }

    if (!lista.length) {
      throw new Error(`NENHUMA venda encontrada com o código/filterKey '${codigoVenda}'.`)
    }

    // preferir match exato pelo 'codigo'
    const vendaEncontrada =
      lista.find((v: any) => String(v.codigo) === String(codigoVenda)) ?? lista[0]

    const vendaId = vendaEncontrada?.id ?? vendaEncontrada?.vendaId ?? vendaEncontrada?.ID
    if (!vendaId) {
      const keys = vendaEncontrada ? Object.keys(vendaEncontrada) : []
      throw new Error(`Venda encontrada, mas não foi possível extrair 'id'. Keys: [${keys.join(', ')}]`)
    }

    // GetToPrint
    const printParams = new URLSearchParams({
      id: String(vendaId),
      modeloImpressaoId: '1714',
    })
    const printUrl = `${API_BASE}/Venda/GetToPrint?${printParams.toString()}`
    const printData = await fetchJson(printUrl, authHeaders)
    const dadosVendaFormatado = parsePrintData(printData)

    dadosVendaFormatado.idVenda = vendaId
    dadosVendaFormatado.codigoVenda = vendaEncontrada?.codigo ?? String(codigoVenda)

    if (debug) {
      console.log('[DEBUG] Campos topo:', Object.keys(dadosVendaFormatado).slice(0, 20))
      console.log('[DEBUG] Itens (qtde):', Array.isArray(dadosVendaFormatado.itens) ? dadosVendaFormatado.itens.length : 0)
    }

    return new Response(
      JSON.stringify(dadosVendaFormatado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error(error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})