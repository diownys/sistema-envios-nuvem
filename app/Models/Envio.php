<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Envio extends Model
{ // A CLASSE COMEÇA AQUI
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'codigo_venda',
        'ordem_manipulacao',
        'cliente_nome',
        'endereco',
        'cidade',
        'uf',
        'valor_venda',
        'numero_nota',
        'transportadora',
        'janela_coleta',
        'volumes',
        'status',
        'local_entrega',
        'forma_farmaceutica',
        'requer_refrigeracao',
    ];

    /**
     * Accessor para obter o logo da transportadora dinamicamente.
     */
public function getCarrierLogoAttribute(): ?string
{
    // CORREÇÃO: Usar a coluna 'janela_coleta' como fonte da verdade
    $textoDaJanela = Str::lower($this->janela_coleta ?? '');

    $logos = [
        'agile'    => 'https://www.agilecargas.com.br/wp-content/uploads/2021/12/logo2.png',
        'mota'     => 'https://i.imgur.com/QzkC55b.jpeg',
        'moovway'  => 'https://i.imgur.com/bnL00sm.png',
        // Adicione outros aqui se precisar. A palavra-chave deve ser minúscula.
    ];
    
    // Procura por uma palavra-chave (agile, mota, etc.) no texto da janela
    foreach ($logos as $key => $logo) {
        if (Str::contains($textoDaJanela, $key)) {
            return $logo;
        }
    }

    return null; // Retorna nulo se nenhum logo for encontrado
}

    /**
     * Accessor para obter o nome da transportadora a partir da janela de coleta.
     */
    public function getCarrierNameAttribute(): string
    {
        // Pega a string "MoovWay - 14 horas" e a divide no " - "
        $parts = explode(' - ', $this->janela_coleta ?? '');
        // Retorna a primeira parte: "MoovWay"
        return trim($parts[0]);
    }

} // <-- A CLASSE TERMINA AQUI. A CHAVE ESTAVA FALTANDO OU NO LUGAR ERRADO