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
    Schema::create('envios', function (Blueprint $table) {
        $table->id();
        $table->string('codigo_venda')->index();
        $table->string('ordem_manipulacao')->unique()->nullable();
        $table->string('cliente_nome');
        $table->decimal('valor_venda', 10, 2);
        $table->string('local_entrega');
        $table->string('forma_farmaceutica');
        $table->string('cidade');
        $table->boolean('requer_refrigeracao')->default(false);
        $table->string('janela_coleta')->index();
        $table->integer('volumes')->default(1);
        $table->string('status')->default('Pendente')->index();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('envios');
    }
};
