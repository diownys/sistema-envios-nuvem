// Arquivo: supabase/functions/import-excel/index.ts (VERSÃO FINAL PARA CSV)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { parse } from "https://deno.land/std@0.208.0/csv/mod.ts";

// Funções auxiliares (sem alteração)
const removeAccents = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
const getLogoUrl = (janela: string | null): string | null => {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }
  try {
    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    // Lê o arquivo como texto puro (CSV)
    const csvText = await req.text();

    // Usa a biblioteca Deno para processar o CSV com ponto e vírgula
    const vendas = parse(csvText, {
        separator: ";",
        skipFirstRow: true, // Pula a linha do cabeçalho
        // Mapeia as colunas pela ordem em que aparecem
        columns: [
            'ID PEDIDO', 'NOME CLIENTE', 'CODIGO VENDA', 'ORDEM MANIPULACAO', 'VALOR VENDA',
            'ENDERECO', 'CIDADE', 'UF', 'JANELA DE COLETA', 'REQUER REFRIGERACAO',
            'LOCAL ENTREGA', 'FORMA FARMACEUTICA', 'NUMERO NOTA', 'TRANSPORTADORA',
            'VALOR FRETE', 'CUSTO FRETE', 'TIPO FRETE', 'VOLUMES'
        ]
    });

    if (vendas.length === 0) {
      throw new Error("Nenhuma linha de dados encontrada no arquivo CSV.");
    }
    
    const dadosParaInserir = (vendas as Array<Record<string, string>>).map(venda => {
        const valorOriginal = venda['VALOR VENDA'];
        let valorNumerico = 0;
        if (valorOriginal) {
            if (typeof valorOriginal === 'number') { valorNumerico = valorOriginal; }
            else if (typeof valorOriginal === 'string') {
                const valorLimpo = valorOriginal.replace(/[^0-9,]/g, '').replace(',', '.');
                valorNumerico = parseFloat(valorLimpo);
            }
        }
        
        return {
            codigo_venda: venda['CODIGO VENDA'],
            cliente_nome: venda['NOME CLIENTE'],
            valor_venda: isNaN(valorNumerico) ? 0 : valorNumerico,
            local_entrega: venda['LOCAL ENTREGA'],
            forma_farmaceutica: venda['FORMA FARMACEUTICA'],
            cidade: venda['CIDADE'],
            uf: venda['UF'],
            requer_refrigeracao: String(venda['REQUER REFRIGERACAO'] || '').toLowerCase() === 'sim',
            ordem_manipulacao: venda['ORDEM MANIPULACAO'],
            janela_coleta: venda['JANELA DE COLETA'],
            volumes: parseInt(venda['VOLUMES'], 10) || 1,
            endereco: venda['ENDERECO'],
            numero_nota: venda['NUMERO NOTA'],
            user_id: user.id,
            carrier_logo: getLogoUrl(venda['JANELA DE COLETA']),
            status: 'Pendente'
        };
    }).filter(v => v.codigo_venda);

    if (dadosParaInserir.length === 0) {
      throw new Error("Nenhuma linha válida encontrada. Verifique se a coluna 'CODIGO VENDA' está preenchida.");
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