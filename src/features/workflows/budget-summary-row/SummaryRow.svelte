<script lang="ts">
	import Icon from "@lib/components/Icon.svelte";
	import { fmtMoney } from "@lib/utilities/currency";
	import Breakdown from "./Breakdown.svelte";
	import { summaryState } from "./state.svelte";
	import { cachedTotals, loadMonthTotals, type MonthTotals } from "./totals";

	const { sheet }: { sheet: string } = $props();

	// svelte-ignore state_referenced_locally
	let totals = $state<MonthTotals | null>(cachedTotals(sheet));
	let root = $state<HTMLElement | null>(null);
	let infoButton = $state<HTMLButtonElement | null>(null);
	let breakdownOpen = $state(false);

	$effect(() => {
		const card = root?.closest("[data-abt-summary-row]");
		if (!card || !totals) return;
		card.toggleAttribute("data-abt-to-budget-negative", totals.toBudget < 0);
		return () => card.removeAttribute("data-abt-to-budget-negative");
	});

	$effect(() => {
		void summaryState.versions[sheet];
		let stale = false;
		loadMonthTotals(sheet)
			.then((value) => {
				if (!stale) totals = value;
			})
			.catch(() => {});
		return () => {
			stale = true;
		};
	});

	const allocationState = $derived(
		!totals || totals.toBudget === 0 ? "balanced" : totals.toBudget > 0 ? "unassigned" : "over",
	);
	const spentRemainder = $derived(totals ? totals.budgeted - totals.spent : 0);
	const previousMonthName = $derived.by(() => {
		const year = Number(sheet.slice(6, 10));
		const month = Number(sheet.slice(10, 12));
		return new Date(year, month - 2, 1).toLocaleString(undefined, { month: "short" });
	});
</script>

{#if totals}
	<div class="sr" bind:this={root}>
		<div class="sr__card sr__to-budget abt-card abt-stack" data-state={allocationState}>
			<span class="sr__label abt-label">To Budget</span>
			<strong class="sr__value abt-num abt-privacy-number">{fmtMoney(totals.toBudget)}</strong>
			<span class="sr__sub">
				{#if totals.toBudget === 0}
					{fmtMoney(totals.budgeted)} assigned
				{:else if totals.toBudget > 0}
					Money left to assign
				{:else}
					{fmtMoney(Math.abs(totals.toBudget))} over-assigned
				{/if}
			</span>
		</div>

		<div class="sr__card sr__available abt-card abt-stack">
			<span class="sr__label abt-label">Available fund</span>
			<strong class="sr__value abt-num abt-privacy-number">{fmtMoney(totals.available)}</strong>
			<span class="sr__sub sr__available-sub">
				<span class="abt-privacy-number">{fmtMoney(totals.overspent)}</span>
				overspent in {previousMonthName}
				<button
					type="button"
					class="sr__info"
					aria-label="How To Budget is calculated"
					aria-describedby={`abt-budget-breakdown-${sheet}`}
					aria-controls={`abt-budget-breakdown-${sheet}`}
					bind:this={infoButton}
				>
					<Icon name="infoCircle" size={16} strokeWidth={1.8} />
				</button>
			</span>
		</div>

		<div class="sr__card sr__spent abt-card abt-stack">
			<span class="sr__label abt-label">Spent</span>
			<strong class="sr__value abt-num abt-privacy-number">{fmtMoney(totals.spent)}</strong>
			<span class="sr__sub">
				{#if spentRemainder >= 0}
					<span class="sr__positive abt-privacy-number">{fmtMoney(spentRemainder)}</span>
					left of <span class="abt-privacy-number">{fmtMoney(totals.budgeted)}</span>
				{:else}
					<span class="sr__negative abt-privacy-number">{fmtMoney(Math.abs(spentRemainder))}</span>
					over <span class="abt-privacy-number">{fmtMoney(totals.budgeted)}</span>
				{/if}
			</span>
		</div>

		<Breakdown
			anchors={infoButton ? [infoButton] : []}
			{sheet}
			{totals}
			mode="hover"
			bind:open={breakdownOpen}
		/>
	</div>
{:else}
	<div class="sr is-loading" aria-hidden="true" aria-busy="true">
		{#each ["To Budget", "Available fund", "Spent"] as label (label)}
			<div class="sr__card abt-card abt-stack">
				<span class="sr__label">{label}</span>
				<span class="sr__skeleton sr__skeleton--value"></span>
				<span class="sr__skeleton sr__skeleton--sub"></span>
			</div>
		{/each}
	</div>
{/if}

<style>
	/* The cards are flex items of Actual's summary row, which provides the surface width. */
	.sr {
		display: contents;
	}

	.sr__card {
		--abt-pad: var(--abt-space-4) var(--abt-space-6);
		box-sizing: border-box;
		display: flex;
		flex: 1 1 0;
		flex-direction: column;
		justify-content: center;
		gap: var(--abt-space-2);
		min-width: 200px;
		min-height: 92px;
	}

	.sr__to-budget {
		border-color: var(--abt-panel-border);
		background:
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--color-noticeTextLight) 16%, transparent),
				transparent 74%
			),
			var(--abt-panel-surface);
	}

	.sr__to-budget[data-state="unassigned"] {
		border-color: color-mix(in srgb, var(--abt-panel-accent) 35%, var(--abt-panel-border));
		background:
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--abt-panel-accent) 13%, transparent),
				transparent 74%
			),
			var(--abt-panel-surface);
	}

	.sr__to-budget[data-state="over"] {
		border-color: color-mix(in srgb, var(--color-errorText) 36%, var(--abt-panel-border));
		background:
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--color-errorText) 13%, transparent),
				transparent 74%
			),
			var(--abt-panel-surface);
	}

	.sr__label {
		font-size: 11px;
		line-height: 14px;
	}

	.sr__value {
		font-size: 17px;
		line-height: 22px;
		font-weight: 700;
		color: var(--color-pageText);
	}

	.sr__to-budget[data-state="balanced"] .sr__value,
	.sr__positive {
		color: var(--color-noticeTextLight);
	}

	.sr__to-budget[data-state="unassigned"] .sr__value {
		color: var(--abt-panel-accent);
	}

	.sr__to-budget[data-state="over"] .sr__value,
	.sr__negative {
		color: var(--color-errorText);
	}

	.sr__sub {
		min-width: 0;
		overflow: hidden;
		font-size: 14px;
		line-height: 20px;
		color: var(--color-pageTextSubdued);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sr__available-sub {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.sr__info {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--color-pageTextSubdued);
		cursor: help;
	}

	.sr__info:hover,
	.sr__info[aria-expanded="true"] {
		background: var(--abt-fill-hover);
		color: var(--color-pageText);
	}

	.sr__info:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--abt-accent) 55%, transparent);
		outline-offset: 1px;
	}

	.sr.is-loading > .sr__card {
		min-width: 120px;
	}

	.sr__skeleton {
		display: block;
		border-radius: 4px;
		background: var(--abt-panel-track);
	}

	.sr__skeleton--value {
		width: 55%;
		height: 28px;
	}

	.sr__skeleton--sub {
		width: 72%;
		height: 16px;
	}
</style>
