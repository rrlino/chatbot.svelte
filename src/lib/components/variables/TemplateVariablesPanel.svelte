<script lang="ts">
	let { variables = [] }: { variables?: Record<string, string>[] } = $props();
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
	<h3 class="text-sm font-semibold text-gray-900 mb-3">Template Variables</h3>
	{#if variables.length === 0}
		<p class="text-sm text-gray-500">No variables available.</p>
	{:else}
		<div class="space-y-2">
			{#each variables as v}
				<div class="flex items-center gap-2 text-sm">
					<code class="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{v.key}</code>
					<span class="text-gray-500">-</span>
					<span class="text-gray-700">{v.value}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
