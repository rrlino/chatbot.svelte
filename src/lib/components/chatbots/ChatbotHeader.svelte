<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title = 'Chatbots', subtitle = '', children }: { title?: string; subtitle?: string; children?: Snippet } = $props();
</script>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-gray-900">{title}</h1>
	{#if subtitle}
		<p class="text-sm text-gray-500 mt-1">{subtitle}</p>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</div>
