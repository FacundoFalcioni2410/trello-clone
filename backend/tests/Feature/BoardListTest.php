<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardList;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardListTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_board_lists(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        BoardList::factory()->count(2)->create(['board_id' => $board->id]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/boards/{$board->id}/lists");

        $response->assertStatus(200)
            ->assertJsonCount(2);
    }

    public function test_user_can_create_a_list(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/boards/{$board->id}/lists", [
            'name' => 'To Do',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'name' => 'To Do',
                'board_id' => $board->id,
            ]);
    }

    public function test_user_can_rename_a_list(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id, 'name' => 'Old']);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}", [
            'name' => 'New Name',
        ]);

        $response->assertStatus(200)
            ->assertJson(['name' => 'New Name']);
    }

    public function test_user_can_delete_a_list(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson("/api/boards/{$board->id}/lists/{$list->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'List deleted']);

        $this->assertSoftDeleted('board_lists', ['id' => $list->id]);
    }

    public function test_user_cannot_access_another_users_board_lists(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $otherUser->id]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/boards/{$board->id}/lists");

        $response->assertStatus(403);
    }
}
