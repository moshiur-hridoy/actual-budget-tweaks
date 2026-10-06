<script lang="ts">
	import { openBudgetSettings } from "@features/workflows/budget-view-options/settings";
	import ActionCard from "@features/workflows/budget-summary-row/ActionCard.svelte";
	import {
		cachedTotals,
		loadMonthTotals,
		type MonthTotals,
	} from "@features/workflows/budget-summary-row/totals";
	import { summaryState } from "@features/workflows/budget-summary-row/state.svelte";
	import { openInsights } from "@features/workflows/template-plan";
	import { templatePlanState } from "@features/workflows/template-plan/state.svelte";
	import MonthPicker from "@lib/components/MonthPicker.svelte";
	import Icon from "@lib/components/Icon.svelte";
	import {
		addMonths,
		currentMonth,
		loadBounds,
		loadMonthMarks,
		monthKey,
		parseMonth,
		setMonthCount,
		showMonth,
		validStart,
		type MonthBounds,
	} from "./native";
	import { budgetNav } from "./state.svelte";

	let pickerOpen = $state(false);

	const start = $derived(budgetNav.months[0] ?? null);
	const span = $derived(budgetNav.months.length);
	// In compare mode the selected month is the newest (rightmost) column.
	const selected = $derived(budgetNav.months[budgetNav.months.length - 1] ?? null);
	const actionSheet = $derived(selected ? `budget${selected.replace("-", "")}` : null);
	const parsed = $derived(selected ? parseMonth(selected) : null);
	const today = $derived(currentMonth());
	const compareMax = $derived(Math.min(budgetNav.displayMax, 3));
	const counts = $derived(
		Array.from({ length: compareMax }, (_, i) => compareMax - i),
	);
	let bounds = $state<MonthBounds>({ start: "0000-01", end: addMonths(currentMonth(), 12) });
	let actionTotals = $state<MonthTotals | null>(null);
	// "YYYY-MM" keys compare correctly as strings.
	const outOfBounds = (key: string) => key < bounds.start || key > bounds.end;

	$effect(() => {
		const sheet = actionSheet;
		if (!sheet) {
			actionTotals = null;
			return;
		}
		void summaryState.versions[sheet];
		let stale = false;
		actionTotals = cachedTotals(sheet);
		loadMonthTotals(sheet)
			.then((totals) => {
				if (!stale) actionTotals = totals;
			})
			.catch(() => {});
		return () => {
			stale = true;
		};
	});

	function nativeToBudgetCard(): Element | null {
		const card = [...document.querySelectorAll<HTMLElement>('[data-testid="budget-summary"]')].find(
			(element) => element.dataset.month === selected,
		);
		return card?.lastElementChild ?? null;
	}

	// Budgets for new months are created as they're reached, so the bounds can grow.
	$effect(() => {
		if (!selected) return;
		let stale = false;
		void loadBounds().then((b) => {
			if (!stale) bounds = b;
		});
		return () => {
			stale = true;
		};
	});

	/** A comparison ends on the selected month, so added columns always come from its past. */
	function startForSelected(key: string, count = span) {
		return validStart(addMonths(key, -(Math.max(count, 1) - 1)), count, bounds);
	}

	async function setCount(count: number) {
		const target = selected;
		await setMonthCount(count);
		if (!target) return;
		const next = startForSelected(target, count);
		if (next !== start) void showMonth(next);
	}

	function goToMonth(key: string) {
		const next = startForSelected(key);
		if (next !== start) void showMonth(next);
	}
</script>

<div class="bmh abt-repel abt-controls-quiet">
	<div class="abt-cluster abt-gap-4">
		{#if parsed}
			<!-- Arrows sit together ahead of the title so its changing width never moves them. -->
			<div class="abt-btn-group">
				<button
					type="button"
					class="abt-btn abt-btn--icon"
					title="Previous month"
					aria-label="Previous month"
					disabled={!selected || startForSelected(addMonths(selected, -1)) === start}
					onclick={() => selected && goToMonth(addMonths(selected, -1))}
				>
					<Icon name="chevronLeft" size={16} />
				</button>
				<button
					type="button"
					class="abt-btn abt-btn--icon"
					title="Next month"
					aria-label="Next month"
					disabled={!selected || startForSelected(addMonths(selected, 1)) === start}
					onclick={() => selected && goToMonth(addMonths(selected, 1))}
				>
					<Icon name="chevronRight" size={16} />
				</button>
			</div>
			<MonthPicker
				year={parsed.year}
				month={parsed.month}
				{span}
				variant="compact"
				bind:open={pickerOpen}
				onpick={(y, m) => goToMonth(monthKey(y, m))}
				loadMarks={loadMonthMarks}
				isDisabled={(y, m) => outOfBounds(monthKey(y, m))}
			/>
			{#if selected !== today}
				<button
					type="button"
					class="abt-btn abt-btn--sm bmh__today"
					title="Jump to current month"
					aria-label="Jump to current month"
					onclick={() => goToMonth(today)}
				>
					Today
				</button>
			{/if}
		{/if}
	</div>
	<div class="bmh__end abt-cluster abt-gap-4">
		<!-- Other features (the category filter) mount their controls here. -->
		<div class="bmh__slot" data-abt-month-header-slot></div>
		{#if counts.length > 1}
			<div class="abt-seg bmh__compare" role="group" aria-label="Compare months">
				<span class="abt-seg__label">Compare</span>
				{#each counts as n (n)}
					<button
						type="button"
						aria-pressed={n <= span}
						aria-label={
							n === 1
								? "Show selected month only"
								: `Compare selected month with ${n - 1} previous ${n === 2 ? "month" : "months"}`
						}
						title={
							n === 1
								? "Show selected month only"
								: `Compare with ${n - 1} previous ${n === 2 ? "month" : "months"}`
						}
						onclick={() => setCount(n)}
					>
						<Icon name="calendar" size={15} />
					</button>
				{/each}
			</div>
		{/if}
		{#if templatePlanState.triggerShown}
			<!-- The header's one action that opens something, so it carries the accent. -->
			<button
				type="button"
				class="abt-btn abt-tone-accent"
				title="Open insights"
				aria-label="Open insights"
				onclick={() => openInsights()}
			>
				<Icon name="layout" size={14} />
				Insights
			</button>
		{/if}
		{#if actionSheet}
			<ActionCard
				menuOnly
				loading={!actionTotals}
				sheet={actionSheet}
				toBudget={actionTotals?.toBudget ?? 0}
				short={actionTotals?.short ?? []}
				overIds={actionTotals?.overIds ?? []}
				overspent={actionTotals?.overspentNow ?? 0}
				toBudgetCard={nativeToBudgetCard}
				onSettings={openBudgetSettings}
			/>
		{/if}
	</div>
</div>

<style>
	/* Matches the side panel header beside it, border included. */
	.bmh {
		/* Sized by its own width (the side panel narrows it), for the compact rules below. */
		container: bmh / inline-size;
		flex-wrap: wrap;
		row-gap: var(--abt-space-3);
		box-sizing: border-box;
		min-height: var(--abt-panel-header-height);
		/* Room above and below a second line, when the controls don't fit on one. */
		padding: var(--abt-space-3) 13px;
		border-bottom: 1px solid var(--abt-panel-border);
		color: var(--color-pageText);
	}

	.bmh__slot {
		display: contents;
	}

	/* Stays right-aligned when it wraps onto its own line. */
	.bmh__end {
		margin-left: auto;
	}

	.bmh__today {
		font-weight: 600;
	}

	@container bmh (max-width: 700px) {
		.bmh .abt-seg__label {
			display: none;
		}

		.bmh .bmh__compare .abt-seg__label {
			display: inline;
		}
	}

	.bmh__compare {
		--abt-btn-h: var(--abt-control-h);
		--bmh-range-radius: max(0px, calc(var(--abt-radius) - 3px));
	}

	.bmh__compare > button {
		display: grid;
		place-items: center;
		width: 30px;
		height: 100%;
		margin: 0;
		padding: 0;
		border-radius: 0;
	}

	.bmh__compare > button[aria-pressed="true"] {
		background: var(--abt-selected-bg);
		color: var(--abt-selected-fg);
	}

	/* Active calendar icons form a right-aligned, continuous date-range selection. */
	.bmh__compare > button:first-of-type[aria-pressed="true"],
	.bmh__compare > button[aria-pressed="false"] + button[aria-pressed="true"] {
		border-top-left-radius: var(--bmh-range-radius);
		border-bottom-left-radius: var(--bmh-range-radius);
	}

	.bmh__compare > button:last-of-type[aria-pressed="true"] {
		border-top-right-radius: var(--bmh-range-radius);
		border-bottom-right-radius: var(--bmh-range-radius);
	}
</style>
