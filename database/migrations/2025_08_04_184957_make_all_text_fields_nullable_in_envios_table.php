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
        // Deixando todas as colunas de texto que podem faltar como opcionais (nullable)
        $table->string('local_entrega')->nullable()->change();
        $table->string('forma_farmaceutica')->nullable()->change();
        $table->string('cidade')->nullable()->change();
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
