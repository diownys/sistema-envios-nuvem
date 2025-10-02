// supabase/functions/get-janelas-para-romaneio/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function toISOOrNull(v?: string | null) {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// últimos 7 dias em UTC
function defaultRangeUTC() {
  const end = new Date()
  const start = new Date()
  start.setUTCDate(end.getUTCDate() - 7)
  start.setUTCHours(0, 0, 0, 0)
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

    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) {
      try {
        const body = await req.json()
        start_date = toISOOrNull(body?.start_date)
        end_date   = toISOOrNull(body?.end_date)
      } catch {
        // sem corpo JSON válido -> segue para tentar query string
      }
    }

    // Suporte a GET / querystring
    if (!start_date || !end_date) {
      const url = new URL(req.url)
      start_date = toISOOrNull(url.searchParams.get('start_date'))
      end_date   = toISOOrNull(url.searchParams.get('end_date'))
    }

    // Defaults (últimos 7 dias) caso nada tenha vindo
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
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(end_date))) {
        endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
      }
      endExclusive.setUTCHours(0, 0, 0, 0)
      endISO = endExclusive.toISOString()
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabaseAdmin
      .from('envios')
      .select('janela_coleta')
      .eq('status', 'Confirmado')
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .not('janela_coleta', 'is', null)

    if (error) throw error

    const janelasUnicas = [...new Set(data.map((r: any) => r.janela_coleta))].sort()

    return new Response(
      JSON.stringify({ janelas: janelasUnicas, range: { startISO, endISO } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('Erro get-janelas-para-romaneio:', error?.message ?? error)
    return new Response(JSON.stringify({ error: String(error?.message ?? error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
