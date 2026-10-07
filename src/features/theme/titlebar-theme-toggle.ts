import { titlebarCluster } from "@features/appearance/titlebar";
import { watchDom } from "@lib/utilities/dom-watcher";
import { mountToNodeWithReturn } from "@lib/utilities/svelte";
import { unmount } from "svelte";
import TitlebarThemeToggle from "./TitlebarThemeToggle.svelte";

const MOUNT_ATTR = "data-abt-titlebar-theme-toggle";

let mounted: { bar: HTMLElement; node: HTMLElement; instance: unknown } | null = null;

function insertionPoint(bar: HTMLElement): Element | null {
	const notification = bar.querySelector('[data-testid="notifications-button"]');
	if (notification) return [...bar.children].find((child) => child.contains(notification)) ?? null;

	const help = bar.querySelector('[data-testid="help-menu-button"]');
	return help ? [...bar.children].find((child) => child.contains(help)) ?? null : null;
}

function removeToggle(): void {
	if (!mounted) return;
	unmount(mounted.instance as never);
	mounted.node.remove();
	mounted = null;
}

function sync(): void {
	const bar = document.querySelector<HTMLElement>(titlebarCluster);
	if (!bar) {
		removeToggle();
		return;
	}

	if (mounted?.bar === bar && mounted.node.parentElement === bar && mounted.node.isConnected) {
		const before = insertionPoint(bar);
		if (before && mounted.node.nextSibling !== before) bar.insertBefore(mounted.node, before);
		return;
	}

	removeToggle();
	const { node, instance } = mountToNodeWithReturn(TitlebarThemeToggle, {});
	// The component is the flex item. The wrapper stays layout-neutral while the toggle is hidden.
	node.style.display = "contents";
	node.setAttribute(MOUNT_ATTR, "");
	bar.insertBefore(node, insertionPoint(bar));
	mounted = { bar, node, instance };
}

export const titlebarThemeToggle = {
	type: "core" as const,
	init: () => {
		watchDom(sync);
	},
};
