<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\DashboardController;

Route::get('/dashboard-stats', [DashboardController::class, 'getStats']);
//ROTA PARA AS OCORRÊNCIAS
//Route::get('/api/ocorrencias', [DashboardController::class, 'getOcorrencias'])->name('api.ocorrencias');