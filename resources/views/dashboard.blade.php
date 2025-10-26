<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Envios</title>
    <style>
        body { font-family: sans-serif; background-color: #f4f4f9; margin: 0; padding: 1rem; }
        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 2rem;
            flex-wrap: wrap; /* Permite que os itens quebrem para a próxima linha */
        }
        .header h1 { color: #333; width: 100%; margin-bottom: 1rem; } /* Título ocupa toda a largura */
        .header-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; } /* Agrupa os botões */
        .btn-import { background-color: #28a745; color: white; padding: 0.8rem 1.2rem; text-decoration: none; border-radius: 5px; font-size: 0.9rem; text-align: center; }
        .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
        .menu-card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: center; text-decoration: none; color: #333; font-size: 1.1rem; font-weight: bold; transition: transform 0.2s, box-shadow 0.2s; display: flex; justify-content: center; align-items: center; min-height: 60px; }
        .menu-card:hover { transform: translateY(-5px); box-shadow: 0 8px 16px rgba(0,0,0,0.2); }
        .no-data { background: #fff3cd; color: #856404; padding: 1rem; border-radius: 5px; text-align: center; }
        .menu-card-special { background-color: #ffc107; }

        /* A MÁGICA ACONTECE AQUI: Regras para telas maiores (como a do notebook) */
        @media (min-width: 768px) {
            body { padding: 2rem; }
            .header h1 { width: auto; margin-bottom: 0; }
            .grid-container { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; }
            .menu-card { font-size: 1.2rem; }
            .btn-import { font-size: 1rem; }
        }

    </style>
</head>
<body>
    <div class="header">
        <h1>Menus de Coleta</h1>
        
        <div class="header-buttons">
            <a href="{{ route('envio.create') }}" class="btn-import" style="background-color: #007bff;">Adicionar Venda</a>
            <a href="{{ route('relatorios.index') }}" class="btn-import" style="background-color: #17a2b8;">Relatórios</a>
            <a href="{{ route('romaneio.form') }}" class="btn-import" style="background-color: #007bff;">Gerar Romaneio</a>
            <a href="{{ route('import.form') }}" class="btn-import">Importar Planilha</a>
        </div>
    </div>

    @if($janelas->isEmpty())
        <div class="no-data"><p>Nenhuma janela de coleta encontrada...</p></div>
    @else
        <div class="grid-container">
            @foreach ($janelas as $janela)
                <a href="{{ route('janela.show', ['janela' => $janela->janela_coleta]) }}" class="menu-card"> 
                    {{ $janela->janela_coleta }}
                </a>
            @endforeach

            <a href="{{ route('envios.concluidos') }}" class="menu-card menu-card-special">
                Ver Vendas Concluídas
            </a>
        </div>
    @endif
</body>
</html>
