<?php

namespace App\Http\Controllers;

use App\Events\UserBoardsUpdated;
use App\Models\Board;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    use BoardAccess;

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $owned = Board::query()
            ->where('owner_id', $userId)
            ->with(['owner'])
            ->get();

        $memberOf = Board::query()
            ->whereHas('members', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->with(['owner'])
            ->get();

        $boards = $owned->merge($memberOf)->sortByDesc('created_at')->values();

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
        if (! $this->canAccessBoard($request->user()->id, $board)) {
            return $this->denyAccess();
        }

        $board->load(['owner', 'members.user', 'lists.cards.checklistItems', 'lists.cards.activities.user']);

        return response()->json($board);
    }

    public function update(Request $request, Board $board): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board)) {
            return $this->denyAccess();
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
        if (! $this->canManageBoard($request->user()->id, $board)) {
            return $this->denyAccess();
        }

        $board->delete();

        return response()->json(['message' => 'Board deleted']);
    }

    public function members(Request $request, Board $board): JsonResponse
    {
        if (! $this->canAccessBoard($request->user()->id, $board)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $members = $board->members()->with('user')->get();

        return response()->json($members);
    }

    public function invite(Request $request, Board $board): JsonResponse
    {
        if (! $this->canManageBoard($request->user()->id, $board)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'role' => ['nullable', 'string', 'in:member,admin'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        if ($user->id === $board->owner_id) {
            return response()->json(['error' => 'User is already the owner'], 422);
        }

        if ($board->members()->where('user_id', $user->id)->exists()) {
            return response()->json(['error' => 'User is already a member'], 422);
        }

        $member = $board->members()->create([
            'user_id' => $user->id,
            'role' => $validated['role'] ?? 'member',
        ]);

        broadcast(new UserBoardsUpdated($user->id));

        return response()->json($member->load('user'), 201);
    }

    public function removeMember(Request $request, Board $board, int $userId): JsonResponse
    {
        if (! $this->canManageBoard($request->user()->id, $board)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $deleted = $board->members()->where('user_id', $userId)->delete();

        if (! $deleted) {
            return response()->json(['error' => 'Member not found'], 404);
        }

        broadcast(new UserBoardsUpdated($userId));

        return response()->json(['message' => 'Member removed']);
    }
}
