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

    public function test_user_can_create_card_with_status(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/boards/{$board->id}/lists/{$list->id}/cards", [
            'title' => 'Status card',
            'status' => 'in_progress',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'in_progress');
    }

    public function test_card_defaults_to_todo_status(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/boards/{$board->id}/lists/{$list->id}/cards", [
            'title' => 'No status card',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'todo');
    }

    public function test_user_can_update_card_status(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id, 'status' => 'todo']);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}", [
            'status' => 'done',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'done');
    }

    public function test_status_change_creates_activity(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id, 'status' => 'todo']);

        $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}", [
            'status' => 'done',
        ]);

        $this->assertDatabaseHas('card_activities', [
            'card_id' => $card->id,
            'type' => 'status_changed',
        ]);
    }

    public function test_user_can_create_card_with_parent(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $parent = Card::factory()->create(['board_list_id' => $list->id]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/boards/{$board->id}/lists/{$list->id}/cards", [
            'title' => 'Child card',
            'parent_id' => $parent->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('parent_id', $parent->id);
    }

    public function test_user_can_update_card_parent(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $parent = Card::factory()->create(['board_list_id' => $list->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id]);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}", [
            'parent_id' => $parent->id,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('parent_id', $parent->id);
    }

    public function test_user_can_remove_card_parent(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $parent = Card::factory()->create(['board_list_id' => $list->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id, 'parent_id' => $parent->id]);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}", [
            'parent_id' => null,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('parent_id', null);
    }

    public function test_card_cannot_be_its_own_parent(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id]);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}", [
            'parent_id' => $card->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_card_parent_must_be_in_same_list(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list1 = BoardList::factory()->create(['board_id' => $board->id]);
        $list2 = BoardList::factory()->create(['board_id' => $board->id]);
        $parent = Card::factory()->create(['board_list_id' => $list2->id]);
        $card = Card::factory()->create(['board_list_id' => $list1->id]);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list1->id}/cards/{$card->id}", [
            'parent_id' => $parent->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_parent_change_creates_activity(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $parent = Card::factory()->create(['board_list_id' => $list->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id]);

        $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}", [
            'parent_id' => $parent->id,
        ]);

        $this->assertDatabaseHas('card_activities', [
            'card_id' => $card->id,
            'type' => 'parent_changed',
        ]);
    }
}
