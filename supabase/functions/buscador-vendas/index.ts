import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
// NÃO PRECISAMOS MAIS DO DOMParser! Removido.

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

// --- Função de Login (Sem alterações) ---
async function getPharmUpToken(): Promise<string> {
  if (!PHARMUP_USER || !PHARMUP_PASS) {
    throw new Error("Credenciais PHARMUP_USER ou PHARMUP_PASS não configuradas.");
  }
  const url = `${API_BASE}/Login?login=${PHARMUP_USER}&senha=${PHARMUP_PASS}`
  const res = await fetch(url, { method: 'POST', headers: API_HEADERS })
  if (!res.ok) throw new Error(`Falha no login PharmUp: ${res.statusText}`)
  const data = await res.json()
  if (!data.token) throw new Error("Login PharmUp OK, mas token não recebido.");
  return data.token
}

// --- NOVA FUNÇÃO: Parse do JSON de Impressão ---
/**
 * Transforma o JSON complexo do "GetToPrint" em um objeto simples e útil.
 * Sabe lidar com campos normais (tipo 1) e grades de itens (tipo 2).
 */
function parsePrintData(printData: any) {
  const resultado: Record<string, any> = {};
  
  // Objeto temporário para agrupar itens pela 'linha' antes de virar array
  const tempItens: Record<number, Record<string, any>> = {};

  if (!printData.sessoes || !Array.isArray(printData.sessoes)) {
    throw new Error("Estrutura de dados de impressão inesperada. 'sessoes' não encontradas.");
  }

  for (const sessao of printData.sessoes) {
    if (!sessao.campos || !Array.isArray(sessao.campos)) continue;

    // Tipo 2 = É uma grade (ex: a sessão "Itens")
    if (sessao.tipo === 2) {
      for (const campo of sessao.campos) {
        const linha = campo.linha;
        const key = campo.labelId; // ex: "Itens.ValorTotal"
        const value = campo.labelValue;

        if (linha && key) {
          // Se é a primeira vez que vemos essa linha, cria um objeto para ela
          if (!tempItens[linha]) {
            tempItens[linha] = {};
          }
          // Limpa a chave (ex: "Itens.ValorTotal" vira "ValorTotal")
          const simpleKey = key.replace(/^Itens\./, '');
          tempItens[linha][simpleKey] = value || null;
        }
      }
    }
    // Tipo 1 = Campos normais (ex: "Dados do cliente")
    else if (sessao.tipo === 1) {
      for (const campo of sessao.campos) {
        if (campo.labelId) {
          // Só adiciona se a chave ainda não existir (evita sobrescritas)
          if (!resultado[campo.labelId]) {
            resultado[campo.labelId] = campo.labelValue || null;
          }
        }
      }
    }
  }

  // Converte o objeto de itens (agrupado por linha) em um array final
  resultado.itens = Object.values(tempItens);
  
  return resultado;
}


// --- Handler Principal (TOTALMENTE MODIFICADO) ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. MUDANÇA: Recebemos 'codigoVenda' (que é o filterKey, ex: "101152")
    const { codigoVenda } = await req.json()
    if (!codigoVenda) throw new Error("O 'codigoVenda' (filterKey) é obrigatório.");

    // 2. Autenticar no PharmUp (Igual)
    const token = await getPharmUpToken()
    const authHeaders = { ...API_HEADERS, 'Authorization': `Bearer ${token}` }

    // 3. MUDANÇA: Passo 1 - Buscar na API /Venda/ListVendas
    const listUrl = `${API_BASE}/Venda/ListVendas?filterKey=${codigoVenda}&sortKey=codigo&sortOrder=desc&pageIndex=1&pageSize=1`

    const listRes = await fetch(listUrl, { headers: authHeaders })
    if (!listRes.ok) throw new Error(`Erro ao listar vendas (${listRes.status}): ${listRes.statusText}`)

    const listData = await listRes.json()

    // 4. MUDANÇA: Checar se o array de resultado veio vazio
    if (!Array.isArray(listData) || listData.length === 0) {
      throw new Error(`NENHUMA venda encontrada com o código/filterKey '${codigoVenda}'.`);
    }

    // 5. MUDANÇA: Pegar o 'id' da venda encontrada (ex: 1061849)
    const vendaEncontrada = listData[0];
    const vendaId = vendaEncontrada.id;
    if (!vendaId) throw new Error("Venda encontrada, mas não foi possível extrair o 'id' dela.");

    // 6. MUDANÇA: Passo 2 - Buscar os dados de impressão (GetToPrint)
    const modeloImpressaoId = 1714; // Fixo, como você pediu
    const printUrl = `${API_BASE}/Venda/GetToPrint?id=${vendaId}&modeloImpressaoId=${modeloImpressaoId}`

    const printRes = await fetch(printUrl, { headers: authHeaders })
    if (!printRes.ok) throw new Error(`Erro ao buscar dados de impressão (${printRes.status}): ${printRes.statusText}`)
    
    const printData = await printRes.json()

    // 7. MUDANÇA: Parsear o JSON de impressão para um formato limpo
    const dadosVendaFormatado = parsePrintData(printData)
    
    // Adiciona o ID e Codigo da Venda principal para referência
    dadosVendaFormatado.idVenda = vendaId;
    dadosVendaFormatado.codigoVenda = vendaEncontrada.codigo;

    // 8. MUDANÇA: Retornar o JSON formatado
    return new Response(
      JSON.stringify(dadosVendaFormatado),
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