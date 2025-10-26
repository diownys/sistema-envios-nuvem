<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Etiqueta de Transporte - Venda {{ $envio->codigo_venda }}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');

body {
    font-family: 'Roboto', sans-serif;
    background-color: #f0f0f0;
    margin: 0;
    padding: 20px;
}

.label {
    width: 440px;
    height: 610px;
    border: 2px solid #000;
    background-color: #fff;
    display: flex;
    flex-direction: column;
    margin: 0 auto 20px auto;
    page-break-after: always;
    box-sizing: border-box;
}

.label:last-child { page-break-after: avoid; }

.block {
    border-bottom: 1px dashed #999;
    padding: 8px 16px; /* Ajuste aqui para adicionar margem lateral */
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.label .block:last-child { border-bottom: none; }

/* Ajuste dos estilos de logo com base no seu código funcional */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}
.company-logo {
    max-width: 40mm;
    max-height: 15mm;
    object-fit: contain;
    padding: 8px
}
.carrier-logo {
    max-width: 35mm;
    max-height: 35mm;
    object-fit: contain;
    padding: 8px
}

/* Remetente - borda removida */
.sender {
    margin-bottom: 4px;
    font-size: 0.95em;
    border-bottom: none; /* Removendo a borda de baixo */
}
.sender p { margin: 1px 0; }

/* Destinatário */
.recipient h4 { margin: 0 0 6px 0; font-size: 1.1em; }
.recipient p { margin: 2px 0; font-size: 1em; }

/* Bloco de destaque com borda preta */
.highlight {
    background-color: transparent;
    padding: 12px;
    text-align: center;
}
.highlight p {
    color: #000;
    font-weight: 700;
    margin: 4px 0;
}
.volume {
    font-size: 2em;
}
.nfe {
    font-size: 1.8em;
}

/* Número da venda */
.info {
    font-size: 1.2em;
    text-align: center;
    margin-top: auto;
}
.info p { margin: 1px 0; }

/* Ajustes de impressão */
@media print {
    body { background-color: #fff; padding: 0; }
    .label { margin: 0; box-shadow: none; border: 2px solid #000; }
    .no-print { display: none; }
}
</style>
</head>
<body>

<div class="no-print" style="text-align: center; margin-bottom: 20px;">
    <p>Gerando {{ $envio->volumes }} etiqueta(s). Se a impressão não iniciar, clique em "Imprimir".</p>
    <button onclick="window.print()" style="padding: 10px 20px;">Imprimir</button>
    <a href="{{ route('dashboard') }}" style="display: inline-block; margin-left: 10px;">Voltar ao Dashboard</a>
</div>

@for ($i = 1; $i <= $envio->volumes; $i++)
<div class="label">

    <div class="header">
        <img src="https://i.imgur.com/9a6FJDJ.jpeg" alt="Logo Neuvye" class="company-logo">
        @if($envio->carrier_logo)
            <img src="{{ $envio->carrier_logo }}" alt="Logo da Transportadora" class="carrier-logo">
        @endif
    </div>

    <div class="block sender">
        <strong>REMETENTE:</strong>
        <p>Atlas S.A</p>
        <p>CNPJ: 06.110.511/0007-38</p>
        <p>R. Agostinho Mocelin, 700 - Ferrari</p>
        <p>Campo Largo - PR, 83606-310</p>
    </div>

    <div class="block recipient">
        <h4>DESTINATÁRIO:</h4>
        <p><strong>{{ $envio->cliente_nome }}</strong></p>
        <p>{{ $envio->endereco }}</p>
        <p>{{ $envio->cidade }}</p>
    </div>

    <div class="block highlight">
        <p class="volume">VOLUME: {{ $i }} de {{ $envio->volumes }}</p>
        <p class="nfe">NFS-e: {{ $envio->numero_nota }}</p>
    </div>

    <div class="block info">
        <p>VENDA: {{ $envio->codigo_venda }}</p>
        <p>JANELA DE COLETA: {{ $envio->janela_coleta }}</p>
    </div>

</div>
@endfor

<script>
window.onload = function() {
    window.print();
}
</script>
</body>
</html>