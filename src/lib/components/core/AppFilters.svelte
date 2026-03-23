<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children?: Snippet } = $props();
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
	{#if children}
		{@render children()}
	{/if}
</div>
