// Arquivo: supabase/functions/import-excel/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import * as xlsx from 'https://esm.sh/xlsx@0.18.5'

// ... (as funções auxiliares removeAccents e getLogoUrl continuam as mesmas) ...
const removeAccents = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
const getLogoUrl = (janela: string | null): string | null => {
    if (!janela) return null;
    const n = removeAccents(janela.toLowerCase());
    if (n.includes('agile')) return 'https://i.imgur.com/GR1yJvH.png';
    if (n.includes('mota')) return 'https://i.imgur.com/PTFnNod.jpeg';
    // Adicione outras regras de logo aqui...
    return null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }
  try {
    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    // Lê o arquivo Excel (xlsx) enviado
    const buffer = await req.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const vendas = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Pega os cabeçalhos (primeira linha)
    const headers: string[] = vendas.shift() as string[];

    // Mapeia os dados usando os cabeçalhos
    const dadosParaInserir = vendas.map((row: any[]) => {
        const venda: { [key: string]: any } = {};
        headers.forEach((header, index) => {
            venda[header] = row[index];
        });

        const valorLimpo = String(venda['VALOR VENDA'] || '0').replace(/[^0-9,]/g, '').replace(',', '.');
        const valorNumerico = parseFloat(valorLimpo);

        return {
            codigo_venda: venda['CODIGO VENDA'],
            cliente_nome: venda['NOME CLIENTE'],
            // ... (resto do mapeamento que já fizemos) ...
            valor_venda: isNaN(valorNumerico) ? 0 : valorNumerico,
            volumes: parseInt(venda['VOLUMES'], 10) || 1,
            janela_coleta: venda['JANELA DE COLETA'],
            // Dados automáticos
            user_id: user.id,
            carrier_logo: getLogoUrl(venda['JANELA DE COLETA']),
            status: 'Pendente'
        };
    }).filter(v => v.codigo_venda);

    if (dadosParaInserir.length === 0) {
        throw new Error("Nenhuma linha válida encontrada na planilha para importar.");
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { error } = await supabaseAdmin.from('envios').insert(dadosParaInserir);
    if (error) throw error;

    return new Response(JSON.stringify({ message: `${dadosParaInserir.length} vendas importadas com sucesso!` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    console.error("Erro na função import-excel:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});