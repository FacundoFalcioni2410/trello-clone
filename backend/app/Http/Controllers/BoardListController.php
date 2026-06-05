<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardList;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardListController extends Controller
{
    public function index(Request $request, Board $board): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $lists = $board->lists()->with(['cards'])->orderBy('position', 'asc')->get();

        return response()->json($lists);
    }

    public function store(Request $request, Board $board): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'integer'],
        ]);

        $list = $board->lists()->create([
            'name' => $validated['name'],
            'position' => $validated['position'] ?? 0,
        ]);

        return response()->json($list, 201);
    }

    public function update(Request $request, Board $board, BoardList $list): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id || $list->board_id !== $board->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'position' => ['nullable', 'integer'],
        ]);

        $list->update($validated);

        return response()->json($list);
    }

    public function destroy(Request $request, Board $board, BoardList $list): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id || $list->board_id !== $board->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $list->delete();

        return response()->json(['message' => 'List deleted']);
    }
}
