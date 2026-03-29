<script lang="ts">
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';

	interface UserVariable {
		variable_tag: string;
		value: unknown;
		updated_at?: string;
		[key: string]: unknown;
	}

	let { userId }: { userId: string } = $props();

	let variables = $state<UserVariable[]>([]);
	let loading = $state(false);
	let error = $state('');
	let editingTag = $state<string | null>(null);
	let editValue = $state('');

	async function fetchVariables() {
		loading = true;
		error = '';
		try {
			const response = await apiFetch<{ data: UserVariable[] }>(`/users/${userId}/variables`);
			const data = response.data ?? response;
			variables = Array.isArray(data) ? data : [];
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load variables';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (userId) fetchVariables();
	});

	function startEdit(v: UserVariable) {
		editingTag = v.variable_tag;
		editValue = String(v.value ?? '');
	}

	function cancelEdit() {
		editingTag = null;
		editValue = '';
	}

	async function saveEdit() {
		if (!editingTag) return;
		try {
			await apiFetch(`/users/${userId}/variables/${editingTag}`, {
				method: 'POST',
				body: JSON.stringify({ value: editValue })
			});
			toast.success(`Variable ${editingTag} updated`);
			editingTag = null;
			editValue = '';
			fetchVariables();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Failed to update variable');
		}
	}
</script>

<div class="space-y-3">
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<p class="text-sm text-red-600">{error}</p>
	{:else if variables.length === 0}
		<p class="text-sm text-gray-500">No variables set for this user.</p>
	{:else}
		{#each variables as v}
			<div class="flex items-center gap-3 p-2 border border-gray-100 rounded-lg hover:bg-gray-50">
				<span class="font-mono text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded shrink-0">{v.variable_tag}</span>
				{#if editingTag === v.variable_tag}
					<input
						type="text"
						bind:value={editValue}
						class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						onkeydown={(e) => e.key === 'Enter' && saveEdit()}
					/>
					<button onclick={saveEdit} class="text-xs text-blue-600 hover:text-blue-800 font-medium">Save</button>
					<button onclick={cancelEdit} class="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
				{:else}
					<span class="text-sm text-gray-700 flex-1 truncate">{String(v.value ?? '—')}</span>
					<button onclick={() => startEdit(v)} class="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0">Edit</button>
				{/if}
			</div>
		{/each}
	{/if}
</div>
