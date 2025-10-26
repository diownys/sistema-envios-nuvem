<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Importar Envios</title>
    <style>
        body { 
            font-family: sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            background-color: #f4f4f9; 
            margin: 0; 
            position: relative;
        }
        .container { 
            background: white; 
            padding: 2rem 3rem; 
            border-radius: 8px; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
            text-align: center; 
            width: 90%;
            max-width: 500px;
        }
        h1 { 
            color: #333; 
            margin-bottom: 1.5rem;
        }
        input[type="file"] { 
            border: 1px solid #ddd; 
            padding: 0.5rem; 
            border-radius: 4px; 
            width: 100%;
        }
        button { 
            background-color: #007bff; 
            color: white; 
            border: none; 
            padding: 0.8rem 1.5rem; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 1rem; 
            margin-top: 1.5rem; 
            transition: background-color 0.3s;
        }
        button:hover { 
            background-color: #0056b3; 
        }
        .alert-success {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #d4edda;
            color: #155724;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            border: 1px solid #c3e6cb;
            z-index: 1000;
        }
    </style>
</head>
<body>

    {{-- Este é o trecho da mensagem de sucesso, já posicionado --}}
    @if (session('success'))
        <div class="alert-success">
            {{ session('success') }}
        </div>
    @endif

    <div class="container">
        <h1>Importar Planilha de Envios</h1>
        <form action="{{ route('import.process') }}" method="POST" enctype="multipart/form-data">
            
            {{-- Token de segurança do Laravel, essencial para formulários --}}
            @csrf

            <input type="file" name="planilha" required>
            <br>
            <button type="submit">Enviar Arquivo</button>
        </form>
    </div>

</body>
</html>