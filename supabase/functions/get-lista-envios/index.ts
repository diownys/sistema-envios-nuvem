// Arquivo: supabase/functions/get-lista-envios/index.ts (VERSÃO ATUALIZADA)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('https://nfsuisftzddegihyhoha.supabase.co') ?? '',
      Deno.env.get('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mc3Vpc2Z0emRkZWdpaHlob2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMTcwMDcsImV4cCI6MjA3NDU5MzAwN30.tM_9JQo6ejzOBWKQ9XxT54f8NuM6jSoHomF9c_IfEJI') ?? ''
    )

    // LÓGICA ATUALIZADA:
    // 1. Buscamos APENAS a coluna "janela_coleta"
    const { data: todosOsEnvios, error } = await supabaseAdmin
      .from('envios')
      .select('janela_coleta')
      .not('janela_coleta', 'is', null) // Ignoramos envios sem janela definida

    if (error) {
      throw error
    }

    // 2. Usamos JavaScript para criar uma lista de valores únicos
    const janelasUnicas = [...new Set(todosOsEnvios.map(item => item.janela_coleta))].sort();

    // 3. Retornamos a lista limpa de janelas
    return new Response(JSON.stringify({ janelas: janelasUnicas }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})