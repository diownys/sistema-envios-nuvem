<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
{
    Schema::table('envios', function (Blueprint $table) {
        // Permite que as colunas sejam nulas (vazias)
        $table->string('janela_coleta')->nullable()->change();
        $table->string('ordem_manipulacao')->nullable()->change();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('envios', function (Blueprint $table) {
            //
        });
    }
};
