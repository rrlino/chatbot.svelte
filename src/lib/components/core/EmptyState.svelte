<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title = 'No data found', description = '', children }: { title?: string; description?: string; children?: Snippet } = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-gray-500">
	<p class="text-lg font-medium">{title}</p>
	{#if description}
		<p class="text-sm mt-1">{description}</p>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</div>
