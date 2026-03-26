<script lang="ts">
	import { get } from 'svelte/store';
	import { PlusIcon, LayersIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters, AppModal } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { endpoints } from '$config/endpoints';
	import { apiFetch, ApiError } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import type { Column } from '$components/core/AppTable.svelte';

	interface TrainingSet {
		id: number;
		name: string;
		description?: string;
		exercises?: unknown[];
		category?: string;
		difficulty?: string;
		is_active?: boolean;
		created_at: string;
		updated_at: string;
		[key: string]: unknown;
	}

	interface TrainingSetForm {
		name: string;
		description: string;
		category: string;
		difficulty: string;
		is_active: boolean;
	}

	const emptyForm: TrainingSetForm = { name: '', description: '', category: '', difficulty: 'beginner', is_active: true };

	const table = useTable({ initialSortKey: 'name', initialSortDirection: 'asc' });

	let sets = $state<TrainingSet[]>([]);
	let error = $state('');
	let modalOpen = $state(false);
	let editingSet = $state<TrainingSet | null>(null);
	let form = $state<TrainingSetForm>({ ...emptyForm });
	let formError = $state('');
	let saving = $state(false);

	let filterCategory = $state('');

	const columns: Column[] = [
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'category', label: 'Category', sortable: true },
		{ key: 'difficulty', label: 'Difficulty', sortable: true },
		{ key: 'exercises', label: 'Exercises' },
		{ key: 'is_active', label: 'Status' },
		{ key: 'created_at', label: 'Created', sortable: true }
	];

	const difficultyColors: Record<string, string> = {
		beginner: 'bg-green-100 text-green-700',
		intermediate: 'bg-yellow-100 text-yellow-700',
		advanced: 'bg-red-100 text-red-700'
	};

	async function fetchSets(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set('limit', String(params.per_page));
			qs.set('offset', String((params.page - 1) * params.per_page));
			if (params.search) qs.set('search', params.search);

			const response = await apiFetch<{ data: TrainingSet[]; total?: number }>(
				`${endpoints.fitness.trainingSets}?${qs.toString()}`
			);

			let data = response.data ?? response;
			let list = Array.isArray(data) ? data : [];
			if (filterCategory) list = list.filter((s) => s.category === filterCategory);

			sets = list;
			table.setTotalItems(response.total ?? list.length);
		} catch (err: unknown) {
			if (err instanceof ApiError && err.status === 404) {
				sets = []; table.setTotalItems(0);
			} else {
				error = err instanceof Error ? err.message : 'Failed to load training sets';
			}
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => { fetchSets(get(table.fetchParams)); });
	function handleSort(key: string) { table.toggleSort(key); }

	function openCreate() { editingSet = null; form = { ...emptyForm }; formError = ''; modalOpen = true; }
	function openEdit(set: TrainingSet) {
		editingSet = set;
		form = { name: set.name, description: set.description || '', category: set.category || '', difficulty: set.difficulty || 'beginner', is_active: set.is_active !== false };
		formError = ''; modalOpen = true;
	}
	function closeModal() { modalOpen = false; editingSet = null; }

	async function saveSet() {
		if (!form.name) { formError = 'Name is required'; return; }
		saving = true; formError = '';
		try {
			if (editingSet) {
				await apiFetch(endpoints.fitness.trainingSet(String(editingSet.id)), { method: 'PUT', body: JSON.stringify(form) });
				toast.success('Training set updated');
			} else {
				await apiFetch(endpoints.fitness.trainingSets, { method: 'POST', body: JSON.stringify(form) });
				toast.success('Training set created');
			}
			closeModal(); fetchSets(get(table.fetchParams));
		} catch (err: unknown) { formError = err instanceof Error ? err.message : 'Failed to save'; } finally { saving = false; }
	}

	async function deleteSet(id: number) {
		try { await apiFetch(endpoints.fitness.trainingSet(String(id)), { method: 'DELETE' }); toast.success('Deleted'); fetchSets(get(table.fetchParams)); }
		catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to delete'); }
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Training Sets - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Training Sets</h1>
			<p class="text-sm text-gray-500 mt-1">Manage training set configurations</p>
		</div>
		<button onclick={openCreate} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
			<PlusIcon class="h-4 w-4" />Add Training Set
		</button>
	</div>

	{#if error}<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>{/if}

	<AppFilters bind:search={$table.search} bind:perPage={$table.perPage} searchPlaceholder="Search training sets..." onSearchChange={(q) => table.setSearch(q)} onPerPageChange={(pp) => table.setPerPage(pp)} loading={$table.loading}>
		<select bind:value={filterCategory} onchange={() => table.setPage(1)} disabled={$table.loading} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
			<option value="">All Categories</option>
			{#each ['strength', 'cardio', 'flexibility', 'balance', 'rehabilitation'] as c}
				<option value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
			{/each}
		</select>
	</AppFilters>

	<AppTable columns={columns} rows={sets} loading={$table.loading} sortKey={$table.sortKey} sortDirection={$table.sortDirection} onSort={handleSort} onRowClick={(row) => openEdit(row as TrainingSet)}>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'name'}
				<div class="flex items-center gap-2">
					<LayersIcon class="h-4 w-4 text-gray-400" />
					<span class="font-medium text-gray-900">{row.name as string}</span>
				</div>
			{:else if col.key === 'category'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{(row.category as string)?.replace(/_/g, ' ') || '—'}</span>
			{:else if col.key === 'difficulty'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {difficultyColors[row.difficulty as string] || 'bg-gray-100 text-gray-600'}">{(row.difficulty as string) || '—'}</span>
			{:else if col.key === 'exercises'}
				<span class="text-gray-500">{Array.isArray(row.exercises) ? `${row.exercises.length} exercises` : '—'}</span>
			{:else if col.key === 'is_active'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {row.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">{row.is_active !== false ? 'Active' : 'Inactive'}</span>
			{:else if col.key === 'created_at'}
				<span class="text-gray-500 text-sm">{formatDate(row.created_at as string)}</span>
			{:else}
				{row[col.key] as unknown as string ?? ''}
			{/if}
		{/snippet}
		<AppPagination current={$table.page} total={$table.totalPages} totalItems={$table.totalItems} perPage={$table.perPage} onPageChange={(p) => table.setPage(p)} />
	</AppTable>

	<AppModal open={modalOpen} title={editingSet ? 'Edit Training Set' : 'Add Training Set'} onClose={closeModal}>
		<div class="space-y-4">
			{#if formError}<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>{/if}
			<div>
				<label for="ts-name" class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
				<input id="ts-name" type="text" bind:value={form.name} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
			</div>
			<div>
				<label for="ts-desc" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
				<textarea id="ts-desc" bind:value={form.description} rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="ts-cat" class="block text-sm font-medium text-gray-700 mb-1">Category</label>
					<select id="ts-cat" bind:value={form.category} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="">None</option>
						{#each ['strength', 'cardio', 'flexibility', 'balance', 'rehabilitation'] as c}
							<option value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="ts-diff" class="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
					<select id="ts-diff" bind:value={form.difficulty} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="beginner">Beginner</option>
						<option value="intermediate">Intermediate</option>
						<option value="advanced">Advanced</option>
					</select>
				</div>
			</div>
			<label class="flex items-center gap-2">
				<input type="checkbox" bind:checked={form.is_active} class="rounded border-gray-300 text-blue-600" />
				<span class="text-sm text-gray-700">Active</span>
			</label>
			<div class="flex justify-between pt-2">
				{#if editingSet}
					{#if editingSet}
					<button onclick={() => deleteSet(editingSet.id)} class="px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Delete</button>
				{/if}
				{:else}<div></div>{/if}
				<div class="flex gap-3">
					<button onclick={closeModal} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
					<button onclick={saveSet} disabled={saving} class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingSet ? 'Update' : 'Create'}</button>
				</div>
			</div>
		</div>
	</AppModal>
</div>
