// Arquivo: supabase/functions/import-excel/index.ts (VERSÃO CORRIGIDA)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { parse as parseCSV } from 'https://deno.land/std@0.224.0/csv/parse.ts'
// XLSX para Deno (funciona em Edge Functions)
import * as XLSX from 'https://esm.sh/xlsx@0.18.5?dts'

// === Funções Auxiliares ===

// ATUALIZADA: Versão mais robusta para remoção de acentos e caracteres de controle
const removeAccents = (str: string) => 
  str ? str.normalize("NFD").replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim() : '';

// ATUALIZADA: (CORREÇÃO DE BUG) Assinatura ajustada para aceitar 'marca', como chamado em mapRow
const getLogoUrl = (janela: string | null, marca: string | null): string | null => {
  // Nota: 'marca' é aceito mas não usado na lógica abaixo,
    // conforme o código original. Adicione lógica para 'marca' aqui se necessário.
    if (!janela) return null;
  const n = removeAccents(janela.toLowerCase());

  if (n.includes('agile')) return 'https://i.imgur.com/GR1yJvH.png';
  if (n.includes('mota')) return 'https://i.imgur.com/PTFnNod.jpeg';
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

// === CORREÇÃO 1: Função de Valor (Decimal) ===
// A função foi ajustada para lidar com valores que já são 'number' (vindos do XLSX)
// e para aplicar a regra BR (',' decimal) somente se a string contiver vírgula.
const toNumberBR = (v: unknown): number => {
    // Se o parser (ex: XLSX) já converteu para número, apenas o usamos.
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : 0
  }

  const s = String(v ?? '').trim()
    if (s === '') return 0;

    // Se a string contém vírgula, assume formato BR (ex: "1.234,56" ou "1234,56")
    if (s.includes(',')) {
      // remove separador de milhar '.' e usa ',' como decimal
      const n = Number(s.replace(/\./g, '').replace(',', '.'))
      return Number.isFinite(n) ? n : 0
    }

    // Se não tem vírgula, assume formato US/Padrão (ex: "1234.56" ou "1234")
    // O código original quebrava aqui ("1234.56" virava 123456)
    const n = Number(s);
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
  codigo_venda:   String(get('Código da Venda', 'codigo_venda')).trim(),
  cliente_nome:   String(get('Cliente', 'cliente_nome')).trim(),
  ordem_manipulacao: String(get('Ordem de manipulação QRCODE', 'ordem_manipulacao')).trim(),
  valor_venda:    toNumberBR(get('Valor da Venda', 'valor_venda')), // USA A FUNÇÃO CORRIGIDA
  endereco:     String(get('endereco')).trim(),
  cidade:      String(get('Cidade')).trim(),
  uf:        String(get('uf')).trim(),
  requer_refrigeracao: toBool(get('Tem produto refrigerado', 'requer_refrigeracao')),
  local_entrega:   String(get('Local de entrega', 'local_entrega')).trim(),
  forma_farmaceutica:String(get('Forma Farmacêutica', 'forma_farmaceutica')).trim(),
  numero_nota:    String(get('numero_nota')).trim(),
  volumes:      toIntDefault(get('Volumes'), 1),
  janela_coleta:   janela,
  
  // --- CORREÇÃO AQUI ---
  // Agora, só usa 'Neuvye' como último recurso se a coluna 'Marca' estiver totalmente vazia
  marca:       marca || 'Neuvye', 
  
  // Lógica automática
  carrier_logo:   getLogoUrl(janela, marca), // CHAMADA CORRIGIDA
  user_id:      userId,
  status:      'Pendente' // O status padrão é Pendente
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

        // === CORREÇÃO 2: Lógica de Status (Pendente/Confirmado) ===
        
        // 1. Pega todos os 'codigo_venda' da planilha
    const codigosVenda = dados.map(d => d.codigo_venda);

        // 2. Busca no DB o status APENAS dos códigos que já existem
    const { data: enviosExistentes, error: fetchError } = await supabaseAdmin
      .from('envios')
      .select('codigo_venda, status')
      .in('codigo_venda', codigosVenda);

    if (fetchError) throw fetchError;

        // 3. Cria um Map para consulta rápida (codigo_venda -> status)
    const statusMap = new Map<string, string>();
    if (enviosExistentes) {
            for (const envio of enviosExistentes) {
          statusMap.set(envio.codigo_venda, envio.status);
        }
        }

        // 4. Filtra os dados a serem importados
        const agora = new Date().toISOString();
    const dadosParaUpsert = dados.filter(d => {
      const statusExistente = statusMap.get(d.codigo_venda);

      // Se não existe (statusExistente é undefined), é novo. Importa.
      if (!statusExistente) {
        return true; 
      }

      // Se existe e é "Confirmado", ignora (NÃO importa).
      if (statusExistente === 'Confirmado') {
        return false; // Ignora
      }

      // Se existe e é "Pendente" (ou outro status), atualiza.
            // Atualiza os timestamps para 'agora' (remarcação)
            (d as any).created_at = agora;
            (d as any).updated_at = agora;
            d.status = 'Pendente'; // Garante o reset do status
      return true;
    });

        // 5. Verifica se sobrou algo para importar após o filtro
        if (dadosParaUpsert.length === 0) {
            return new Response(
          JSON.stringify({ message: `Nenhuma venda nova ou pendente para importar/atualizar. ${dados.length} vendas já 'Confirmadas' foram ignoradas.` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        }

    // === UPSERT em lotes (MODIFICADO) ===
    const chunk = 500;
        let totalImportado = 0;
    for (let i = 0; i < dadosParaUpsert.length; i += chunk) {
      const batch = dadosParaUpsert.slice(i, i + chunk) // Usa o array filtrado
      const { error } = await supabaseAdmin
        .from('envios')
        .upsert(batch, { onConflict: 'codigo_venda' }) // evita “duplicate key”
      if (error) throw error
            totalImportado += batch.length;
    }

    return new Response(
      JSON.stringify({ message: `${totalImportado} vendas importadas/atualizadas com sucesso!` }),
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