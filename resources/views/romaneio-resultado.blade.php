<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Romaneio de Coleta - {{ $janela_coleta }}</title>
    <style>
        body { font-family: sans-serif; margin: 20px; color: #333; }
        .page-container { max-width: 800px; margin: auto; }
        .company-header { display: flex; align-items: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
        .company-header img { width: 100px; height: auto; margin-right: 20px; }
        .company-header .info { font-size: 0.9em; }
        h1 { text-align: center; }
        .collection-info { display: flex; justify-content: space-between; align-items: center; background-color: #f2f2f2; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .collection-info .carrier-logo img { max-height: 40px; max-width: 150px; }
        table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
        th, td { padding: 8px; text-align: left; border: 1px solid #ccc; }
        th { background-color: #f2f2f2; }
        .summary { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; }
        .footer { margin-top: 50px; }
        .footer p { margin-top: 30px; text-align: center; }
        .footer .signature-line { border-bottom: 1px solid #333; width: 350px; margin: 0 auto; }
        .no-print { margin-top: 30px; text-align: center; }
        .print-button { background-color: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="page-container">
        <div class="company-header">
            <img src="https://neuvye.com.br/wp-content/uploads/2025/02/page-miniature.jpg" alt="Logo Atlas S.A">
            <div class="info">
                <strong>Atlas S.A</strong><br>
                CNPJ: 06.110.511/0007-38<br>
                R. Agostinho Mocelin, 700 - Ferrari, Campo Largo - PR, 83606-310
            </div>
        </div>

        <h1>ROMANEIO DE COLETA</h1>

        @if($envios->isNotEmpty())
            <div class="collection-info">
                <div class="carrier-logo">
                    
                    @if($envios->first()->carrier_logo)
                        <img src="{{ $envios->first()->carrier_logo }}" alt="Logo da Transportadora">
                    @endif

                </div>
                <div>
                    <strong>Janela de Coleta:</strong> {{ $janela_coleta }}<br>
                    <strong>Data de Emissão:</strong> {{ now()->format('d/m/Y H:i') }}
                </div>
            </div>
        @endif

        <table>
            <thead>
                <tr>
                    <th>Cód. Venda</th>
                    <th>Cliente</th>
                    <th>Valor da Venda</th>
                    <th>Volumes</th>
                </tr>
            </thead>
            <tbody>
                @forelse($envios as $envio)
                    <tr>
                        <td>{{ $envio->codigo_venda }}</td>
                        <td>{{ $envio->cliente_nome }}</td>
                        <td>R$ {{ number_format($envio->valor_venda, 2, ',', '.') }}</td>
                        <td>{{ $envio->volumes }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" style="text-align:center;">Nenhum envio encontrado para este filtro.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <div class="summary">
            <strong>Resumo:</strong><br>
            - Total de Vendas (Notas): <strong>{{ $total_vendas }}</strong><br>
            - Total de Volumes: <strong>{{ $total_volumes }}</strong><br>
            - Valor Total (R$): <strong>R$ {{ number_format($total_valor, 2, ',', '.') }}</strong>
        </div>

        <div class="footer">
            <div class="signature-line"></div>
            <p>Nome do Motorista / Assinatura</p>

            <div class="signature-line" style="margin-top: 30px;"></div>
            <p>CPF / RG</p>
        </div>

        <div class="no-print">
            <button class="print-button" onclick="window.print()">Imprimir</button>
            <a href="{{ route('romaneio.form') }}" style="display:block; margin-top:10px;">Gerar Novo Romaneio</a>
        </div>
    </div>
</body>
</html>