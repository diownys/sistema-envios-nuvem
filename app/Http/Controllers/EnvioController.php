<?php

namespace App\Http\Controllers;

use App\Models\Envio;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\EnviosImport;

class EnvioController extends Controller
{
    public function dashboard()
    {
        $janelas = Envio::select('janela_coleta')
            ->whereNotNull('janela_coleta')
            ->where('status', 'Pendente')
            ->distinct()
            ->orderBy('janela_coleta', 'asc')
            ->get();

        return view('dashboard', ['janelas' => $janelas]);
    }

    public function showJanela(string $janela)
    {
        $envios = Envio::where('janela_coleta', $janela)
            ->where('status', 'Pendente')
            ->orderBy('codigo_venda', 'asc')
            ->get();

        return view('janela', [
            'envios' => $envios,
            'janela_nome' => $janela
        ]);
    }

    public function showImportForm()
    {
        return view('importar');
    }

    public function import(Request $request)
    {
        $request->validate(['planilha' => 'required|mimes:csv,txt,xls,xlsx']);
        Envio::truncate();
        Excel::import(new EnviosImport, $request->file('planilha'));
        return redirect()->route('dashboard')->with('success', 'Planilha importada e dados resetados com sucesso!');
    }

    public function confirmar(Request $request, Envio $envio)
    {
        $request->validate(['volumes' => 'required|integer|min:1']);
        $envio->status = 'Concluído';
        $envio->volumes = $request->input('volumes');
        $envio->save();
        
        return redirect()->route('etiqueta.imprimir', ['envio' => $envio->id]);
    }

    public function showConcluidos(Request $request)
    {
        // Inicia a busca por envios concluídos
        $query = Envio::where('status', 'Concluído');

        // Se um filtro de janela de coleta foi enviado, aplica o filtro
        if ($request->has('janela_coleta') && $request->janela_coleta != '') {
            $query->where('janela_coleta', $request->janela_coleta);
        }

        // Busca os envios, ordenando pelos mais recentes primeiro
        $enviosConcluidos = $query->orderBy('updated_at', 'desc')->get();
        
        // Busca todas as janelas concluídas disponíveis para popular o filtro
        $janelasDisponiveis = Envio::where('status', 'Concluido')
            ->select('janela_coleta')
            ->whereNotNull('janela_coleta')
            ->distinct()
            ->orderBy('janela_coleta')
            ->get();
        
        return view('concluidos', [
            'envios' => $enviosConcluidos,
            'janelas' => $janelasDisponiveis
        ]);
    }

    public function reverter(Envio $envio)
    {
        $envio->status = 'Pendente';
        $envio->save();
        return back()->with('success', "Venda #{$envio->codigo_venda} revertida para Pendente!");
    }

    public function showRomaneioForm()
    {
        $janelasDisponiveis = Envio::where('status', 'Concluído')
            ->select('janela_coleta')
            ->whereNotNull('janela_coleta')
            ->distinct()
            ->orderBy('janela_coleta')
            ->get();

        return view('romaneio-form', ['janelas' => $janelasDisponiveis]);
    }

    public function gerarRomaneio(Request $request)
    {
        $request->validate(['janela_coleta' => 'required']);
        $janelaSelecionada = $request->input('janela_coleta');
        $envios = Envio::where('status', 'Concluído')
            ->where('janela_coleta', $janelaSelecionada)
            ->orderBy('codigo_venda')
            ->get();
        $total_vendas = $envios->count();
        $total_volumes = $envios->sum('volumes');
        $total_valor = $envios->sum('valor_venda');

        return view('romaneio-resultado', [
            'envios' => $envios,
            'janela_coleta' => $janelaSelecionada,
            'total_vendas' => $total_vendas,
            'total_volumes' => $total_volumes,
            'total_valor' => $total_valor,
        ]);
    }
    
    // --- MÉTODOS PARA GERENCIAMENTO DE VENDAS (CRUD) ---
    public function create()
    {
        return view('envio-form');
    }

    public function store(Request $request)
    {
        $dadosValidados = $request->validate([
            'codigo_venda' => 'required|unique:envios,codigo_venda',
            'cliente_nome' => 'required',
            'valor_venda' => 'required|numeric',
            'ordem_manipulacao' => 'nullable|unique:envios,ordem_manipulacao',
            'janela_coleta' => 'required',
            'volumes' => 'required|integer|min:1',
        ]);
        Envio::create($dadosValidados + ['status' => 'Pendente']);
        return redirect()->route('dashboard')->with('success', 'Venda adicionada com sucesso!');
    }

    public function edit(Envio $envio)
    {
        return view('envio-form', ['envio' => $envio]);
    }

    public function update(Request $request, Envio $envio)
    {
        $dadosValidados = $request->validate([
            'codigo_venda' => 'required|unique:envios,codigo_venda,' . $envio->id,
            'cliente_nome' => 'required',
            'valor_venda' => 'required|numeric',
            'ordem_manipulacao' => 'nullable|unique:envios,ordem_manipulacao,' . $envio->id,
            'janela_coleta' => 'required',
            'volumes' => 'required|integer|min:1',
        ]);
        $envio->update($dadosValidados);
        return redirect()->route('janela.show', ['janela' => $envio->janela_coleta])
            ->with('success', 'Venda atualizada com sucesso!');
    }

    // --- NOVO MÉTODO: Lógica para a impressão da etiqueta ---
public function imprimirEtiqueta(Envio $envio)
{
    // Não precisamos mais da lógica do logo aqui!
    // Acessaremos o logo na view diretamente com $envio->carrier_logo
    return view('etiqueta', ['envio' => $envio]);
}
}
