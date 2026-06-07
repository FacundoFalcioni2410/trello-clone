<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardList;
use App\Models\BoardMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardMemberTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_invite_a_user_by_email(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create(['email' => 'member@example.com']);
        $board = Board::factory()->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($owner, 'sanctum')->postJson("/api/boards/{$board->id}/members", [
            'email' => 'member@example.com',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'user_id' => $member->id,
                'role' => 'member',
            ]);

        $this->assertDatabaseHas('board_members', [
            'board_id' => $board->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);
    }

    public function test_invited_member_can_access_board(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $owner->id]);
        BoardMember::factory()->create(['board_id' => $board->id, 'user_id' => $member->id]);

        $response = $this->actingAs($member, 'sanctum')->getJson("/api/boards/{$board->id}");

        $response->assertStatus(200)
            ->assertJsonPath('id', $board->id);
    }

    public function test_invited_member_can_create_cards(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $owner->id]);
        $list = BoardList::factory()->create(['board_id' => $board->id]);
        BoardMember::factory()->create(['board_id' => $board->id, 'user_id' => $member->id]);

        $response = $this->actingAs($member, 'sanctum')->postJson("/api/boards/{$board->id}/lists/{$list->id}/cards", [
            'title' => 'Member task',
        ]);

        $response->assertStatus(201)
            ->assertJson(['title' => 'Member task']);
    }

    public function test_non_member_cannot_access_board(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($stranger, 'sanctum')->getJson("/api/boards/{$board->id}");

        $response->assertStatus(403);
    }

    public function test_owner_can_remove_member(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $owner->id]);
        BoardMember::factory()->create(['board_id' => $board->id, 'user_id' => $member->id]);

        $response = $this->actingAs($owner, 'sanctum')->deleteJson("/api/boards/{$board->id}/members/{$member->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Member removed']);

        $this->assertDatabaseMissing('board_members', [
            'board_id' => $board->id,
            'user_id' => $member->id,
        ]);
    }

    public function test_removed_member_cannot_access_board(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $owner->id]);
        BoardMember::factory()->create(['board_id' => $board->id, 'user_id' => $member->id]);

        $this->actingAs($owner, 'sanctum')->deleteJson("/api/boards/{$board->id}/members/{$member->id}");

        $response = $this->actingAs($member, 'sanctum')->getJson("/api/boards/{$board->id}");
        $response->assertStatus(403);
    }

    public function test_member_cannot_invite_users(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $owner->id]);
        BoardMember::factory()->create(['board_id' => $board->id, 'user_id' => $member->id]);

        $response = $this->actingAs($member, 'sanctum')->postJson("/api/boards/{$board->id}/members", [
            'email' => 'new@example.com',
        ]);

        $response->assertStatus(403);
    }

    public function test_inviting_nonexistent_user_returns_404(): void
    {
        $owner = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($owner, 'sanctum')->postJson("/api/boards/{$board->id}/members", [
            'email' => 'notfound@example.com',
        ]);

        $response->assertStatus(404);
    }

    public function test_inviting_already_member_returns_422(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $board = Board::factory()->create(['owner_id' => $owner->id]);
        BoardMember::factory()->create(['board_id' => $board->id, 'user_id' => $member->id]);

        $response = $this->actingAs($owner, 'sanctum')->postJson("/api/boards/{$board->id}/members", [
            'email' => $member->email,
        ]);

        $response->assertStatus(422);
    }

    public function test_boards_index_includes_member_boards(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $ownedBoard = Board::factory()->create(['owner_id' => $member->id]);
        $sharedBoard = Board::factory()->create(['owner_id' => $owner->id]);
        BoardMember::factory()->create(['board_id' => $sharedBoard->id, 'user_id' => $member->id]);

        $response = $this->actingAs($member, 'sanctum')->getJson('/api/boards');

        $response->assertStatus(200)
            ->assertJsonCount(2);
    }
}
