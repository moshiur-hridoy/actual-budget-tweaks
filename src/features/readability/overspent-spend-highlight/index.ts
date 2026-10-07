import { defineSetting } from "@features/types";
import {
	BALANCE_CELL_RE,
	BALANCE_WATCH_OPTIONS,
	fetchCells,
} from "@features/readability/category-progress/cells";
import { watchDom } from "@lib/utilities/dom-watcher";
import { Page, matchesPage } from "@lib/utilities/pages";

const OVERSPENT_ATTR = "data-abt-overspent-spend";
const BALANCE_TEXT_ATTR = "data-abt-overspent-balance-text";

const CSS = `
	/* A negative Spent value is normal in Actual. Red is reserved for the
	 * meaningful case: the category's remaining balance is below zero. */
	[${OVERSPENT_ATTR}],
	[${OVERSPENT_ATTR}] * {
		color: var(--color-errorText) !important;
	}
`;

function spendCell(row: Element, cellName: string): HTMLElement | undefined {
	return [...row.querySelectorAll<HTMLElement>("[data-cellname]")].find(
		(cell) => cell.getAttribute("data-cellname") === cellName,
	);
}

function scan(): void {
	if (!matchesPage(Page.Budget)) {
		clearAll();
		return;
	}

	for (const balance of document.querySelectorAll<HTMLElement>(
		'[data-testid="balance"] span[data-cellname]',
	)) {
		const match = balance.getAttribute("data-cellname")?.match(BALANCE_CELL_RE);
		if (!match) continue;
		const [, sheet, catId] = match;
		const balanceCellName = balance.getAttribute("data-cellname");
		const row = balance.closest('[data-testid="row"]');
		const spentCellName = `${sheet}!sum-amount-${catId}`;
		const spent = row ? spendCell(row, spentCellName) : undefined;
		if (!spent) continue;

		// React can reuse a balance node after a budget edit. Refresh the value
		// whenever its visible text changes, then only paint the same cell that
		// initiated this request.
		const text = balance.textContent ?? "";
		const force =
			balance.hasAttribute(BALANCE_TEXT_ATTR) && balance.getAttribute(BALANCE_TEXT_ATTR) !== text;
		balance.setAttribute(BALANCE_TEXT_ATTR, text);

		void fetchCells(sheet, catId, force).then((data) => {
			if (
				!balance.isConnected ||
				balance.getAttribute("data-cellname") !== balanceCellName ||
				!spent.isConnected ||
				spent.getAttribute("data-cellname") !== spentCellName
			)
				return;
			spent.toggleAttribute(OVERSPENT_ATTR, data.balance < 0);
		});
	}
}

function clearAll(): void {
	for (const el of document.querySelectorAll(`[${OVERSPENT_ATTR}], [${BALANCE_TEXT_ATTR}]`)) {
		el.removeAttribute(OVERSPENT_ATTR);
		el.removeAttribute(BALANCE_TEXT_ATTR);
	}
}

export const overspentSpendHighlight = defineSetting({
	type: "checkbox",
	label: "Highlight overspent spending",
	description: "Show a category's Spent amount in red only when its balance is below zero.",
	group: "Budget",
	icon: "alert",
	context: {
		key: "overspent-spend-highlight",
		defaultValue: true,
	},
	css: () => CSS,
	init: () => {
		const unwatch = watchDom(scan, document.body, BALANCE_WATCH_OPTIONS);
		return () => {
			unwatch();
			clearAll();
		};
	},
});
