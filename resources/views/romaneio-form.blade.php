<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerar Romaneio de Coleta</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f4f4f9; margin: 0; }
        .container { background: white; padding: 2rem 3rem; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #333; }
        select, button { width: 100%; padding: 0.8rem; margin-top: 1rem; border-radius: 5px; border: 1px solid #ccc; font-size: 1rem; }
        button { background-color: #007bff; color: white; border: none; cursor: pointer; }
        a { display: block; margin-top: 1rem; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Gerar Romaneio de Coleta</h1>
        <form action="{{ route('romaneio.gerar') }}" method="GET">
            <select name="janela_coleta" required>
                <option value="">Selecione a Janela de Coleta</option>
                @foreach($janelas as $janela)
                    <option value="{{ $janela->janela_coleta }}">{{ $janela->janela_coleta }}</option>
                @endforeach
            </select>
            <button type="submit">Gerar Documento</button>
        </form>
        <a href="{{ route('dashboard') }}">Voltar ao Dashboard</a>
    </div>
</body>
</html>