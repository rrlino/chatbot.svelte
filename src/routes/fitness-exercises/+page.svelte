<script lang="ts">
	import { get } from 'svelte/store';
	import { PlusIcon, DumbbellIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters, AppModal } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { endpoints } from '$config/endpoints';
	import { apiFetch, ApiError } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import type { Column } from '$components/core/AppTable.svelte';

	interface Exercise {
		id: number;
		name: string;
		description?: string;
		muscle_group?: string;
		equipment?: string;
		difficulty?: string;
		instructions?: string;
		is_active?: boolean;
		created_at: string;
		updated_at: string;
		[key: string]: unknown;
	}

	interface ExerciseForm {
		name: string;
		description: string;
		muscle_group: string;
		equipment: string;
		difficulty: string;
		instructions: string;
		is_active: boolean;
	}

	const emptyForm: ExerciseForm = {
		name: '', description: '', muscle_group: '', equipment: '', difficulty: 'beginner', instructions: '', is_active: true
	};

	const table = useTable({ initialSortKey: 'name', initialSortDirection: 'asc' });

	let exercises = $state<Exercise[]>([]);
	let error = $state('');
	let modalOpen = $state(false);
	let editingExercise = $state<Exercise | null>(null);
	let form = $state<ExerciseForm>({ ...emptyForm });
	let formError = $state('');
	let saving = $state(false);

	let filterMuscleGroup = $state('');
	let filterDifficulty = $state('');

	const columns: Column[] = [
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'muscle_group', label: 'Muscle Group', sortable: true },
		{ key: 'equipment', label: 'Equipment' },
		{ key: 'difficulty', label: 'Difficulty', sortable: true },
		{ key: 'is_active', label: 'Status' },
		{ key: 'created_at', label: 'Created', sortable: true }
	];

	const difficultyColors: Record<string, string> = {
		beginner: 'bg-green-100 text-green-700',
		intermediate: 'bg-yellow-100 text-yellow-700',
		advanced: 'bg-red-100 text-red-700'
	};

	async function fetchExercises(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set('limit', String(params.per_page));
			qs.set('offset', String((params.page - 1) * params.per_page));
			if (params.search) qs.set('search', params.search);

			const response = await apiFetch<{ data: Exercise[]; total?: number }>(
				`${endpoints.fitness.exercises}?${qs.toString()}`
			);

			let data = response.data ?? response;
			let list = Array.isArray(data) ? data : [];

			if (filterMuscleGroup) list = list.filter((e) => e.muscle_group === filterMuscleGroup);
			if (filterDifficulty) list = list.filter((e) => e.difficulty === filterDifficulty);

			exercises = list;
			table.setTotalItems(response.total ?? list.length);
		} catch (err: unknown) {
			if (err instanceof ApiError && err.status === 404) {
				exercises = [];
				table.setTotalItems(0);
			} else {
				error = err instanceof Error ? err.message : 'Failed to load exercises';
			}
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => {
		fetchExercises(get(table.fetchParams));
	});

	function handleSort(key: string) { table.toggleSort(key); }

	function openCreate() {
		editingExercise = null;
		form = { ...emptyForm };
		formError = '';
		modalOpen = true;
	}

	function openEdit(exercise: Exercise) {
		editingExercise = exercise;
		form = {
			name: exercise.name,
			description: exercise.description || '',
			muscle_group: exercise.muscle_group || '',
			equipment: exercise.equipment || '',
			difficulty: exercise.difficulty || 'beginner',
			instructions: exercise.instructions || '',
			is_active: exercise.is_active !== false
		};
		formError = '';
		modalOpen = true;
	}

	function closeModal() { modalOpen = false; editingExercise = null; }

	async function saveExercise() {
		if (!form.name) { formError = 'Name is required'; return; }
		saving = true; formError = '';
		try {
			if (editingExercise) {
				await apiFetch(endpoints.fitness.exercise(String(editingExercise.id)), { method: 'PUT', body: JSON.stringify(form) });
				toast.success('Exercise updated');
			} else {
				await apiFetch(endpoints.fitness.exercises, { method: 'POST', body: JSON.stringify(form) });
				toast.success('Exercise created');
			}
			closeModal();
			fetchExercises(get(table.fetchParams));
		} catch (err: unknown) {
			formError = err instanceof Error ? err.message : 'Failed to save exercise';
		} finally { saving = false; }
	}

	async function deleteExercise(id: number) {
		try {
			await apiFetch(endpoints.fitness.exercise(String(id)), { method: 'DELETE' });
			toast.success('Exercise deleted');
			fetchExercises(get(table.fetchParams));
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete');
		}
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Fitness Exercises - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Fitness Exercises</h1>
			<p class="text-sm text-gray-500 mt-1">Manage exercise library</p>
		</div>
		<button onclick={openCreate} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
			<PlusIcon class="h-4 w-4" />
			Add Exercise
		</button>
	</div>

	{#if error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
	{/if}

	<AppFilters
		bind:search={$table.search}
		bind:perPage={$table.perPage}
		searchPlaceholder="Search exercises..."
		onSearchChange={(q) => table.setSearch(q)}
		onPerPageChange={(pp) => table.setPerPage(pp)}
		loading={$table.loading}
	>
		<select bind:value={filterMuscleGroup} onchange={() => table.setPage(1)} disabled={$table.loading} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
			<option value="">All Muscle Groups</option>
			{#each ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full_body', 'cardio'] as g}
				<option value={g}>{g.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
			{/each}
		</select>
		<select bind:value={filterDifficulty} onchange={() => table.setPage(1)} disabled={$table.loading} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
			<option value="">All Levels</option>
			<option value="beginner">Beginner</option>
			<option value="intermediate">Intermediate</option>
			<option value="advanced">Advanced</option>
		</select>
	</AppFilters>

	<AppTable columns={columns} rows={exercises} loading={$table.loading} sortKey={$table.sortKey} sortDirection={$table.sortDirection} onSort={handleSort} onRowClick={(row) => openEdit(row as Exercise)}>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'name'}
				<div class="flex items-center gap-2">
					<DumbbellIcon class="h-4 w-4 text-gray-400" />
					<span class="font-medium text-gray-900">{row.name as string}</span>
				</div>
			{:else if col.key === 'muscle_group'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{(row.muscle_group as string)?.replace(/_/g, ' ') || '—'}</span>
			{:else if col.key === 'difficulty'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {difficultyColors[row.difficulty as string] || 'bg-gray-100 text-gray-600'}">{(row.difficulty as string) || '—'}</span>
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

	<AppModal open={modalOpen} title={editingExercise ? 'Edit Exercise' : 'Add Exercise'} onClose={closeModal}>
		<div class="space-y-4">
			{#if formError}<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>{/if}
			<div>
				<label for="ex-name" class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
				<input id="ex-name" type="text" bind:value={form.name} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
			</div>
			<div>
				<label for="ex-desc" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
				<textarea id="ex-desc" bind:value={form.description} rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
			</div>
			<div class="grid grid-cols-3 gap-4">
				<div>
					<label for="ex-muscle" class="block text-sm font-medium text-gray-700 mb-1">Muscle Group</label>
					<select id="ex-muscle" bind:value={form.muscle_group} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="">None</option>
						{#each ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full_body', 'cardio'] as g}
							<option value={g}>{g.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="ex-equip" class="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
					<input id="ex-equip" type="text" bind:value={form.equipment} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>
				<div>
					<label for="ex-diff" class="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
					<select id="ex-diff" bind:value={form.difficulty} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="beginner">Beginner</option>
						<option value="intermediate">Intermediate</option>
						<option value="advanced">Advanced</option>
					</select>
				</div>
			</div>
			<div>
				<label for="ex-instr" class="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
				<textarea id="ex-instr" bind:value={form.instructions} rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
			</div>
			<label class="flex items-center gap-2">
				<input type="checkbox" bind:checked={form.is_active} class="rounded border-gray-300 text-blue-600" />
				<span class="text-sm text-gray-700">Active</span>
			</label>
			<div class="flex justify-between pt-2">
				{#if editingExercise}
					{#if editingExercise}
					<button onclick={() => deleteExercise(editingExercise.id)} class="px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Delete</button>
				{/if}
				{:else}<div></div>{/if}
				<div class="flex gap-3">
					<button onclick={closeModal} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
					<button onclick={saveExercise} disabled={saving} class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingExercise ? 'Update' : 'Create'}</button>
				</div>
			</div>
		</div>
	</AppModal>
</div>
