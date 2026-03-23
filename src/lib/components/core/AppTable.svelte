<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronUpIcon, ChevronDownIcon, MinusIcon } from 'lucide-svelte';
	import type { SortDirection } from '$lib/composables/useTable';

	export interface Column {
		key: string;
		label: string;
		sortable?: boolean;
		class?: string;
		headerClass?: string;
	}

	let {
		columns = [],
		rows = [],
		loading = false,
		sortKey = '',
		sortDirection = 'asc' as SortDirection,
		onSort,
		onRowClick,
		cellRenderer,
		children
	}: {
		columns?: Column[];
		rows?: Record<string, unknown>[];
		loading?: boolean;
		sortKey?: string;
		sortDirection?: SortDirection;
		onSort?: (key: string) => void;
		onRowClick?: (row: Record<string, unknown>) => void;
		cellRenderer?: Snippet<[row: Record<string, unknown>, col: Column]>;
		children?: Snippet;
	} = $props();

	function getSortIcon(col: Column) {
		if (!col.sortable) return null;
		if (sortKey !== col.key) return MinusIcon;
		return sortDirection === 'asc' ? ChevronUpIcon : ChevronDownIcon;
	}
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					{#each columns as col}
						<th
							class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider {col.headerClass || ''} {col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''}"
							onclick={() => col.sortable && onSort?.(col.key)}
							role={col.sortable ? 'button' : undefined}
							tabindex={col.sortable ? 0 : undefined}
							onkeydown={(e) => col.sortable && e.key === 'Enter' && onSort?.(col.key)}
						>
							<div class="flex items-center gap-1">
								{col.label}
								{#if col.sortable}
									{@const Icon = getSortIcon(col)}
								{#if Icon}
									<Icon class="h-3.5 w-3.5 {sortKey === col.key ? 'text-blue-600' : 'text-gray-400'}" />
								{/if}
								{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#if loading}
					<tr>
						<td colspan={columns.length} class="px-4 py-12 text-center text-gray-500">
							<div class="flex items-center justify-center gap-2">
								<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
								<span>Loading...</span>
							</div>
						</td>
					</tr>
				{:else if rows.length === 0}
					<tr>
						<td colspan={columns.length} class="px-4 py-12 text-center text-gray-500">
							No data available
						</td>
					</tr>
				{:else}
					{#each rows as row (row.id ?? row._key)}
						<tr
							class="hover:bg-gray-50 transition-colors {onRowClick ? 'cursor-pointer' : ''}"
							onclick={() => onRowClick?.(row)}
						>
							{#each columns as col}
								<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 {col.class || ''}">
									{#if cellRenderer}
										{@render cellRenderer(row, col)}
									{:else}
										{row[col.key] as unknown as string ?? ''}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	{#if children}
		{@render children()}
	{/if}
</div>
