<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Importar Envios</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f4f4f9; margin: 0; }
        .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #333; }
        input[type="file"] { border: 1px solid #ddd; padding: 0.5rem; border-radius: 4px; }
        button { background-color: #007bff; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 4px; cursor: pointer; font-size: 1rem; margin-top: 1rem; }
        button:hover { background-color: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Importar Planilha de Envios</h1>
        <form action="{{ route('import.process') }}" method="POST" enctype="multipart/form-data">
            @csrf
            <input type="file" name="planilha" required>
            <br>
            <button type="submit">Enviar Arquivo</button>
        </form>
    </div>
</body>
</html>