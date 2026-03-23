<script lang="ts">
	let {
		current = 1,
		total = 1,
		totalItems = 0,
		perPage = 25,
		onPageChange
	}: {
		current?: number;
		total?: number;
		totalItems?: number;
		perPage?: number;
		onPageChange?: (page: number) => void;
	} = $props();

	const fromItem = $derived(totalItems === 0 ? 0 : (current - 1) * perPage + 1);
	const toItem = $derived(Math.min(current * perPage, totalItems));

	const pages = $derived(() => {
		if (total <= 7) {
			return Array.from({ length: total }, (_, i) => i + 1);
		}

		const result: (number | '...')[] = [1];

		if (current > 3) {
			result.push('...');
		}

		const start = Math.max(2, current - 1);
		const end = Math.min(total - 1, current + 1);

		for (let i = start; i <= end; i++) {
			result.push(i);
		}

		if (current < total - 2) {
			result.push('...');
		}

		result.push(total);
		return result;
	});
</script>

<div class="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
	<div class="text-sm text-gray-500">
		{#if totalItems > 0}
			Showing {fromItem}–{toItem} of {totalItems}
		{:else}
			0 results
		{/if}
	</div>
	<div class="flex items-center gap-1">
		<button
			onclick={() => onPageChange?.(current - 1)}
			disabled={current <= 1}
			class="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			Previous
		</button>
		{#each pages() as page}
			{#if page === '...'}
				<span class="px-2 py-1.5 text-sm text-gray-400">...</span>
			{:else}
				<button
					onclick={() => onPageChange?.(page)}
					class="px-3 py-1.5 text-sm rounded-md border transition-colors {page === current
						? 'bg-blue-600 text-white border-blue-600'
						: 'border-gray-300 hover:bg-gray-50'}"
				>
					{page}
				</button>
			{/if}
		{/each}
		<button
			onclick={() => onPageChange?.(current + 1)}
			disabled={current >= total}
			class="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			Next
		</button>
	</div>
</div>
