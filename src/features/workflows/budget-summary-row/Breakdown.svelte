<script lang="ts" module>
	export interface BreakdownTotals {
		toBudget: number;
		available: number;
		budgeted: number;
		overspent: number;
		nextMonth: number;
	}
</script>

<script lang="ts">
	import { fmtMoney } from "@lib/utilities/currency";
	import { onOutsideClick, positionPopover } from "@lib/utilities/popover";

	let {
		anchors,
		sheet,
		totals,
		mode = "hover",
		open = $bindable(false),
	}: {
		/** Elements that open the breakdown on hover or click. */
		anchors: Element[];
		sheet: string;
		totals: BreakdownTotals;
		mode?: "hover" | "click";
		open?: boolean;
	} = $props();

	const WIDTH = 260;
	const popoverId = $derived(`abt-budget-breakdown-${sheet}`);
	let popover = $state<HTMLDivElement | null>(null);

	// The month cards clip overflow and slide with a transform, so the popover lives on <body>.
	$effect(() => {
		if (mode === "hover") {
			const show = () => (open = true);
			const hide = () => (open = false);
			for (const el of anchors) {
				el.addEventListener("mouseenter", show);
				el.addEventListener("mouseleave", hide);
				el.addEventListener("focusin", show);
				el.addEventListener("focusout", hide);
			}
			return () => {
				for (const el of anchors) {
					el.removeEventListener("mouseenter", show);
					el.removeEventListener("mouseleave", hide);
					el.removeEventListener("focusin", show);
					el.removeEventListener("focusout", hide);
				}
				hide();
			};
		}

		const toggle = () => (open = !open);
		for (const el of anchors) el.addEventListener("click", toggle);
		return () => {
			for (const el of anchors) el.removeEventListener("click", toggle);
		};
	});

	$effect(() => {
		const anchor = anchors[0];
		if (!open || !anchor || !popover) return;
		positionPopover(popover, anchor as HTMLElement, { gap: 8 });
	});

	$effect(() => {
		const anchor = anchors[0];
		if (mode !== "click" || !open || !anchor || !popover) return;
		const onKeydown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			open = false;
			(anchor as HTMLElement).focus?.();
		};
		document.addEventListener("keydown", onKeydown);
		const stopOutside = onOutsideClick([...(anchors as HTMLElement[]), popover], () => {
			open = false;
		});
		return () => {
			document.removeEventListener("keydown", onKeydown);
			stopOutside();
		};
	});

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	const prevMonthName = $derived.by(() => {
		const y = Number(sheet.slice(6, 10));
		const m = Number(sheet.slice(10, 12));
		return new Date(y, m - 2, 1).toLocaleString(undefined, { month: "short" });
	});
</script>

<div
	id={popoverId}
	class="bd abt-popover abt-stack abt-gap-2"
	class:is-open={open}
	class:is-interactive={mode === "click"}
	role={mode === "click" ? "dialog" : "tooltip"}
	aria-label={mode === "click" ? "Available funds calculation" : undefined}
	aria-hidden={!open}
	use:portal
	bind:this={popover}
	style:width="{WIDTH}px"
>
	{#if mode === "click"}<div class="bd__heading">How To Budget is calculated</div>{/if}
	<div class="bd__line abt-repel">
		<span>Available funds</span><span class="abt-privacy-number">{fmtMoney(totals.available)}</span>
	</div>
	<div class="bd__line abt-repel is-overspent">
		<span class="bd__term"><span class="bd__operator">−</span>Overspent in {prevMonthName}</span
		><span class="abt-privacy-number">{fmtMoney(totals.overspent)}</span>
	</div>
	<div class="bd__line abt-repel">
		<span class="bd__term"><span class="bd__operator">−</span>Budgeted</span><span
			class="abt-privacy-number">{fmtMoney(totals.budgeted)}</span
		>
	</div>
	<div class="bd__line abt-repel">
		<span class="bd__term"><span class="bd__operator">−</span>For next month</span><span
			class="abt-privacy-number">{fmtMoney(totals.nextMonth)}</span
		>
	</div>
	<div class="bd__line abt-repel is-total">
		<span class="bd__term"><span class="bd__operator">=</span>To Budget</span><span
			class="abt-privacy-number">{fmtMoney(totals.toBudget)}</span
		>
	</div>
</div>

<style>
	.bd {
		position: fixed;
		z-index: 10000;
		box-sizing: border-box;
		padding: var(--abt-space-3) var(--abt-space-4);
		top: 0;
		left: 0;
		opacity: 0;
		pointer-events: none;
		transform: translateY(-4px);
		transition:
			opacity 0.12s,
			transform 0.12s;
	}

	.bd.is-open {
		opacity: 1;
		transform: none;
	}

	.bd.is-interactive.is-open {
		pointer-events: auto;
	}

	.bd__heading {
		padding-bottom: var(--abt-space-2);
		border-bottom: 1px solid var(--color-tableBorder);
		font-size: var(--abt-text-sm);
		font-weight: 600;
		color: var(--color-pageText);
	}

	.bd__line {
		line-height: 20px;
		font-size: var(--abt-text-md);
		font-variant-numeric: tabular-nums;
		color: var(--abt-muted);
	}

	.bd__line > span:last-child {
		color: var(--color-pageText);
	}

	.bd__line.is-overspent > span:last-child {
		color: var(--color-errorText);
	}

	.bd__line.is-total {
		padding-top: var(--abt-space-3);
		border-top: 1px solid var(--color-tableBorder);
		font-weight: 600;
		color: var(--color-pageText);
	}

	.bd__term {
		display: inline-flex;
		align-items: baseline;
		gap: var(--abt-space-3);
	}

	.bd__operator {
		width: 10px;
		flex: none;
		text-align: center;
		font-weight: 700;
		color: var(--color-pageText);
	}
</style>
