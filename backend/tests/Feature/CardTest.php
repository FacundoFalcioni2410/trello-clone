<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardList;
use App\Models\Card;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CardTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_cards(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        Card::factory()->count(2)->create(['board_list_id' => $list->id]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/boards/{$board->id}/lists/{$list->id}/cards");

        $response->assertStatus(200)
            ->assertJsonCount(2);
    }

    public function test_user_can_create_a_card(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/boards/{$board->id}/lists/{$list->id}/cards", [
            'title' => 'New task',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'title' => 'New task',
                'board_list_id' => $list->id,
            ]);
    }

    public function test_user_can_update_a_card(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id, 'title' => 'Old']);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}", [
            'title' => 'Updated task',
            'description' => 'Some details',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'title' => 'Updated task',
                'description' => 'Some details',
            ]);
    }

    public function test_user_can_delete_a_card(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Card deleted']);

        $this->assertSoftDeleted('cards', ['id' => $card->id]);
    }

    public function test_user_cannot_access_another_users_cards(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $otherUser->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/boards/{$board->id}/lists/{$list->id}/cards");

        $response->assertStatus(403);
    }
}
