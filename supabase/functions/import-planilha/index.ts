// Arquivo: supabase/functions/import-planilha/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
    const vendas = await req.json();
    if (!vendas || !Array.isArray(vendas)) {
      throw new Error("Formato de dados inválido. Esperava um array de vendas.");
    }

    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    // Mapeia os dados da planilha para o formato do banco de dados
    const dadosParaInserir = vendas.map(venda => {
        // IMPORTANTE: Ajuste os nomes das chaves aqui para corresponder aos cabeçalhos da sua planilha
        return {
            codigo_venda: venda['Cód. Venda'],
            cliente_nome: venda['Cliente'],
            valor_venda: parseFloat(String(venda['Valor']).replace(',', '.')),
            volumes: parseInt(venda['Volumes'], 10),
            janela_coleta: venda['Janela'],
            ordem_manipulacao: venda['Ordem Manipulacao'],
            // Adiciona os dados automáticos
            user_id: user.id,
            carrier_logo: getLogoUrl(venda['Janela']),
            status: 'Pendente'
        };
    });

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { error } = await supabaseAdmin.from('envios').insert(dadosParaInserir);
    if (error) throw error;

    return new Response(JSON.stringify({ message: `${dadosParaInserir.length} vendas importadas com sucesso!` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    console.error("Erro na função import-planilha:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});