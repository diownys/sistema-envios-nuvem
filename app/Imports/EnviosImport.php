<?php

namespace App\Imports;

use App\Models\Envio;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithCustomCsvSettings;

class EnviosImport implements ToModel, WithHeadingRow, WithCustomCsvSettings
{
    /**
    * @param array $row
    *
    * @return \Illuminate\Database\Eloquent\Model|null
    */
public function model(array $row)
{
    // PASSO 1: Se não houver código da venda, ignora a linha inteira.
    if (empty($row['codigo_da_venda'])) {
        return null;
    }

    // --- LÓGICA DE VALOR ATUALIZADA ---
    $valorOriginal = $row['valor_da_venda'] ?? 0;
    $valorFinal = 0;

    if (is_numeric($valorOriginal)) {
        // Se a biblioteca já nos deu um número (int ou float), usamos ele diretamente.
        $valorFinal = $valorOriginal;
    } else {
        // Se for um texto (string), aplicamos nossa limpeza para o formato brasileiro.
        $valorLimpo = str_replace('.', '', (string) $valorOriginal); // Remove pontos de milhar
        $valorFinal = (float) str_replace(',', '.', $valorLimpo);   // Troca a vírgula decimal por ponto e converte para número
    }
    // --- FIM DA LÓGICA DE VALOR ---

    return new Envio([
        'codigo_venda'        => $row['codigo_da_venda'],
        'cliente_nome'        => $row['cliente'] ?? 'N/A',
        'valor_venda'         => $valorFinal, // Usa o valor final calculado
        'local_entrega'       => $row['local_de_entrega'] ?? null,
        'forma_farmaceutica'  => $row['forma_farmaceutica'] ?? null,
        'cidade'              => $row['cidade'] ?? null,
        'uf'                  => $row['uf'],
        'requer_refrigeracao' => strtolower($row['tem_produto_refrigerado'] ?? 'não') === 'sim',
        'ordem_manipulacao'   => $row['ordem_de_manipulacao_qrcode'] ?? null,
        'janela_coleta'       => $row['janela_de_coleta'] ?? null,
        'volumes'             => $row['volumes'] ?? 1,
        'status'              => 'Pendente',
        'endereco'          => $row['endereco'],
        'numero_nota'       => $row['numero_nota'],
    ]);
}

    public function getCsvSettings(): array
    {
        return [
            'input_encoding' => 'UTF-8',
            'delimiter' => "\t"
        ];
    }
}