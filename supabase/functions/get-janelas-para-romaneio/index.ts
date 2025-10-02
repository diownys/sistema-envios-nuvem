// Arquivo: supabase/functions/get-janelas-para-romaneio/index.ts (VERSÃO FINAL ROBUSTA)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Tenta converter uma string para ISO string, ou retorna null se for inválido ou nulo.
 */
function toISOOrNull(v?: string | null) {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Calcula o range de datas padrão (últimos 7 dias completos, em UTC).
 */
function defaultRangeUTC() {
  const end = new Date()
  const start = new Date()
  
  // Retrocede 7 dias a partir de hoje
  start.setUTCDate(end.getUTCDate() - 7)
  start.setUTCHours(0, 0, 0, 0)
  
  // Define o final como o início do próximo dia (exclusive)
  const endExclusive = new Date(end)
  endExclusive.setUTCHours(0, 0, 0, 0)
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
  
  return { startISO: start.toISOString(), endISO: endExclusive.toISOString() }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let start_date: string | null = null
    let end_date: string | null = null

    // 1. Tenta ler o corpo JSON (usado para POST)
    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) {
      try {
        const body = await req.json()
        start_date = toISOOrNull(body?.start_date)
        end_date   = toISOOrNull(body?.end_date)
      } catch {
        // Se falhar, tenta a query string em seguida
      }
    }

    // 2. Tenta ler a Query String (usado para GET ou falha do JSON)
    if (!start_date || !end_date) {
      const url = new URL(req.url)
      start_date = toISOOrNull(url.searchParams.get('start_date'))
      end_date   = toISOOrNull(url.searchParams.get('end_date'))
    }

    // 3. Define as datas finais (usando defaults se necessário)
    let startISO: string
    let endISO: string
    if (!start_date || !end_date) {
      const d = defaultRangeUTC()
      startISO = d.startISO
      endISO = d.endISO
    } else {
      startISO = new Date(start_date).toISOString()
      
      const endD = new Date(end_date)
      const endExclusive = isNaN(endD.getTime()) ? new Date() : new Date(endD)
      
      // Se a data final foi passada no formato YYYY-MM-DD (apenas data),
      // adiciona +1 dia para cobrir o dia inteiro até a meia-noite.
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(end_date))) {
        endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
      }
      
      endExclusive.setUTCHours(0, 0, 0, 0) // Garante a hora de corte
      endISO = endExclusive.toISOString()
    }
    
    // 4. Inicializa o cliente Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 5. Consulta ao Supabase
    const { data, error } = await supabaseAdmin
      .from('envios')
      .select('janela_coleta')
      .eq('status', 'Confirmado')
      .gte('created_at', startISO)
      .lt('created_at', endISO) // O filtro final é sempre exclusivo (lt)
      .not('janela_coleta', 'is', null)

    if (error) throw error

    // 6. Processa o resultado
    const janelasUnicas = [...new Set(data.map((r: any) => r.janela_coleta))].sort()

    // 7. Retorna a resposta, incluindo o range de datas usado
    return new Response(
      JSON.stringify({ janelas: janelasUnicas, range: { startISO, endISO } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error: any) {
    // Tratamento de erros
    console.error('Erro get-janelas-para-romaneio:', error?.message ?? error)
    return new Response(JSON.stringify({ error: String(error?.message ?? error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})