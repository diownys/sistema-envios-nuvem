<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ isset($envio) ? 'Editar Venda' : 'Adicionar Nova Venda' }}</title>
    <style>
        body { font-family: sans-serif; background-color: #f4f4f9; margin: 0; padding: 2rem; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; }
        .form-group.full-width { grid-column: 1 / -1; }
        label { font-weight: bold; margin-bottom: 0.5rem; }
        input { padding: 0.8rem; border-radius: 5px; border: 1px solid #ccc; font-size: 1rem; }
        .form-actions { margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem; }
        .btn { padding: 0.8rem 1.5rem; text-decoration: none; border-radius: 5px; color: white; border: none; cursor: pointer; font-size: 1rem; }
        .btn-save { background-color: #28a745; }
        .btn-cancel { background-color: #6c757d; }
        .error-list { list-style-type: none; padding: 0; margin: 1rem 0; }
        .error-list li { background-color: #f8d7da; color: #721c24; padding: 0.8rem; border-radius: 5px; margin-bottom: 0.5rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>{{ isset($envio) ? 'Editar Venda #' . $envio->codigo_venda : 'Adicionar Nova Venda' }}</h1>

        @if ($errors->any())
            <ul class="error-list">
                @foreach ($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        @endif

        <form action="{{ isset($envio) ? route('envio.update', $envio) : route('envio.store') }}" method="POST">
            @csrf
            @if (isset($envio))
                @method('PUT')
            @endif

            <div class="form-grid">
                <div class="form-group">
                    <label for="codigo_venda">Código da Venda</label>
                    <input type="text" id="codigo_venda" name="codigo_venda" value="{{ old('codigo_venda', $envio->codigo_venda ?? '') }}" required>
                </div>
                <div class="form-group">
                    <label for="ordem_manipulacao">Ordem de Manipulação (QR Code)</label>
                    <input type="text" id="ordem_manipulacao" name="ordem_manipulacao" value="{{ old('ordem_manipulacao', $envio->ordem_manipulacao ?? '') }}">
                </div>
                <div class="form-group full-width">
                    <label for="cliente_nome">Nome do Cliente</label>
                    <input type="text" id="cliente_nome" name="cliente_nome" value="{{ old('cliente_nome', $envio->cliente_nome ?? '') }}" required>
                </div>
                <div class="form-group">
                    <label for="valor_venda">Valor da Venda (R$)</label>
                    <input type="text" id="valor_venda" name="valor_venda" value="{{ old('valor_venda', $envio->valor_venda ?? '') }}" required>
                </div>
                <div class="form-group">
                    <label for="volumes">Volumes</label>
                    <input type="number" id="volumes" name="volumes" value="{{ old('volumes', $envio->volumes ?? '1') }}" required>
                </div>
                <div class="form-group full-width">
                    <label for="janela_coleta">Janela de Coleta</label>
                    <input type="text" id="janela_coleta" name="janela_coleta" value="{{ old('janela_coleta', $envio->janela_coleta ?? '') }}" required>
                </div>
            </div>

            <div class="form-actions">
                <a href="{{ route('dashboard') }}" class="btn btn-cancel">Cancelar</a>
                <button type="submit" class="btn btn-save">Salvar</button>
            </div>
        </form>
    </div>
</body>
</html>