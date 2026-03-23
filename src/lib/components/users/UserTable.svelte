<script lang="ts">
	let { users = [], loading = false }: { users?: Record<string, unknown>[]; loading?: boolean } = $props();
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
	{#if loading}
		<div class="flex items-center justify-center py-8"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>
	{:else}
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each users as user}
					<tr class="hover:bg-gray-50">
						<td class="px-4 py-3 text-sm">{user.name as string}</td>
						<td class="px-4 py-3 text-sm text-gray-500">{user.email as string}</td>
						<td class="px-4 py-3 text-sm">{user.status as string}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
