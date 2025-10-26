// Arquivo: supabase/functions/import-planilha/index.ts (VERSÃO CORRIGIDA)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
    const vendas = await req.json();
    if (!vendas || !Array.isArray(vendas)) {
      throw new Error("Formato de dados inválido. Esperava um array de vendas.");
    }
    
    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    // --- MAPEAMENTO CORRIGIDO E ROBUSTO ---
    const dadosParaInserir = vendas.map(venda => {
        const valorLimpo = String(venda['VALOR VENDA'] || '0').replace(/[^0-9,]/g, '').replace(',', '.');
        const valorNumerico = parseFloat(valorLimpo);

        return {
            codigo_venda: venda['CODIGO VENDA'],
            cliente_nome: venda['NOME CLIENTE'],
            ordem_manipulacao: venda['ORDEM MANIPULACAO'],
            valor_venda: isNaN(valorNumerico) ? 0 : valorNumerico,
            endereco: venda['ENDERECO'],
            cidade: venda['CIDADE'],
            uf: venda['UF'],
            janela_coleta: venda['JANELA DE COLETA'],
            requer_refrigeracao: String(venda['REQUER REFRIGERACAO'] || '').toLowerCase() === 'sim',
            local_entrega: venda['LOCAL ENTREGA'],
            forma_farmaceutica: venda['FORMA FARMACEUTICA'],
            numero_nota: venda['NUMERO NOTA'],
            volumes: parseInt(venda['VOLUMES'], 10) || 1,
            
            user_id: user.id,
            carrier_logo: getLogoUrl(venda['JANELA DE COLETA']),
            status: 'Pendente'
        };
    }).filter(v => v.codigo_venda && v.cliente_nome); // Filtra linhas vazias ou inválidas

    if (dadosParaInserir.length === 0) {
        throw new Error("Nenhuma linha válida encontrada na planilha para importar.");
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { error } = await supabaseAdmin.from('envios').insert(dadosParaInserir);
    if (error) {
      console.error("Erro do Supabase ao inserir:", error); // Log detalhado do erro do banco
      throw error;
    }

    return new Response(JSON.stringify({ message: `${dadosParaInserir.length} vendas importadas com sucesso!` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    console.error("Erro detalhado na função import-planilha:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});