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
                $table->string('endereco')->nullable()->after('cliente_nome');
                $table->string('numero_nota')->nullable(); 
            });
        }

        /**
         * Reverse the migrations.
         */
        public function down(): void
        {
            Schema::table('envios', function (Blueprint $table) {
                $table->dropColumn('endereco');
                $table->dropColumn('numero_nota');
            });
        }
    };
    