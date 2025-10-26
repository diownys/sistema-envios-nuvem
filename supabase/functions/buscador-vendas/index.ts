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
  const url = `${API_BASE}/Login?login=${encodeURIComponent(PHARMUP_USER)}&senha=${encodeURIComponent(PHARMUP_PASS)}`
  const res = await fetch(url, { method: 'POST', headers: API_HEADERS })
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch {
    throw new Error(`Falha no login PharmUp: corpo inválido (${text.slice(0, 400)})`)
  }
  if (!res.ok) throw new Error(`Falha no login PharmUp (${res.status}): ${res.statusText} | body: ${text.slice(0, 400)}`)
  if (!data.token) throw new Error("Login OK, mas 'token' não recebido.")
  return data.token
}

// --- Parse do JSON de impressão ---
function parsePrintData(printData: any) {
  const resultado: Record<string, any> = {}
  const tempItens: Record<number, Record<string, any>> = {}

  if (!printData || !Array.isArray(printData.sessoes)) {
    throw new Error("Estrutura inesperada do GetToPrint: 'sessoes' ausente.")
  }

  for (const sessao of printData.sessoes) {
    if (!Array.isArray(sessao.campos)) continue

    if (sessao.tipo === 2) { // grade (itens)
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
    } else if (sessao.tipo === 1) { // campos simples
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

// --- Helper: fetch JSON com diagnóstico útil ---
async function fetchJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers })
  const raw = await res.text()
  let json: any
  try {
    json = raw ? JSON.parse(raw) : null
  } catch {
    throw new Error(`Erro HTTP ${res.status} em ${url} | body: ${raw.slice(0, 500)}`)
  }
  if (!res.ok) {
    throw new Error(`Erro HTTP ${res.status} em ${url}: ${res.statusText} | body: ${raw.slice(0, 500)}`)
  }
  return json
}

// --- Extrai lista de vendas, independente do "shape" ---
function extrairListaVendas(listData: any): any[] {
  if (Array.isArray(listData)) return listData
  if (listData && Array.isArray(listData.list)) return listData.list
  if (listData && Array.isArray(listData.items)) return listData.items
  if (listData && Array.isArray(listData.data)) return listData.data
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
    const authHeaders = { ...API_HEADERS, 'Authorization': `Bearer ${token}` }

    // Monta URL com URLSearchParams (evita erros sutis de querystring)
    const params = new URLSearchParams({
      filterKey: String(codigoVenda),
      sortKey: 'codigo',
      sortOrder: 'desc',
      pageIndex: '0', // 0 é mais comum como primeira página
      pageSize: '5',
    })
    const listUrl = `${API_BASE}/Venda/ListVendas?${params.toString()}`

    const listData = await fetchJson(listUrl, authHeaders)
    const lista = extrairListaVendas(listData)

    if (debug) {
      console.log('[DEBUG] shape ListVendas keys:', Object.keys(listData || {}))
      if (lista[0]) console.log('[DEBUG] first item keys:', Object.keys(lista[0]))
      console.log('[DEBUG] total itens retornados:', lista.length)
    }

    if (!lista.length) {
      throw new Error(`NENHUMA venda encontrada com o código/filterKey '${codigoVenda}'.`)
    }

    // Tenta encontrar correspondência exata por 'codigo'; senão pega a primeira
    const vendaEncontrada =
      lista.find((v: any) => String(v.codigo) === String(codigoVenda)) ?? lista[0]

    const vendaId =
      vendaEncontrada?.id ??
      vendaEncontrada?.vendaId ??
      vendaEncontrada?.ID

    if (!vendaId) {
      const keys = vendaEncontrada ? Object.keys(vendaEncontrada) : []
      throw new Error(`Venda encontrada, mas não foi possível extrair 'id'. Keys: [${keys.join(', ')}]`)
    }

    const modeloImpressaoId = 1714
    const printParams = new URLSearchParams({
      id: String(vendaId),
      modeloImpressaoId: String(modeloImpressaoId),
    })
    const printUrl = `${API_BASE}/Venda/GetToPrint?${printParams.toString()}`

    const printData = await fetchJson(printUrl, authHeaders)
    const dadosVendaFormatado = parsePrintData(printData)
    dadosVendaFormatado.idVenda = vendaId
    dadosVendaFormatado.codigoVenda = vendaEncontrada?.codigo ?? codigoVenda

    if (debug) {
      console.log('[DEBUG] campos topo:', Object.keys(dadosVendaFormatado).slice(0, 20))
      console.log('[DEBUG] itens (qtde):', Array.isArray(dadosVendaFormatado.itens) ? dadosVendaFormatado.itens.length : 0)
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