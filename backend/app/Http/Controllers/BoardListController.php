<?php

namespace App\Http\Controllers;

use App\Helpers\BroadcastHelper;
use App\Models\Board;
use App\Models\BoardList;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardListController extends Controller
{
    use BoardAccess;

    public function index(Request $request, Board $board): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board)) {
            return $this->denyAccess();
        }

        $lists = $board->lists()->with(['cards'])->orderBy('position', 'asc')->get();

        return response()->json($lists);
    }

    public function store(Request $request, Board $board): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board)) {
            return $this->denyAccess();
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'integer'],
        ]);

        $list = $board->lists()->create([
            'name' => $validated['name'],
            'position' => $validated['position'] ?? 0,
        ]);

        BroadcastHelper::boardUpdated($board);

        return response()->json($list, 201);
    }

    public function update(Request $request, Board $board, BoardList $list): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board) || $list->board_id !== $board->id) {
            return $this->denyAccess();
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'position' => ['nullable', 'integer'],
        ]);

        $list->update($validated);

        BroadcastHelper::boardUpdated($board);

        return response()->json($list);
    }

    public function destroy(Request $request, Board $board, BoardList $list): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board) || $list->board_id !== $board->id) {
            return $this->denyAccess();
        }

        $list->delete();

        BroadcastHelper::boardUpdated($board);

        return response()->json(['message' => 'List deleted']);
    }
}
