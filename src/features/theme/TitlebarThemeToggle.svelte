<script lang="ts">
	import Icon from "@lib/components/Icon.svelte";
	import { getValue, setValue, watchValue } from "@lib/utilities/store";
	import { onMount } from "svelte";
	import { DEFAULT_THEME } from "./defaults";
	import { editorState } from "./editor-state.svelte";
	import { applyThemeByKey } from "./theme-apply";

	const LIGHT_THEME = "daylight";
	const THEME_KEY = "catppuccin-palette";

	let ready = $state(false);
	let selectedTheme = $state(DEFAULT_THEME);
	let autoSwitch = $state(false);
	let applying = $state(false);

	const isDefaultPair = (key: string) => key === DEFAULT_THEME || key === LIGHT_THEME;
	const isLight = $derived(editorState.activeTheme === LIGHT_THEME);
	const isVisible = $derived(
		ready &&
			!autoSwitch &&
			isDefaultPair(selectedTheme) &&
			isDefaultPair(editorState.activeTheme),
	);
	const label = $derived(
		isLight ? "Light mode — switch to dark mode" : "Dark mode — switch to light mode",
	);

	async function toggleTheme() {
		if (!isVisible || applying) return;
		const next = isLight ? DEFAULT_THEME : LIGHT_THEME;
		applying = true;
		selectedTheme = next;
		try {
			await setValue(THEME_KEY, next);
			await applyThemeByKey(next, DEFAULT_THEME);
		} finally {
			applying = false;
		}
	}

	onMount(() => {
		let mounted = true;
		void Promise.all([
			getValue<string>(THEME_KEY, DEFAULT_THEME),
			getValue<boolean>("theme-auto-switch", false),
		]).then(([theme, auto]) => {
			if (!mounted) return;
			selectedTheme = theme;
			autoSwitch = auto;
			ready = true;
		});

		const unwatchTheme = watchValue<string>(THEME_KEY, (theme) => {
			selectedTheme = theme ?? DEFAULT_THEME;
		});
		const unwatchAuto = watchValue<boolean>("theme-auto-switch", (enabled) => {
			autoSwitch = enabled ?? false;
		});

		return () => {
			mounted = false;
			unwatchTheme();
			unwatchAuto();
		};
	});
</script>

{#if isVisible}
	<button
		type="button"
		class="theme-toggle"
		data-mode={isLight ? "light" : "dark"}
		aria-label={label}
		aria-pressed={isLight}
		title={label}
		disabled={applying}
		onclick={toggleTheme}
	>
		<Icon name={isLight ? "sun" : "moon"} size={16} strokeWidth={1.8} />
	</button>
{/if}

<style>
	.theme-toggle {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 0;
		border-radius: var(--abt-radius, 6px);
		background: transparent;
		color: var(--abt-muted, var(--color-pageTextSubdued));
		cursor: pointer;
		transition:
			background 120ms ease,
			color 120ms ease;
	}

	.theme-toggle:hover:not(:disabled) {
		background: var(--abt-fill-hover, color-mix(in srgb, currentColor 12%, transparent));
		color: var(--color-pageText);
	}

	.theme-toggle:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--abt-accent, currentColor) 70%, transparent);
		outline-offset: 2px;
	}

	.theme-toggle:disabled {
		cursor: default;
		opacity: 0.55;
	}
</style>
