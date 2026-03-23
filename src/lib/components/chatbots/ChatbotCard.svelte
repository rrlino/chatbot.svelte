<script lang="ts">
	import type { Snippet } from 'svelte';
	let { name = '', description = '', status = 'active', children }: { name?: string; description?: string; status?: string; children?: Snippet } = $props();
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold text-gray-900">{name}</h3>
		<span class="text-xs px-2 py-1 rounded-full {status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">{status}</span>
	</div>
	{#if description}
		<p class="text-xs text-gray-500 mt-1">{description}</p>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</div>
