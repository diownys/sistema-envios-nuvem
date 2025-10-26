<?php

namespace App\Http\Controllers;

use App\Models\Envio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RelatorioController extends Controller
{
public function index()
{
    // --- FAZEMOS UMA ÚNICA BUSCA NO BANCO ---
    $enviosConcluidos = Envio::where('status', 'Concluído')->get();

    // --- DADOS DOS CARDS ---
    $totalEnviosMes = $enviosConcluidos->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->count();
    $valorTotalMes = $enviosConcluidos->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->sum('valor_venda');

    // --- LÓGICA ATUALIZADA PARA TRANSPORTADORA MAIS USADA ---
    $transportadoraMaisUsadaNome = null;
    if ($enviosConcluidos->isNotEmpty()) {
        // 1. Agrupa os envios pelo nome limpo da transportadora (usando nosso Accessor)
        $contagemPorTransportadora = $enviosConcluidos->groupBy('carrier_name')->map->count();
        // 2. Ordena da maior para a menor e pega o nome da primeira
        $transportadoraMaisUsadaNome = $contagemPorTransportadora->sortDesc()->keys()->first();
    }
    
    // --- DADOS PARA O GRÁFICO DE PIZZA (agora usando a mesma busca) ---
    $valorPorTransportadora = $enviosConcluidos
        ->groupBy('carrier_name')
        ->map(function ($group) {
            return $group->sum('valor_venda');
        });
    
    $labelsGrafico = $valorPorTransportadora->keys();
    $dadosGrafico = $valorPorTransportadora->values();

    // Envia todos os dados calculados para a view
    return view('relatorios.index', [
        'totalEnviosMes' => $totalEnviosMes,
        'valorTotalMes' => $valorTotalMes,
        'transportadoraMaisUsadaNome' => $transportadoraMaisUsadaNome, // Nome da variável mudou
        'labelsGrafico' => $labelsGrafico,
        'dadosGrafico' => $dadosGrafico,
    ]);
}
}