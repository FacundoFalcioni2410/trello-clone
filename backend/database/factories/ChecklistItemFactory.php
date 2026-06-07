<?php

namespace Database\Factories;

use App\Models\Card;
use App\Models\ChecklistItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChecklistItem>
 */
class ChecklistItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'card_id' => Card::factory(),
            'text' => $this->faker->sentence(),
            'completed' => false,
            'position' => 0,
        ];
    }
}
