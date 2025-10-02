// supabase/functions/import-excel/index.ts
// Aceita XLSX/CSV/JSON e faz UPSERT em 'envios'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { parse as parseCSV } from 'https://deno.land/std@0.224.0/csv/parse.ts'
// XLSX para Deno (funciona em Edge Functions)
import * as XLSX from 'https://esm.sh/xlsx@0.18.5?dts'

// === utilitários ===
const removeAccents = (s: string) =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()

const getLogoUrl = (janela: string | null): string | null => {
  if (!janela) return null
  const n = removeAccents(janela.toLowerCase())
  if (n.includes('agile')) return 'https://i.imgur.com/GR1yJvH.png'
  if (n.includes('mota'))  return 'https://i.imgur.com/PTFnNod.jpeg'
  // ... adicione outras regras se quiser
  return null
}

const normKey = (s: string) =>
  removeAccents(String(s).toLowerCase()).replace(/\s+/g, '_')

const toBool = (v: unknown) => {
  const s = String(v ?? '').trim().toLowerCase()
  return ['sim', 's', 'true', '1'].includes(s)
}

const toNumberBR = (v: unknown) => {
  const s = String(v ?? '').trim()
  // remove separador de milhar '.' e usa ',' como decimal
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const toIntDefault = (v: unknown, d = 1) => {
  const n = parseInt(String(v ?? '').replace(',', '.'), 10)
  return Number.isFinite(n) ? n : d
}

function mapRow(row: Record<string, unknown>, userId: string) {
  // normaliza chaves
  const r: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) r[normKey(k)] = v

  const get = (...keys: string[]) => {
    for (const k of keys) if (r[k] != null && r[k] !== '') return r[k]
    return ''
  }

  const janela = String(get('janela_coleta') ?? '')
  return {
    codigo_venda:        String(get('codigo_venda')).trim(),
    ordem_manipulacao:   String(get('ordem_manipulacao')).trim(),
    cliente_nome:        String(get('cliente_nome', 'cliente')).trim(),
    endereco:            String(get('endereco')).trim(),
    valor_venda:         toNumberBR(get('valor_venda', 'valor_da_venda')),
    local_entrega:       String(get('local_entrega', 'local_de_entrega')).trim(),
    forma_farmaceutica:  String(get('forma_farmaceutica')).trim(),
    cidade:              String(get('cidade')).trim(),
    uf:                  String(get('uf')).trim(),
    requer_refrigeracao: toBool(get('requer_refrigeracao')),
    janela_coleta:       janela,
    volumes:             toIntDefault(get('volumes'), 1),
    numero_nota:         String(get('numero_nota') || '').trim() || null,
    user_id:             userId,
    carrier_logo:        getLogoUrl(janela),
  }
}

// === handler ===
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders })

  try {
    const contentType = req.headers.get('content-type') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()

    // Client p/ validar usuário
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    )

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado.')

    // Admin client p/ burlar RLS na importação em massa
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // === lê dados de acordo com o Content-Type ===
    let rows: any[] = []

    if (contentType.includes('application/json')) {
      rows = await req.json()
    } else if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file')
      if (!(file instanceof File)) throw new Error('Campo "file" ausente ou inválido.')
      const buf = new Uint8Array(await file.arrayBuffer())
      if (file.name.toLowerCase().endsWith('.csv') || (file.type ?? '').includes('csv')) {
        const text = new TextDecoder('utf-8').decode(buf)
        rows = [...parseCSV(text, { columns: true, trimLeadingSpace: true })]
      } else {
        // XLSX
        const wb = XLSX.read(buf, { type: 'array' })
        const first = wb.SheetNames[0]
        rows = XLSX.utils.sheet_to_json(wb.Sheets[first], { defval: '' })
      }
    } else if (contentType.includes('text/csv')) {
      const text = await req.text()
      rows = [...parseCSV(text, { columns: true, trimLeadingSpace: true })]
    } else {
      throw new Error('Content-Type não suportado. Envie JSON, CSV ou multipart/form-data.')
    }

    if (!Array.isArray(rows) || rows.length === 0)
      throw new Error('Nenhum dado para importar.')

    // === normalização + mapeamento ===
    const dados = rows.map((r) => mapRow(r, user.id)).filter(d => d.codigo_venda)

    if (dados.length === 0) throw new Error('Após normalização, nenhuma linha válida restou (faltando codigo_venda).')

    // === UPSERT em lotes ===
    const chunk = 500
    for (let i = 0; i < dados.length; i += chunk) {
      const batch = dados.slice(i, i + chunk)
      const { error } = await supabaseAdmin
        .from('envios')
        .upsert(batch, { onConflict: 'codigo_venda' }) // evita “duplicate key”
      if (error) throw error
    }

    return new Response(
      JSON.stringify({ message: `${dados.length} vendas importadas/atualizadas com sucesso!` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Erro import-excel:', error)
    return new Response(
      JSON.stringify({ error: String(error?.message ?? error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
