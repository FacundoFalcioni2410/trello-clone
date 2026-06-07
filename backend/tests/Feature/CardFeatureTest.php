<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardList;
use App\Models\Card;
use App\Models\ChecklistItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CardFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_card_can_have_labels(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/boards/{$board->id}/lists/{$list->id}/cards", [
            'title' => 'Task with labels',
            'labels' => ['red', 'blue'],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('labels', ['red', 'blue']);
    }

    public function test_card_labels_can_be_updated(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id, 'labels' => ['red']]);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}", [
            'labels' => ['green', 'yellow'],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('labels', ['green', 'yellow']);
    }

    public function test_card_can_have_checklist_items(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}/checklist-items", [
            'text' => 'First item',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'text' => 'First item',
                'completed' => false,
            ]);
    }

    public function test_checklist_item_can_be_toggled(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id]);
        $item = ChecklistItem::factory()->create(['card_id' => $card->id, 'completed' => false]);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}/checklist-items/{$item->id}", [
            'completed' => true,
        ]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('completed'));
    }

    public function test_checklist_item_can_be_deleted(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id]);
        $item = ChecklistItem::factory()->create(['card_id' => $card->id]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}/checklist-items/{$item->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Checklist item deleted']);

        $this->assertDatabaseMissing('checklist_items', ['id' => $item->id]);
    }

    public function test_card_activity_is_created_on_update(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id, 'title' => 'Old']);

        $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}", [
            'title' => 'New',
        ]);

        $this->assertDatabaseHas('card_activities', [
            'card_id' => $card->id,
            'type' => 'title_changed',
        ]);
    }

    public function test_card_activity_is_created_on_checklist_toggle(): void
    {
        $user = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $user->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        $card = Card::factory()->create(['board_list_id' => $list->id]);
        $item = ChecklistItem::factory()->create(['card_id' => $card->id, 'completed' => false, 'text' => 'Item']);

        $this->actingAs($user, 'sanctum')->putJson("/api/boards/{$board->id}/lists/{$list->id}/cards/{$card->id}/checklist-items/{$item->id}", [
            'completed' => true,
        ]);

        $this->assertDatabaseHas('card_activities', [
            'card_id' => $card->id,
            'type' => 'checklist_completed',
        ]);
    }
}
