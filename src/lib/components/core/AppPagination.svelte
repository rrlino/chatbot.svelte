<script lang="ts">
	let { current = 1, total = 1, perPage = 25, onPageChange }: { current?: number; total?: number; perPage?: number; onPageChange?: (page: number) => void } = $props();

	const pages = $derived(Array.from({ length: Math.min(total, 7) }, (_, i) => i + 1));
</script>

<div class="flex items-center justify-between px-4 py-3 border-t border-gray-200">
	<span class="text-sm text-gray-500">Page {current} of {total}</span>
	<div class="flex gap-1">
		<button onclick={() => onPageChange?.(current - 1)} disabled={current <= 1} class="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50">Previous</button>
		{#each pages as page}
			<button onclick={() => onPageChange?.(page)} class="px-3 py-1 text-sm rounded border {page === current ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'}">{page}</button>
		{/each}
		<button onclick={() => onPageChange?.(current + 1)} disabled={current >= total} class="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50">Next</button>
	</div>
</div>
