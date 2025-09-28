<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Envios Pendentes - {{ $janela_nome }}</title>
    
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>

    <style>
        body { font-family: sans-serif; background-color: #f4f4f9; margin: 0; padding: 2rem; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; padding-bottom: 1rem; margin-bottom: 1rem; }
        h1 { color: #333; margin: 0; }
        .btn { padding: 0.6rem 1.2rem; text-decoration: none; border-radius: 5px; color: white; border: none; cursor: pointer; font-size: 1rem; }
        .btn-small { padding: 0.4rem 0.8rem; font-size: 0.9rem; }
        .btn-back { background-color: #6c757d; }
        .btn-confirm { background-color: #007bff; }
        .btn-edit { background-color: #ffc107; color: #212529; }
        .btn-save { background-color: #28a745; }
        .btn-cancel { background-color: #dc3545; }
        .btn-scan { background-color: #17a2b8; }
        .search-container { display: flex; gap: 10px; margin-bottom: 1.5rem; }
        .search-container input { flex-grow: 1; padding: 0.8rem; border-radius: 5px; border: 1px solid #ccc; font-size: 1rem; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 0.8rem; text-align: left; border-bottom: 1px solid #ddd; }
        td.actions { display: flex; gap: 5px; }
        th { background-color: #f8f9fa; }
        .no-data { text-align: center; padding: 2rem; color: #666; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; }
        .modal-header { border-bottom: 1px solid #ddd; padding-bottom: 1rem; margin-bottom: 1rem; }
        .modal-body p { margin-bottom: 0.5rem; }
        .modal-body label { font-weight: bold; display: block; margin-top: 1rem; }
        .modal-body input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; margin-top: 0.5rem; }
        .modal-footer { margin-top: 1.5rem; text-align: right; }
        .modal-footer .btn { margin-left: 0.5rem; }
        #qr-reader { border: 1px solid #ddd; margin-top: 1rem; }
        .alert-success { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: #d4edda; color: #155724; padding: 1rem; border-radius: 5px; z-index: 1001; }
    </style>
</head>
<body>
    @if (session('success'))
        <div class="alert-success">{{ session('success') }}</div>
    @endif

    <div class="container" x-data="{ 
        isOpen: false, 
        selectedEnvio: null,
        searchQuery: '',
        envios: {{ $envios->toJson() }},
        isScannerOpen: false
    }" @qr-scanned.window="searchQuery = $event.detail; isScannerOpen = false; stopScanner();">

        <div class="header">
            <h1>Envios Pendentes: {{ $janela_nome }}</h1>
            <a href="{{ route('dashboard') }}" class="btn btn-back">Voltar ao Dashboard</a>
        </div>

        <div class="search-container">
            <input type="text" placeholder="Busque ou escaneie o QR Code..." x-model.debounce.300ms="searchQuery" autofocus>
            <button class="btn btn-scan" @click="isScannerOpen = !isScannerOpen; if (isScannerOpen) { startScanner() } else { stopScanner() }" x-text="isScannerOpen ? 'Fechar Câmera' : 'Escanear QR'"></button>
        </div>

        <div x-show="isScannerOpen" x-transition>
            <div id="qr-reader" style="width: 100%;"></div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Cód. Venda</th>
                    <th>Cliente</th>
                    <th>Cód. Manipulação</th>
                    <th style="width: 20%;">Ações</th>
                </tr>
            </thead>
            <tbody>
                <template x-for="envio in envios.filter(e => 
                    searchQuery === '' || 
                    e.codigo_venda.toString().includes(searchQuery) || 
                    (e.ordem_manipulacao && e.ordem_manipulacao.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (e.cliente_nome && e.cliente_nome.toLowerCase().includes(searchQuery.toLowerCase()))
                )" :key="envio.id">
                    <tr>
                        <td x-text="envio.codigo_venda"></td>
                        <td x-text="envio.cliente_nome"></td>
                        <td x-text="envio.ordem_manipulacao"></td>
                        <td class="actions">
                            <a :href="`{{ url('/') }}/envios/${envio.id}/editar`" class="btn btn-small btn-edit">Editar</a>
                            
                            <button @click="isOpen = true; selectedEnvio = envio" class="btn btn-small btn-confirm">
                                Confirmar
                            </button>
                        </td>
                    </tr>
                </template>
            </tbody>
        </table>

        <div x-show="isOpen" x-transition class="modal-overlay" @keydown.escape.window="isOpen = false" style="display: none;">
            <div class="modal-content" @click.away="isOpen = false">
                <div class="modal-header">
                    <h2 x-text="'Confirmar Venda #' + selectedEnvio?.codigo_venda"></h2>
                </div>
                
                <form :action="`{{ url('/') }}/envios/${selectedEnvio?.id}/confirmar`" method="POST">
                    @csrf
                    <div class="modal-body">
                        <p><strong>Cliente:</strong> <span x-text="selectedEnvio?.cliente_nome"></span></p>
                        
                        <label for="volumes">Quantidade de Volumes:</label>
                        <input type="number" id="volumes" name="volumes" x-model="selectedEnvio.volumes" min="1">
                    </div>
                    <div class="modal-footer">
                        <button type="button" @click="isOpen = false" class="btn btn-cancel">Cancelar</button>
                        <button type="submit" class="btn btn-save">Salvar Confirmação</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

<script>
    let html5QrCode = null;
    function onScanSuccess(decodedText, decodedResult) {
        console.log(`Código lido com sucesso: ${decodedText}`);
        window.dispatchEvent(new CustomEvent('qr-scanned', { detail: decodedText }));
    }
    function startScanner() {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }
        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 } 
        };
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
            .catch(err => {
                console.error("Não foi possível iniciar o scanner", err);
                alert("Erro ao iniciar a câmera. Verifique se você deu permissão de uso.");
            });
    }
    function stopScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop()
                .then(ignore => {
                    console.log("Scanner parado.");
                }).catch(err => {
                    console.error("Falha ao parar o scanner.", err);
                });
        }
    }
    window.addEventListener('beforeunload', () => {
        stopScanner();
    });
</script>
</body>
</html>