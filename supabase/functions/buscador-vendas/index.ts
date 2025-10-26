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
  const loginParams = new URLSearchParams({ login: PHARMUP_USER, senha: PHARMUP_PASS })
  const url = `${API_BASE}/Login?${loginParams.toString()}`
  const res = await fetch(url, { method: 'POST', headers: API_HEADERS })
  const raw = await res.text()
  let json: any
  try { json = raw ? JSON.parse(raw) : null } catch {
    throw new Error(`Falha no login PharmUp: corpo inválido (${raw.slice(0, 400)})`)
  }
  if (!res.ok) {
    throw new Error(`Falha no login PharmUp (${res.status}): ${res.statusText} | body: ${raw.slice(0, 400)}`)
  }
  if (!json?.token) throw new Error("Login OK, mas 'token' não recebido.")
  return json.token
}

// --- Parse do JSON de impressão (seu mesmo) ---
function parsePrintData(printData: any) {
  const resultado: Record<string, any> = {}
  const tempItens: Record<number, Record<string, any>> = {}

  if (!printData || !Array.isArray(printData.sessoes)) {
    throw new Error("Estrutura de impressão inesperada: 'sessoes' ausente.")
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

// --- Helpers ---
async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, init)
  const raw = await res.text()
  let json: any
  try { json = raw ? JSON.parse(raw) : null } catch {
    throw new Error(`Erro HTTP ${res.status} ${init.method ?? 'GET'} em ${url} | body: ${raw.slice(0, 500)}`)
  }
  if (!res.ok) {
    throw new Error(`Erro HTTP ${res.status} ${init.method ?? 'GET'} em ${url}: ${res.statusText} | body: ${raw.slice(0, 500)}`)
  }
  return json
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const urlObj = new URL(req.url)
  const debug = urlObj.searchParams.get('debug') === '1'

  try {
    const { codigoVenda } = await req.json()
    if (!codigoVenda) throw new Error("O 'codigoVenda' é obrigatório.")

    // 1) Autentica
    const token = await getPharmUpToken()
    const authHeaders = { ...API_HEADERS, Authorization: `Bearer ${token}` }

    // 2) Chama ListVendas exatamente como a UI faz (GET + mesmos params)
    const listParams = new URLSearchParams({
      filterKey: String(codigoVenda),
      sortKey: 'codigo',
      sortOrder: 'desc',
      pageIndex: '1',      // conforme Network da tela
      pageSize: '20',      // conforme Network da tela
      dataInicial: '',     // conforme Network da tela
      dataFinal: '',       // conforme Network da tela
      radio: '',           // conforme Network da tela
      tipoBuscaVenda: '0', // conforme Network da tela
    })
    const listUrl = `${API_BASE}/Venda/ListVendas?${listParams.toString()}`

    const listData = await fetchJson(listUrl, { method: 'GET', headers: authHeaders })

    // O shape retornado é { list, total, pageIndex, pageSize }
    const lista = Array.isArray(listData?.list) ? listData.list : []

    if (debug) {
      console.log('[DEBUG] ListVendas keys:', Object.keys(listData || {}))
      console.log('[DEBUG] list length:', lista.length)
      if (lista[0]) console.log('[DEBUG] first item keys:', Object.keys(lista[0]))
    }

    if (!lista.length) {
      throw new Error(`NENHUMA venda encontrada com o código '${codigoVenda}'.`)
    }

    // Preferir o match exato do 'codigo'
    const vendaEncontrada =
      lista.find((v: any) => String(v.codigo) === String(codigoVenda)) ?? lista[0]

    const vendaId = vendaEncontrada?.id
    if (!vendaId) {
      throw new Error(`Venda encontrada, mas não foi possível extrair 'id'. Keys: ${Object.keys(vendaEncontrada || {}).join(', ')}`)
    }

    // 3) (PRÓXIMO PASSO) Buscar GetToPrint — precisamos confirmar os params exatos
    // Por ora, deixo montado com o que usávamos:
    const modeloImpressaoId = 1714
    const printParams = new URLSearchParams({
      id: String(vendaId),
      modeloImpressaoId: String(modeloImpressaoId),
    })
    const printUrl = `${API_BASE}/Venda/GetToPrint?${printParams.toString()}`
    const printData = await fetchJson(printUrl, { method: 'GET', headers: authHeaders })

    const dadosVenda = parsePrintData(printData)
    dadosVenda.idVenda = vendaId
    dadosVenda.codigoVenda = vendaEncontrada?.codigo

    // Opcional: também devolver alguns campos “rápidos” que já vieram do ListVendas
    dadosVenda.meta = {
      situacao: vendaEncontrada?.situacaoDescricao,
      clienteNome: vendaEncontrada?.clienteNome,
      valorFinal: vendaEncontrada?.valorFinal,
      itensResumo: vendaEncontrada?.itens?.map((it: any) => ({
        id: it.id,
        codigo: it.codigo,
        produtoDescricao: it.produtoDescricao,
        quantidade: it.quantidade,
        valorUnitario: it.valorUnitario,
        valorTotal: it.valorTotal,
      })) ?? [],
    }

    if (debug) {
      console.log('[DEBUG] GetToPrint parsed keys:', Object.keys(dadosVenda))
      console.log('[DEBUG] itens (qtde):', Array.isArray(dadosVenda.itens) ? dadosVenda.itens.length : 0)
    }

    return new Response(JSON.stringify(dadosVenda), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error(error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})