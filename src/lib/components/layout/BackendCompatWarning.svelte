<script lang="ts">
	import { ChevronDown, ChevronUp, X } from 'lucide-svelte';
	import { backendCompat } from '$utils/backend-compat';

	let expanded = $state(false);

	let missingEndpoints = $derived.by(() => {
	// Re-subscribe reactively via get()
	get(backendCompat);
});

	function clearAll() {
		backendCompat.clear();
	}

	function formatTime(ts: number): string {
		return new Date(ts).toLocaleTimeString();
	}
</script>

{#if missingEndpoints.length > 0}
	<div class="fixed bottom-4 right-4 max-w-md bg-gray-800 text-white rounded-lg shadow-lg z-[9999] text-xs overflow-hidden">
		<!-- Header -->
		<div
			role="button"
			tabindex="0"
			class="flex items-center w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 transition-colors text-left cursor-pointer"
			onclick={() => (expanded = !expanded)}
			onkeydown={(e) => e.key === 'Enter' && (expanded = !expanded)}
		>
			<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500 text-gray-900 mr-2">{missingEndpoints.length}</span>
			<span>Missing backend endpoints</span>
			<div class="ml-auto mr-2 text-gray-400">
				{#if expanded}
					<ChevronUp class="h-3.5 w-3.5" />
				{:else}
					<ChevronDown class="h-3.5 w-3.5" />
				{/if}
			</div>
			<button
				class="ml-auto p-0.5 text-gray-400 hover:text-white transition-colors"
				onclick={(e) => { e.stopPropagation(); clearAll(); }}
				title="Clear all"
			>
				<X class="h-3.5 w-3.5" />
			</button>
		</div>

		<!-- Body -->
		{#if expanded}
			<div class="max-h-[300px] overflow-y-auto">
				{#each missingEndpoints as entry (entry.endpoint + entry.timestamp)}
					<div class="flex items-center gap-2 px-3 py-1.5 border-b border-gray-600 last:border-b-0">
						<code class="text-yellow-400 font-bold min-w-[40px]">{entry.method}</code>
						<code class="text-green-300 flex-1 break-all">{entry.endpoint}</code>
						<span class="text-red-400 min-w-[28px] text-right">{entry.status ?? '?'}</span>
						<span class="text-gray-500 min-w-[70px] text-right">{formatTime(entry.timestamp)}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
