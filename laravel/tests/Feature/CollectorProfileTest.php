<?php

namespace Tests\Feature;

use App\Models\CollectorPenalty;
use App\Models\CollectorSalaryEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectorProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_accountant_sees_collector_profile_kpis_and_can_manage_ledgers(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        $this->actingAs($accountant)
            ->get(route('collectors.show', $collector))
            ->assertOk()
            ->assertSee($collector->name, false)
            ->assertSee(__('ui.salary_ledger'), false)
            ->assertSee(__('ui.penalty_ledger'), false)
            ->assertSee(__('ui.salary_add'), false);

        $this->actingAs($accountant)->post(route('collectors.salaries.store', $collector), [
            'amount' => 250000,
            'paid_at' => now()->toDateString(),
            'note' => 'مانگ',
        ])->assertRedirect();

        $salary = CollectorSalaryEntry::query()->latest('id')->firstOrFail();
        $this->assertSame('250000.00', (string) $salary->amount);

        $this->actingAs($accountant)->post(route('collectors.penalties.store', $collector), [
            'amount' => 10000,
            'penalized_at' => now()->toDateString(),
            'reason' => 'دەرەنگ',
        ])->assertRedirect();

        $this->assertSame(1, CollectorPenalty::query()->where('collector_id', $collector->id)->count());

        $page = $this->actingAs($accountant)->get(route('collectors.show', $collector));
        $page->assertOk();
        $page->assertSee('250,000', false);
        $page->assertSee('دەرەنگ', false);
    }

    public function test_collector_can_view_own_profile_but_cannot_post_salary(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        $this->actingAs($collector)
            ->get(route('collectors.show', $collector))
            ->assertOk()
            ->assertDontSee(__('ui.salary_add'), false);

        $this->actingAs($collector)->post(route('collectors.salaries.store', $collector), [
            'amount' => 1000,
            'paid_at' => now()->toDateString(),
        ])->assertForbidden();
    }

    public function test_collector_cannot_view_another_collector_profile(): void
    {
        $this->seed();

        $wholesale = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $retail = User::query()->where('email', 'retail@judi.local')->firstOrFail();

        $this->actingAs($retail)
            ->get(route('collectors.show', $wholesale))
            ->assertForbidden();
    }
}
