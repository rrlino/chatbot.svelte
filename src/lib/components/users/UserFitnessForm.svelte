<script lang="ts">
	import { apiFetch } from '$utils/api';

	let { userId }: { userId: string } = $props();

	let variables = $state<Record<string, unknown>[]>([]);
	let loading = $state(false);
	let error = $state('');

	async function fetchVariables() {
		loading = true;
		error = '';
		try {
			const response = await apiFetch<{ data: Record<string, unknown>[] }>(`/users/${userId}/variables`);
			variables = (response.data ?? response) as unknown as Record<string, unknown>[];
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load fitness data';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (userId) fetchVariables();
	});
</script>

<div class="space-y-4">
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<p class="text-sm text-red-600">{error}</p>
	{:else if variables.length === 0}
		<p class="text-sm text-gray-500">No fitness data recorded for this user.</p>
	{:else}
		<div class="grid grid-cols-2 gap-3">
			{#each variables as v}
				<div class="p-3 bg-gray-50 rounded-lg">
					<p class="text-xs font-medium text-gray-500 uppercase">{v.variable_tag as string ?? v.tag as string}</p>
					<p class="text-sm text-gray-900 mt-1">{v.value as string ?? '—'}</p>
				</div>
			{/each}
		</div>
	{/if}
</div>
