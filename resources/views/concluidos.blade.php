<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vendas Concluídas</title>
    
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

    <style>
        body { font-family: sans-serif; background-color: #f4f4f9; margin: 0; padding: 2rem; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; padding-bottom: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
        h1 { color: #333; margin: 0; }
        .btn-back { background-color: #6c757d; color: white; padding: 0.6rem 1.2rem; text-decoration: none; border-radius: 5px; }
        .filters { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
        .filters form { flex-grow: 2; }
        .filters input { flex-grow: 3; }
        .filters select, .filters input, .filters button { padding: 0.8rem; border-radius: 5px; border: 1px solid #ccc; font-size: 1rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
        th, td { padding: 0.8rem; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .no-data { text-align: center; padding: 2rem; color: #666; }
        .btn-revert { background-color: #ffc107; color: #212529; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
        .alert-success { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: #d4edda; color: #155724; padding: 1rem; border-radius: 5px; z-index: 1001; }
    </style>
</head>
<body>
    @if (session('success'))
        <div class="alert-success">{{ session('success') }}</div>
    @endif

    <script>
        const enviosData = {!! $envios->toJson() !!};
    </script>

    <div class="container" x-data="{
        searchQuery: '',
        envios: enviosData
    }">
        <div class="header">
            <h1>Vendas Concluídas</h1>
            <a href="{{ route('dashboard') }}" class="btn-back">Voltar ao Dashboard</a>
        </div>

        <div class="filters">
            <form action="{{ route('envios.concluidos') }}" method="GET">
                <select name="janela_coleta" onchange="this.form.submit()">
                    <option value="">Filtrar por Janela de Coleta...</option>
                    @foreach($janelas as $janela)
                        <option value="{{ $janela->janela_coleta }}" {{ request('janela_coleta') == $janela->janela_coleta ? 'selected' : '' }}>
                            {{ $janela->janela_coleta }}
                        </option>
                    @endforeach
                </select>
            </form>
            <input type="text" x-model.debounce.300ms="searchQuery" placeholder="Busque na lista atual por Cód. Venda ou Cliente...">
        </div>

        <table>
            <thead>
                <tr>
                    <th>Cód. Venda</th>
                    <th>Cliente</th>
                    <th>Janela de Coleta</th>
                    <th>Volumes</th>
                    <th>Confirmado em</th>
                    <th>Ação</th>
                </tr>
            </thead>
            <tbody>
                <template x-for="envio in envios.filter(e => 
                    searchQuery === '' || 
                    e.codigo_venda.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (e.cliente_nome && e.cliente_nome.toLowerCase().includes(searchQuery.toLowerCase()))
                )">
                    <tr>
                        <td x-text="envio.codigo_venda"></td>
                        <td x-text="envio.cliente_nome"></td>
                        <td x-text="envio.janela_coleta"></td>
                        <td x-text="envio.volumes"></td>
                        <td>
                            <span x-text="new Date(envio.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })"></span>
                        </td>
                        <td>
                            <form :action="`{{ url('/') }}/envios/${envio.id}/reverter`" method="POST">
                                @csrf
                                <button type="submit" class="btn-revert">Reverter</button>
                            </form>
                        </td>
                    </tr>
                </template>
                
                <template x-if="envios.filter(e => searchQuery === '' || e.codigo_venda.toString().toLowerCase().includes(searchQuery.toLowerCase()) || (e.cliente_nome && e.cliente_nome.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0">
                    <tr>
                        <td colspan="6" class="no-data">Nenhum envio encontrado para os filtros aplicados.</td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>
</body>
</html>