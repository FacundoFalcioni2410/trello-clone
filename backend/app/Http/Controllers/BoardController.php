<?php

namespace App\Http\Controllers;

use App\Models\Board;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $boards = Board::query()
            ->where('owner_id', $request->user()->id)
            ->with(['owner'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($boards);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'background_color' => ['nullable', 'string', 'max:255'],
            'background_image' => ['nullable', 'string', 'max:255'],
        ]);

        $board = Board::create([
            ...$validated,
            'owner_id' => $request->user()->id,
        ]);

        return response()->json($board, 201);
    }

    public function show(Request $request, Board $board): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $board->load(['owner', 'lists.cards.checklistItems', 'lists.cards.activities.user']);

        return response()->json($board);
    }

    public function update(Request $request, Board $board): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'background_color' => ['nullable', 'string', 'max:255'],
            'background_image' => ['nullable', 'string', 'max:255'],
        ]);

        $board->update($validated);

        return response()->json($board);
    }

    public function destroy(Request $request, Board $board): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $board->delete();

        return response()->json(['message' => 'Board deleted']);
    }
}
