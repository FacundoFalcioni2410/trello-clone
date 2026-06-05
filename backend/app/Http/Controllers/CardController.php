<?php

namespace App\Http\Controllers;

use App\Helpers\BroadcastHelper;
use App\Models\Board;
use App\Models\BoardList;
use App\Models\Card;
use App\Models\ChecklistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CardController extends Controller
{
    use BoardAccess;

    public function index(Request $request, Board $board, BoardList $list): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board) || $list->board_id !== $board->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $cards = $list->cards()->with(['checklistItems', 'activities.user'])->orderBy('position', 'asc')->get();

        return response()->json($cards);
    }

    public function store(Request $request, Board $board, BoardList $list): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board) || $list->board_id !== $board->id) {
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

        $card->activities()->create([
            'user_id' => $request->user()->id,
            'type' => 'created',
            'description' => 'created this card',
            'metadata' => ['title' => $card->title],
        ]);

        BroadcastHelper::boardUpdated($board);

        return response()->json($card, 201);
    }

    public function update(Request $request, Board $board, BoardList $list, Card $card): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board) || $list->board_id !== $board->id || $card->board_list_id !== $list->id) {
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

        $original = $card->only(['title', 'description', 'due_date', 'labels', 'board_list_id']);
        $card->update($validated);
        $card->refresh();

        $userId = $request->user()->id;

        if (isset($validated['title']) && $validated['title'] !== $original['title']) {
            $card->activities()->create([
                'user_id' => $userId,
                'type' => 'title_changed',
                'description' => 'changed the title',
                'metadata' => ['from' => $original['title'], 'to' => $validated['title']],
            ]);
        }

        if (isset($validated['description']) && $validated['description'] !== $original['description']) {
            $card->activities()->create([
                'user_id' => $userId,
                'type' => 'description_changed',
                'description' => 'updated the description',
            ]);
        }

        if (isset($validated['due_date']) && $validated['due_date'] !== $original['due_date']) {
            $card->activities()->create([
                'user_id' => $userId,
                'type' => 'due_date_changed',
                'description' => $validated['due_date'] ? 'set a due date' : 'removed the due date',
                'metadata' => ['due_date' => $validated['due_date']],
            ]);
        }

        if (isset($validated['labels'])) {
            $oldLabels = $original['labels'] ?? [];
            $newLabels = $validated['labels'] ?? [];
            $added = array_diff($newLabels, $oldLabels);
            $removed = array_diff($oldLabels, $newLabels);
            if (! empty($added)) {
                $card->activities()->create([
                    'user_id' => $userId,
                    'type' => 'labels_added',
                    'description' => 'added labels',
                    'metadata' => ['labels' => $added],
                ]);
            }
            if (! empty($removed)) {
                $card->activities()->create([
                    'user_id' => $userId,
                    'type' => 'labels_removed',
                    'description' => 'removed labels',
                    'metadata' => ['labels' => $removed],
                ]);
            }
        }

        if (isset($validated['board_list_id']) && $validated['board_list_id'] !== $original['board_list_id']) {
            $fromList = BoardList::find($original['board_list_id']);
            $toList = BoardList::find($validated['board_list_id']);
            $card->activities()->create([
                'user_id' => $userId,
                'type' => 'moved',
                'description' => 'moved this card',
                'metadata' => [
                    'from_list' => $fromList?->name,
                    'to_list' => $toList?->name,
                ],
            ]);
        }

        BroadcastHelper::boardUpdated($board);

        return response()->json($card->load('checklistItems'));
    }

    public function destroy(Request $request, Board $board, BoardList $list, Card $card): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board) || $list->board_id !== $board->id || $card->board_list_id !== $list->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $card->activities()->create([
            'user_id' => $request->user()->id,
            'type' => 'deleted',
            'description' => 'deleted this card',
            'metadata' => ['title' => $card->title],
        ]);

        BroadcastHelper::boardUpdated($board);

        $card->delete();

        return response()->json(['message' => 'Card deleted']);
    }

    public function indexChecklistItems(Request $request, Board $board, BoardList $list, Card $card): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board) || $list->board_id !== $board->id || $card->board_list_id !== $list->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json($card->checklistItems()->orderBy('position', 'asc')->orderBy('id', 'asc')->get());
    }

    public function storeChecklistItem(Request $request, Board $board, BoardList $list, Card $card): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board) || $list->board_id !== $board->id || $card->board_list_id !== $list->id) {
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

        $card->activities()->create([
            'user_id' => $request->user()->id,
            'type' => 'checklist_added',
            'description' => 'added a checklist item',
            'metadata' => ['text' => $item->text],
        ]);

        BroadcastHelper::boardUpdated($board);

        return response()->json($item, 201);
    }

    public function updateChecklistItem(Request $request, Board $board, BoardList $list, Card $card, ChecklistItem $item): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board) || $list->board_id !== $board->id || $card->board_list_id !== $list->id || $item->card_id !== $card->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'text' => ['sometimes', 'required', 'string', 'max:255'],
            'completed' => ['boolean'],
            'position' => ['nullable', 'integer'],
        ]);

        $original = $item->only(['text', 'completed']);
        $item->update($validated);
        $item->refresh();

        $userId = $request->user()->id;

        if (isset($validated['completed']) && $validated['completed'] !== $original['completed']) {
            $card->activities()->create([
                'user_id' => $userId,
                'type' => 'checklist_completed',
                'description' => $validated['completed'] ? 'completed a checklist item' : 'unchecked a checklist item',
                'metadata' => ['text' => $item->text],
            ]);
        }

        if (isset($validated['text']) && $validated['text'] !== $original['text']) {
            $card->activities()->create([
                'user_id' => $userId,
                'type' => 'checklist_updated',
                'description' => 'updated a checklist item',
                'metadata' => ['from' => $original['text'], 'to' => $validated['text']],
            ]);
        }

        BroadcastHelper::boardUpdated($board);

        return response()->json($item);
    }

    public function destroyChecklistItem(Request $request, Board $board, BoardList $list, Card $card, ChecklistItem $item): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board) || $list->board_id !== $board->id || $card->board_list_id !== $list->id || $item->card_id !== $card->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $card->activities()->create([
            'user_id' => $request->user()->id,
            'type' => 'checklist_removed',
            'description' => 'removed a checklist item',
            'metadata' => ['text' => $item->text],
        ]);

        BroadcastHelper::boardUpdated($board);

        $item->delete();

        return response()->json(['message' => 'Checklist item deleted']);
    }
}
