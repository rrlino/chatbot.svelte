<script lang="ts">
	interface Column {
		key: string;
		label: string;
	}

	let { columns = [], rows = [], loading = false }: { columns?: Column[]; rows?: Record<string, unknown>[]; loading?: boolean } = $props();
</script>

<div class="overflow-x-auto">
	<table class="min-w-full divide-y divide-gray-200">
		<thead class="bg-gray-50">
			<tr>
				{#each columns as col}
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody class="bg-white divide-y divide-gray-200">
			{#if loading}
				<tr>
					<td colspan={columns.length} class="px-6 py-4 text-center text-gray-500">Loading...</td>
				</tr>
			{:else if rows.length === 0}
				<tr>
					<td colspan={columns.length} class="px-6 py-4 text-center text-gray-500">No data available</td>
				</tr>
			{:else}
				{#each rows as row}
					<tr class="hover:bg-gray-50">
						{#each columns as col}
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row[col.key] as unknown as string}</td>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
