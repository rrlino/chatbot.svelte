<script lang="ts">
	import type { Snippet } from 'svelte';
	let { onSubmit, children }: { onSubmit?: (e: Event) => void; children?: Snippet } = $props();
</script>

<form onsubmit={onSubmit} class="space-y-4">
	{#if children}
		{@render children()}
	{/if}
</form>
