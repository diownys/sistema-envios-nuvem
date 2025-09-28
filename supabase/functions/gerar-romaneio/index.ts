// Arquivo: supabase/functions/gerar-romaneio/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Função que constrói o HTML do romaneio
function gerarHtmlRomaneio(envios: any[], janelaColeta: string): string {
  // Calcula os totais
  const total_vendas = envios.length;
  const total_volumes = envios.reduce((sum, envio) => sum + (envio.volumes || 0), 0);
  const total_valor = envios.reduce((sum, envio) => sum + (envio.valor_venda || 0), 0);

  // Gera as linhas da tabela
  const tableRows = envios.map(envio => `
    <tr>
      <td>${envio.codigo_venda || ''}</td>
      <td>${envio.cliente_nome || ''}</td>
      <td>R$ ${Number(envio.valor_venda || 0).toFixed(2).replace('.', ',')}</td>
      <td>${envio.volumes || 0}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Romaneio - ${janelaColeta}</title>
    <style>body{font-family:sans-serif;margin:20px;color:#333}.page-container{max-width:800px;margin:auto}.company-header{display:flex;align-items:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px}.company-header img{width:100px;margin-right:20px}.company-header .info{font-size:.9em}h1{text-align:center}.collection-info{display:flex;justify-content:space-between;align-items:center;background-color:#f2f2f2;padding:15px;border-radius:5px;margin-bottom:20px}.collection-info .carrier-logo img{max-height:40px;max-width:150px}table{width:100%;border-collapse:collapse;font-size:.9em}th,td{padding:8px;text-align:left;border:1px solid #ccc}th{background-color:#f2f2f2}.summary{margin-top:30px;padding-top:15px;border-top:1px solid #ccc}.footer{margin-top:50px}.footer p{margin-top:30px;text-align:center}.footer .signature-line{border-bottom:1px solid #333;width:350px;margin:0 auto}.no-print{margin-top:30px;text-align:center}.print-button{background-color:#28a745;color:#fff;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-size:1rem}@media print{body{margin:0}.no-print{display:none}}</style>
    </head><body><div class="page-container">
    <div class="company-header"><img src="https://i.imgur.com/9a6FJDJ.jpeg" alt="Logo Atlas S.A"><div class="info"><strong>Atlas S.A</strong><br>CNPJ: 06.110.511/0007-38<br>R. Agostinho Mocelin, 700 - Ferrari, Campo Largo - PR, 83606-310</div></div>
    <h1>ROMANEIO DE COLETA</h1>
    <div class="collection-info"><div class="carrier-logo">${envios.length > 0 && envios[0].carrier_logo ? `<img src="${envios[0].carrier_logo}" alt="Logo Transportadora">` : ''}</div><div><strong>Janela de Coleta:</strong> ${janelaColeta}<br><strong>Data de Emissão:</strong> ${new Date().toLocaleString('pt-BR')}</div></div>
    <table><thead><tr><th>Cód. Venda</th><th>Cliente</th><th>Valor da Venda</th><th>Volumes</th></tr></thead><tbody>${tableRows}</tbody></table>
    <div class="summary"><strong>Resumo:</strong><br>- Total de Vendas (Notas): <strong>${total_vendas}</strong><br>- Total de Volumes: <strong>${total_volumes}</strong><br>- Valor Total (R$): <strong>R$ ${total_valor.toFixed(2).replace('.', ',')}</strong></div>
    <div class="footer"><div class="signature-line"></div><p>Nome do Motorista / Assinatura</p><div class="signature-line" style="margin-top:30px"></div><p>CPF / RG</p></div>
    </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }
  try {
    const { janela_coleta } = await req.json();
    if (!janela_coleta) throw new Error("O parâmetro 'janela_coleta' é obrigatório.");

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: envios, error } = await supabase.from('envios').select('*').eq('janela_coleta', janela_coleta);
    if (error) throw error;

    const htmlCompleto = gerarHtmlRomaneio(envios || [], janela_coleta);

    return new Response(htmlCompleto, { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status: 200 });
  } catch (error) {
    console.error("Erro na função gerar-romaneio:", error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});