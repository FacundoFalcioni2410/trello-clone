<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_list_their_boards(): void
    {
        $user = User::factory()->create();
        Board::factory()->count(3)->create(['owner_id' => $user->id]);
        Board::factory()->count(2)->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/boards');

        $response->assertStatus(200)
            ->assertJsonCount(3);
    }

    public function test_authenticated_user_can_create_a_board(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/boards', [
            'name' => 'My New Board',
            'background_color' => '#3b82f6',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'name' => 'My New Board',
                'background_color' => '#3b82f6',
                'owner_id' => $user->id,
            ]);

        $this->assertDatabaseHas('boards', [
            'name' => 'My New Board',
            'background_color' => '#3b82f6',
            'owner_id' => $user->id,
        ]);
    }

    public function test_board_name_is_required(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/boards', [
            'background_color' => '#3b82f6',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_authenticated_user_can_rename_a_board(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id, 'name' => 'Old Name']);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}", [
            'name' => 'Renamed Board',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'name' => 'Renamed Board',
            ]);

        $this->assertDatabaseHas('boards', [
            'id' => $board->id,
            'name' => 'Renamed Board',
        ]);
    }

    public function test_authenticated_user_can_delete_their_board(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson("/api/boards/{$board->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Board deleted']);

        $this->assertSoftDeleted('boards', ['id' => $board->id]);
    }

    public function test_user_cannot_access_another_users_board(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $otherUser->id]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/boards/{$board->id}");

        $response->assertStatus(403);
    }

    public function test_user_cannot_update_another_users_board(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $otherUser->id]);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}", [
            'name' => 'Hacked Board',
        ]);

        $response->assertStatus(403);
    }

    public function test_user_cannot_delete_another_users_board(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $otherUser->id]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson("/api/boards/{$board->id}");

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_access_boards(): void
    {
        $response = $this->getJson('/api/boards');

        $response->assertStatus(401);
    }
}
