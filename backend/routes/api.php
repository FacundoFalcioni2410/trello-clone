<?php

use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardListController;
use App\Http\Controllers\CardController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('boards', BoardController::class);

    Route::get('boards/{board}/lists', [BoardListController::class, 'index']);
    Route::post('boards/{board}/lists', [BoardListController::class, 'store']);
    Route::put('boards/{board}/lists/{list}', [BoardListController::class, 'update']);
    Route::delete('boards/{board}/lists/{list}', [BoardListController::class, 'destroy']);

    Route::get('boards/{board}/lists/{list}/cards', [CardController::class, 'index']);
    Route::post('boards/{board}/lists/{list}/cards', [CardController::class, 'store']);
    Route::put('boards/{board}/lists/{list}/cards/{card}', [CardController::class, 'update']);
    Route::delete('boards/{board}/lists/{list}/cards/{card}', [CardController::class, 'destroy']);
});
