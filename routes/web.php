<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EnvioController;
use App\Http\Controllers\RelatorioController;
use App\Http\Controllers\Api\DashboardController;

// A página inicial agora será o nosso Dashboard com os menus
Route::get('/', [EnvioController::class, 'dashboard'])->name('dashboard');

// A página de importação agora ficará no endereço /importar
Route::get('/importar', [EnvioController::class, 'showImportForm'])->name('import.form');
Route::post('/importar', [EnvioController::class, 'import'])->name('import.process'); // Rota para processar o arquivo
// Rota para mostrar a lista de envios de uma janela específica
Route::get('/janela/{janela}', [EnvioController::class, 'showJanela'])->name('janela.show');
// Rota para processar a confirmação de um envio
Route::post('/envios/{envio}/confirmar', [EnvioController::class, 'confirmar'])->name('envio.confirmar');
// Rota para mostrar a lista de vendas concluídas
Route::get('/concluidos', [EnvioController::class, 'showConcluidos'])->name('envios.concluidos');

// Rota para processar a reversão de um envio
Route::post('/envios/{envio}/reverter', [EnvioController::class, 'reverter'])->name('envio.reverter');
// Rota para mostrar o formulário de filtros do romaneio
Route::get('/romaneio', [EnvioController::class, 'showRomaneioForm'])->name('romaneio.form');

// Rota que recebe os filtros e gera o romaneio para impressão
Route::get('/romaneio/gerar', [EnvioController::class, 'gerarRomaneio'])->name('romaneio.gerar');
// Rota para a página de relatórios
Route::get('/relatorios', [RelatorioController::class, 'index'])->name('relatorios.index');
// --- ROTAS PARA GERENCIAMENTO DE VENDAS (CRUD) ---

// 1. Rota para mostrar o formulário de criação de uma nova venda
Route::get('/envios/criar', [EnvioController::class, 'create'])->name('envio.create');

// 2. Rota para salvar a nova venda criada
Route::post('/envios', [EnvioController::class, 'store'])->name('envio.store');

// 3. Rota para mostrar o formulário de edição de uma venda existente
Route::get('/envios/{envio}/editar', [EnvioController::class, 'edit'])->name('envio.edit');

// 4. Rota para salvar as alterações da venda editada
Route::put('/envios/{envio}', [EnvioController::class, 'update'])->name('envio.update');

// Rota para exibir a etiqueta para impressão
Route::get('/envios/{envio}/etiqueta', [EnvioController::class, 'imprimirEtiqueta'])->name('etiqueta.imprimir');

Route::get('/api/dashboard-stats', [DashboardController::class, 'getStats'])->name('api.stats');

Route::get('/api/ocorrencias', [DashboardController::class, 'getOcorrencias'])->name('api.ocorrencias');