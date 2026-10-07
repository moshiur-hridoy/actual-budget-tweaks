<script lang="ts">
	import Icon from "@lib/components/Icon.svelte";
	import RollingNumber from "@lib/components/RollingNumber.svelte";
	import { fmtMoney } from "@lib/utilities/currency";
	import Breakdown from "./Breakdown.svelte";
	import { summaryState } from "./state.svelte";
	import { cachedTotals, loadMonthTotals, type MonthTotals } from "./totals";

	const { sheet }: { sheet: string } = $props();

	// svelte-ignore state_referenced_locally
	let monthTotals = $state<MonthTotals | null>(cachedTotals(sheet));
	let root = $state<HTMLElement | null>(null);
	let infoButton = $state<HTMLButtonElement | null>(null);
	let breakdownOpen = $state(false);

	$effect(() => {
		const card = root?.closest("[data-abt-summary-row]");
		if (!card || !monthTotals) return;
		card.toggleAttribute("data-abt-to-budget-negative", monthTotals.toBudget < 0);
		return () => card.removeAttribute("data-abt-to-budget-negative");
	});

	$effect(() => {
		void summaryState.versions[sheet];
		let stale = false;
		loadMonthTotals(sheet)
			.then((value) => {
				if (!stale) monthTotals = value;
			})
			.catch(() => {});
		return () => {
			stale = true;
		};
	});

	const allocationState = $derived(
		!monthTotals || monthTotals.toBudget === 0
			? "balanced"
			: monthTotals.toBudget > 0
				? "unassigned"
				: "over",
	);
	const spentRemainder = $derived(monthTotals ? monthTotals.budgeted - monthTotals.spent : 0);
	const previousMonthName = $derived.by(() => {
		const year = Number(sheet.slice(6, 10));
		const month = Number(sheet.slice(10, 12));
		return new Date(year, month - 2, 1).toLocaleString(undefined, { month: "short" });
	});
</script>

{#if monthTotals}
	<div class="sr" bind:this={root}>
		<div class="sr__card sr__to-budget abt-card abt-stack" data-state={allocationState}>
			<span class="sr__label abt-label">To Budget</span>
			<RollingNumber
				value={monthTotals.toBudget}
				resetKey={sheet}
				class="sr__value abt-num abt-privacy-number"
			/>
			<span class="sr__sub">
				{#if monthTotals.toBudget === 0}
					{fmtMoney(monthTotals.budgeted)} assigned
				{:else if monthTotals.toBudget > 0}
					Money left to assign
				{:else}
					{fmtMoney(Math.abs(monthTotals.toBudget))} over-assigned
				{/if}
			</span>
		</div>

		<div class="sr__card sr__available abt-card abt-stack">
			<span class="sr__label abt-label">Available fund</span>
			<RollingNumber
				value={monthTotals.available}
				resetKey={sheet}
				class="sr__value abt-num abt-privacy-number"
			/>
			<span class="sr__sub sr__available-sub">
				<span class="abt-privacy-number">{fmtMoney(monthTotals.overspent)}</span>
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
			<RollingNumber
				value={monthTotals.spent}
				resetKey={sheet}
				class="sr__value abt-num abt-privacy-number"
			/>
			<span class="sr__sub">
				{#if spentRemainder >= 0}
					<span class="sr__positive abt-privacy-number">{fmtMoney(spentRemainder)}</span>
					left of <span class="abt-privacy-number">{fmtMoney(monthTotals.budgeted)}</span>
				{:else}
					<span class="sr__negative abt-privacy-number">{fmtMoney(Math.abs(spentRemainder))}</span>
					over <span class="abt-privacy-number">{fmtMoney(monthTotals.budgeted)}</span>
				{/if}
			</span>
		</div>

		<Breakdown
			anchors={infoButton ? [infoButton] : []}
			{sheet}
			totals={monthTotals}
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
	.sr {
		display: contents;
	}

	.sr__card {
		--abt-pad: var(--abt-space-4) var(--abt-space-6);
		--sr-wash-tone: var(--color-pageText);
		--sr-wash-strength: 0%;
		--sr-glow-tone: var(--color-pageText);
		--abt-glow-reach: 0%;
		--abt-glow-strength: 0%;
		box-sizing: border-box;
		display: flex;
		flex: 1 1 0;
		flex-direction: column;
		justify-content: center;
		gap: var(--abt-space-2);
		min-width: 200px;
		min-height: 92px;
		border: 1px solid transparent;
		background:
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--sr-wash-tone) var(--sr-wash-strength), transparent),
				transparent 74%
			)
			padding-box,
			linear-gradient(var(--abt-panel-surface), var(--abt-panel-surface)) padding-box,
			linear-gradient(
				var(--abt-glow-angle),
				color-mix(in srgb, var(--sr-glow-tone) var(--abt-glow-strength), transparent),
				var(--abt-panel-border) var(--abt-glow-reach)
			)
			border-box,
			linear-gradient(var(--abt-panel-surface), var(--abt-panel-surface)) border-box;
		transition:
			transform 160ms ease,
			--abt-glow-angle var(--abt-glow-duration) ease,
			--abt-glow-reach var(--abt-glow-duration) ease,
			--abt-glow-strength var(--abt-glow-duration) ease;
	}

	.sr__card:hover {
		--abt-glow-angle: 225deg;
		--abt-glow-reach: 100%;
		--abt-glow-strength: 38%;
		transform: translateY(-1px);
	}

	.sr__to-budget {
		--sr-wash-tone: var(--color-noticeTextLight);
		--sr-wash-strength: 16%;
		--sr-glow-tone: var(--color-noticeTextLight);
	}

	.sr__to-budget[data-state="unassigned"] {
		--sr-wash-tone: var(--abt-panel-accent);
		--sr-wash-strength: 13%;
		--sr-glow-tone: var(--abt-panel-accent);
	}

	.sr__to-budget[data-state="over"] {
		--sr-wash-tone: var(--color-errorText);
		--sr-wash-strength: 13%;
		--sr-glow-tone: var(--color-errorText);
	}

	.sr__label {
		font-size: 11px;
		line-height: 14px;
	}

	:global(.sr__value) {
		font-size: 17px;
		line-height: 22px;
		font-weight: 700;
		color: var(--color-pageText);
	}

	.sr__to-budget[data-state="balanced"] :global(.sr__value),
	.sr__positive {
		color: var(--color-noticeTextLight);
	}

	.sr__to-budget[data-state="unassigned"] :global(.sr__value) {
		color: var(--abt-panel-accent);
	}

	.sr__to-budget[data-state="over"] :global(.sr__value),
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
		margin: -2px 0;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: currentColor;
		cursor: help;
	}

	.sr__info:hover,
	.sr__info:focus-visible {
		background: color-mix(in srgb, currentColor 13%, transparent);
		outline: none;
	}

	.sr__skeleton {
		display: block;
		border-radius: 4px;
		background: var(--color-tableBorder);
		opacity: 0.55;
	}

	.sr__skeleton--value {
		width: 38%;
		height: 29px;
	}

	.sr__skeleton--sub {
		width: 68%;
		height: 16px;
	}

	@media (max-width: 760px) {
		.sr__card {
			min-width: min(100%, 230px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sr__card {
			transition: none;
		}

		.sr__card:hover {
			--abt-glow-reach: 0%;
			--abt-glow-strength: 0%;
			transform: none;
		}
	}
</style>
