import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts' // Assume que você tem _shared/cors.ts

// Copiamos a sua função de gerar HTML (com uma pequena melhoria no nome da janela)
function gerarHtmlRomaneio(envios: any[], loteNome: string): string {
  // Lógica de seleção do logo (Mantida)
  const logoNeuvye = 'https://i.imgur.com/9a6FJDJ.jpeg';
  const logoDrogaVET = 'https://i.imgur.com/T3qPHRD.png'; // ⚠️ URL CORRETA AQUI!
  const marca = envios.length > 0 && envios[0].marca ? envios[0].marca.toLowerCase() : 'neuvye';
  const logoDaEmpresa = marca === 'drogavet' ? logoDrogaVET : logoNeuvye;
  
  // Cálculos de Resumo (Mantidos)
  const total_vendas = envios.length;
  const total_volumes = envios.reduce((sum, envio) => sum + (envio.volumes || 0), 0);
  const total_valor = envios.reduce((sum, envio) => sum + (envio.valor_venda || 0), 0);
  
  // Tabela de Linhas (Mantida)
  const tableRows = envios.map(envio => `
  <tr>
    <td>${envio.codigo_venda || ''}</td>
    <td>${envio.cliente_nome || ''}</td>
    <td>R$ ${Number(envio.valor_venda || 0).toFixed(2).replace('.', ',')}</td>
    <td>${envio.volumes || 0}</td>
  </tr>
  `).join('');

  // HTML do Romaneio (Mantido, usando loteNome)
  return `
  <!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Romaneio - ${loteNome}</title>
  <style>body{font-family:sans-serif;margin:20px;color:#333}.page-container{max-width:800px;margin:auto}.company-header{display:flex;align-items:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px}.company-header img{width:100px;margin-right:20px}.company-header .info{font-size:.9em}h1{text-align:center}.collection-info{display:flex;justify-content:space-between;align-items:center;background-color:#f2f2f2;padding:15px;border-radius:5px;margin-bottom:20px}.collection-info .carrier-logo img{max-height:40px;max-width:150px}table{width:100%;border-collapse:collapse;font-size:.9em}th,td{padding:8px;text-align:left;border:1px solid #ccc}th{background-color:#f2f2f2}.summary{margin-top:30px;padding-top:15px;border-top:1px solid #ccc}.footer{margin-top:50px}.footer p{margin-top:30px;text-align:center}.footer .signature-line{border-bottom:1px solid #333;width:350px;margin:0 auto}.no-print{margin-top:30px;text-align:center}.print-button{background-color:#28a745;color:#fff;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-size:1rem}@media print{body{padding:0}.no-print{display:none}}</style>
  </head><body><div class="page-container">
  <div class="company-header">
    <img src="${logoDaEmpresa}" alt="Logo da Empresa">
    <div class="info"><strong>Atlas S.A</strong><br>CNPJ: 06.110.511/0007-38<br>R. Agostinho Mocelin, 700 - Ferrari, Campo Largo - PR, 83606-310</div>
  </div>
  <h1>ROMANEIO DE COLETA</h1>
  <div class="collection-info"><div class="carrier-logo">${envios.length > 0 && envios[0].carrier_logo ? `<img src="${envios[0].carrier_logo}" alt="Logo Transportadora">` : ''}</div><div><strong>Lote de Coleta:</strong> ${loteNome}<br><strong>Data de Emissão:</strong> ${new Date().toLocaleString('pt-BR')}</div></div>
  <table><thead><tr><th>Cód. Venda</th><th>Cliente</th><th>Valor da Venda</th><th>Volumes</th></tr></thead><tbody>${tableRows}</tbody></table>
  <div class="summary"><strong>Resumo:</strong><br>- Total de Vendas (Notas): <strong>${total_vendas}</strong><br>- Total de Volumes: <strong>${total_volumes}</strong><br>- Valor Total (R$): <strong>R$ ${total_valor.toFixed(2).replace('.', ',')}</strong></div>
  <div class="footer"><div class="signature-line"></div><p>Nome do Motorista / Assinatura</p><div class="signature-line" style="margin-top:30px"></div><p>CPF / RG</p></div>
  <div class="no-print"><button class="print-button" onclick="window.print()">Imprimir Romaneio</button></div>
  </div></body></html>`;
}

// Função principal da Edge Function
Deno.serve(async (req) => {
  // Lidar com CORS preflight
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }

  try {
    // 1. Pega o lote_id do corpo da requisição
    const { lote_id } = await req.json();
    if (!lote_id) {
      throw new Error("Parâmetro 'lote_id' é obrigatório.");
    }

    // 2. Inicializa o Supabase com a chave de serviço
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 3. Busca o nome do lote
    const { data: loteData, error: loteError } = await supabaseAdmin
      .from('lotes_conferencia')
      .select('nome')
      .eq('id', lote_id)
      .single();
    
    if (loteError) throw new Error(`Erro ao buscar lote: ${loteError.message}`);
    if (!loteData) throw new Error(`Lote com ID ${lote_id} não encontrado.`);
    const loteNome = loteData.nome;

    // 4. Busca TODOS os envio_id únicos DENTRO desse lote_id
    //    (Não importa se o status é pendente ou conferido, pegamos todos do lote)
    const { data: volumesData, error: volumesError } = await supabaseAdmin
      .from('volumes_conferencia')
      .select('envio_id') // Seleciona apenas o ID do envio
      .eq('lote_id', lote_id);

    if (volumesError) throw new Error(`Erro ao buscar volumes do lote: ${volumesError.message}`);
    if (!volumesData || volumesData.length === 0) {
      // Retorna um HTML vazio se o lote não tiver envios
      return new Response(gerarHtmlRomaneio([], loteNome), { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status: 200 });
    }

    // Pega apenas os IDs únicos
    const envioIdsUnicos = [...new Set(volumesData.map(v => v.envio_id))];

    // 5. Busca os dados COMPLETOS dos envios usando os IDs encontrados
    const { data: envios, error: enviosError } = await supabaseAdmin
      .from('envios')
      .select('*') // Pega todas as colunas da tabela envios
      .in('id', envioIdsUnicos); // Filtra pelos IDs que estavam no lote

    if (enviosError) throw new Error(`Erro ao buscar dados dos envios: ${enviosError.message}`);

    // 6. Gera o HTML usando a função que você já tinha
    const htmlCompleto = gerarHtmlRomaneio(envios || [], loteNome);

    // 7. Retorna o HTML
    return new Response(htmlCompleto, { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status: 200 });

  } catch (error) {
    console.error("Erro na função gerar-romaneio-lote:", error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});