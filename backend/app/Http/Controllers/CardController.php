<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardList;
use App\Models\Card;
use App\Models\ChecklistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CardController extends Controller
{
    public function index(Request $request, Board $board, BoardList $list): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id || $list->board_id !== $board->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $cards = $list->cards()->with('checklistItems')->orderBy('position', 'asc')->get();

        return response()->json($cards);
    }

    public function store(Request $request, Board $board, BoardList $list): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id || $list->board_id !== $board->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'position' => ['nullable', 'integer'],
            'labels' => ['nullable', 'array'],
            'labels.*' => ['string', 'max:255'],
        ]);

        $maxPosition = $list->cards()->max('position') ?? -1;

        $card = $list->cards()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'due_date' => $validated['due_date'] ?? null,
            'position' => $validated['position'] ?? ($maxPosition + 1),
            'labels' => $validated['labels'] ?? null,
        ]);

        return response()->json($card, 201);
    }

    public function update(Request $request, Board $board, BoardList $list, Card $card): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id || $list->board_id !== $board->id || $card->board_list_id !== $list->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'position' => ['nullable', 'integer'],
            'board_list_id' => ['nullable', 'integer', 'exists:board_lists,id'],
            'labels' => ['nullable', 'array'],
            'labels.*' => ['string', 'max:255'],
        ]);

        if (isset($validated['board_list_id'])) {
            $targetList = BoardList::find($validated['board_list_id']);
            if (! $targetList || $targetList->board_id !== $board->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }

        $card->update($validated);

        return response()->json($card->load('checklistItems'));
    }

    public function destroy(Request $request, Board $board, BoardList $list, Card $card): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id || $list->board_id !== $board->id || $card->board_list_id !== $list->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $card->delete();

        return response()->json(['message' => 'Card deleted']);
    }

    public function indexChecklistItems(Request $request, Board $board, BoardList $list, Card $card): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id || $list->board_id !== $board->id || $card->board_list_id !== $list->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json($card->checklistItems()->orderBy('position', 'asc')->orderBy('id', 'asc')->get());
    }

    public function storeChecklistItem(Request $request, Board $board, BoardList $list, Card $card): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id || $list->board_id !== $board->id || $card->board_list_id !== $list->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'text' => ['required', 'string', 'max:255'],
            'completed' => ['boolean'],
            'position' => ['nullable', 'integer'],
        ]);

        $maxPosition = $card->checklistItems()->max('position') ?? -1;

        $item = $card->checklistItems()->create([
            'text' => $validated['text'],
            'completed' => $validated['completed'] ?? false,
            'position' => $validated['position'] ?? ($maxPosition + 1),
        ]);

        return response()->json($item, 201);
    }

    public function updateChecklistItem(Request $request, Board $board, BoardList $list, Card $card, ChecklistItem $item): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id || $list->board_id !== $board->id || $card->board_list_id !== $list->id || $item->card_id !== $card->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'text' => ['sometimes', 'required', 'string', 'max:255'],
            'completed' => ['boolean'],
            'position' => ['nullable', 'integer'],
        ]);

        $item->update($validated);

        return response()->json($item);
    }

    public function destroyChecklistItem(Request $request, Board $board, BoardList $list, Card $card, ChecklistItem $item): JsonResponse
    {
        if ($board->owner_id !== $request->user()->id || $list->board_id !== $board->id || $card->board_list_id !== $list->id || $item->card_id !== $card->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $item->delete();

        return response()->json(['message' => 'Checklist item deleted']);
    }
}
