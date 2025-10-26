<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatórios e Análises</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: sans-serif; background-color: #f4f4f9; margin: 0; padding: 2rem; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        h1 { color: #333; }
        .btn-back { background-color: #6c757d; color: white; padding: 0.6rem 1.2rem; text-decoration: none; border-radius: 5px; }
        .cards-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .card h2 { margin: 0 0 0.5rem 0; font-size: 1rem; color: #666; text-transform: uppercase; }
        .card .value { font-size: 2rem; font-weight: bold; color: #333; }
        
        /* CÓDIGO CORRIGIDO AQUI */
        .chart-container { 
            background: white; 
            padding: 2rem; 
            border-radius: 8px; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
            max-width: 600px;  /* Define uma largura máxima */
            margin: 2rem auto;  /* Centraliza o container do gráfico na página */
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Dashboard de Análise</h1>
            <a href="{{ route('dashboard') }}" class="btn-back">Voltar</a>
        </div>

        <div class="cards-container">
            <div class="card">
                <h2>Total de Envios</h2>
                <p class="value">{{ $totalEnviosMes }}</p>
            </div>
            <div class="card">
                <h2>Valor Total Enviado</h2>
                <p class="value">R$ {{ number_format($valorTotalMes, 2, ',', '.') }}</p>
            </div>
            <div class="card">
                <h2>Transportadora Mais Utilizada</h2>
                <p class="value">{{ $transportadoraMaisUsadaNome ?? 'N/A' }}</p>
            </div>
        </div>

        <div class="chart-container">
            <h2>Valor Total por Transportadora (Concluídos)</h2>
            <canvas id="enviosChart"></canvas>
        </div>
    </div>

    <script>
        const ctx = document.getElementById('enviosChart');

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: @json($labelsGrafico),
                datasets: [{
                    label: 'Valor Total (R$)',
                    data: @json($dadosGrafico),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    hoverOffset: 4
                }]
            }
        });
    </script>
</body>
</html>