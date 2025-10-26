// Arquivo: supabase/functions/import-excel/index.ts (VERSÃO FINAL COM MAIS LOGOS)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { parse as parseCSV } from 'https://deno.land/std@0.224.0/csv/parse.ts'
// XLSX para Deno (funciona em Edge Functions)
import * as XLSX from 'https://esm.sh/xlsx@0.18.5?dts'

// === Funções Auxiliares ===

// ATUALIZADA: Versão mais robusta para remoção de acentos e caracteres de controle
const removeAccents = (str: string) => 
    str ? str.normalize("NFD").replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim() : '';

// ATUALIZADA: Adiciona mais transportadoras à regra de seleção de logo
const getLogoUrl = (janela: string | null): string | null => {
    if (!janela) return null;
    const n = removeAccents(janela.toLowerCase());

    if (n.includes('agile')) return 'https://i.imgur.com/GR1yJvH.png';
    if (n.includes('mota'))  return 'https://i.imgur.com/PTFnNod.jpeg';
    if (n.includes('moovway')) return 'https://i.imgur.com/SzhYJKo.png';
    if (n.includes('expresso sao miguel')) return 'https://i.imgur.com/8C151J6.png';
    if (n.includes('braspress')) return 'https://i.imgur.com/xKxvPRy.png';
    if (n.includes('ice cargo')) return 'https://i.imgur.com/xkWFlz8.jpeg';
    if (n.includes('retirada')) return 'https://i.imgur.com/4GbUFIi.png';
    
    return null;
};

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
  const r: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) r[normKey(k)] = v

  // A função 'get' agora também normaliza as chaves que procura
  const get = (...keys: string[]) => {
    for (const k of keys) {
        const normalizedKey = normKey(k);
        if (r[normalizedKey] != null && r[normalizedKey] !== '') return r[normalizedKey];
    }
    return '';
  }

  const janela = String(get('janela_coleta') ?? '');
  const marca = String(get('Marca')).trim(); // Busca pela coluna 'Marca'

  return {
    codigo_venda:      String(get('Código da Venda', 'codigo_venda')).trim(),
    cliente_nome:      String(get('Cliente', 'cliente_nome')).trim(),
    ordem_manipulacao: String(get('Ordem de manipulação QRCODE', 'ordem_manipulacao')).trim(),
    valor_venda:       toNumberBR(get('Valor da Venda', 'valor_venda')),
    endereco:          String(get('endereco')).trim(),
    cidade:            String(get('Cidade')).trim(),
    uf:                String(get('uf')).trim(),
    requer_refrigeracao: toBool(get('Tem produto refrigerado', 'requer_refrigeracao')),
    local_entrega:     String(get('Local de entrega', 'local_entrega')).trim(),
    forma_farmaceutica:String(get('Forma Farmacêutica', 'forma_farmaceutica')).trim(),
    numero_nota:       String(get('numero_nota')).trim(),
    volumes:           toIntDefault(get('Volumes'), 1),
    janela_coleta:     janela,
    
    // --- CORREÇÃO AQUI ---
    // Agora, só usa 'Neuvye' como último recurso se a coluna 'Marca' estiver totalmente vazia
    marca:             marca || 'Neuvye', 
    
    // Lógica automática
    carrier_logo:      getLogoUrl(janela, marca),
    user_id:           userId,
    status:            'Pendente'
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