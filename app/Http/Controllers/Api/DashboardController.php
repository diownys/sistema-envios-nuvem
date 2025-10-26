<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Envio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function getStats()
    {
        // --- Base de dados para as consultas ---
        $enviosPendentes = Envio::where('status', 'Pendente');
        $enviosConcluidosHoje = Envio::where('status', 'Concluído')->whereDate('updated_at', Carbon::today());

        // --- Cálculos ---
        $totalEnviosPendentes = $enviosPendentes->clone()->count();
        $totalEnviosConcluidos = $enviosConcluidosHoje->clone()->count();
        
        $totalRefrigeradosPendentes = $enviosPendentes->clone()->where('requer_refrigeracao', 1)->count();
            
        // --- MUDANÇA PRINCIPAL AQUI ---
        // Agora, contamos os envios PENDENTES por janela de coleta.
        $pendentesPorJanela = $enviosPendentes->clone()
            ->select('janela_coleta', DB::raw('count(*) as total'))
            ->whereNotNull('janela_coleta')
            ->where('janela_coleta', '!=', '') // Ignora janelas vazias
            ->groupBy('janela_coleta')
            ->orderBy('janela_coleta')
            ->get();

        // Dados para o mapa (continua sendo sobre os concluídos do dia)
        $valorTotal = $enviosConcluidosHoje->clone()->sum('valor_venda');
        $enviosPorUF = $enviosConcluidosHoje->clone()
            ->select('uf', DB::raw('count(*) as envios'))
            ->whereNotNull('uf')
            ->groupBy('uf')
            ->get()
            ->pluck('envios', 'uf');

        // --- Resposta JSON final com todos os dados ---
        return response()->json([
            'totalEnvios' => $totalEnviosConcluidos,
            'valorTotal' => (float) $valorTotal,
            'enviosPorUF' => $enviosPorUF,
            'progresso' => [
                'pendentes' => $totalEnviosPendentes,
                'concluidos' => $totalEnviosConcluidos
            ],
            'alertaRefrigerados' => $totalRefrigeradosPendentes,
            'pendentesPorJanela' => $pendentesPorJanela // Nome da chave atualizado para clareza
        ]);
    }

/**
     * Busca os dados de ocorrências de uma API externa, atuando como um proxy.
     */
    public function getOcorrencias()
    {
        $urlExterna = 'https://atlas-sa-ocorrencias.netlify.app/.netlify/functions/get-top-occurrences';

        try {
            // AQUI ESTÁ A CORREÇÃO: Adicionamos o ->withoutVerifying()
            $response = Http::withoutVerifying()->timeout(10)->get($urlExterna);

            if ($response->successful()) {
                return $response->json();
            }
            
            return response()->json(['internas' => [], 'externas' => []], 502);

        } catch (\Exception $e) {
            \Log::error('Falha ao buscar API de ocorrências: ' . $e->getMessage());
            return response()->json(['internas' => [], 'externas' => []], 500);
        }
    }
}