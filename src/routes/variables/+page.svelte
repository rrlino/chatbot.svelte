<script lang="ts">
	import { get } from 'svelte/store';
	import { PlusIcon, CodeIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters, AppModal } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { endpoints } from '$config/endpoints';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import type { Column } from '$components/core/AppTable.svelte';

	interface VariableDefinition {
		id: number;
		tag: string;
		name: string;
		description?: string;
		data_type?: string;
		default_value?: string;
		is_required?: boolean;
		choices?: unknown;
		media_url?: string;
		category?: string;
		is_system_variable?: boolean;
		is_active?: boolean;
		created_at: string;
		updated_at: string;
		[key: string]: unknown;
	}

	interface VariableForm {
		tag: string;
		name: string;
		description: string;
		data_type: string;
		default_value: string;
		category: string;
		is_active: boolean;
		is_required: boolean;
		value?: unknown;
	}

	const emptyForm: VariableForm = {
		tag: '',
		name: '',
		description: '',
		data_type: 'text',
		default_value: '',
		category: '',
		is_active: true,
		is_required: false
	};

	const table = useTable({ initialSortKey: 'tag', initialSortDirection: 'asc' });

	let definitions = $state<VariableDefinition[]>([]);
	let error = $state('');
	let modalOpen = $state(false);
	let editingDef = $state<VariableDefinition | null>(null);
	let form = $state<VariableForm>({ ...emptyForm });
	let formError = $state('');
	let saving = $state(false);
	let deleteConfirmId = $state<string | null>(null);

	// Client-side filters
	let filterCategory = $state('');
	let filterDataType = $state('');
	let filterActive = $state('');

	const columns: Column[] = [
		{ key: 'tag', label: 'Tag', sortable: true },
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'category', label: 'Category', sortable: true },
		{ key: 'data_type', label: 'Type' },
		{ key: 'is_active', label: 'Status' },
		{ key: 'is_system_variable', label: 'System' }
	];

	async function fetchDefinitions(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			if (params.search) qs.set('search', params.search);

			const response = await apiFetch<{ data: VariableDefinition[]; total?: number }>(
				`${endpoints.variables.definitions}?${qs.toString()}`
			);

			let data = response.data ?? response;
			let list = Array.isArray(data) ? data : [];

			// Client-side filtering
			if (filterCategory) list = list.filter((d) => d.category === filterCategory);
			if (filterDataType) list = list.filter((d) => d.data_type === filterDataType);
			if (filterActive === 'active') list = list.filter((d) => d.is_active !== false);
			if (filterActive === 'inactive') list = list.filter((d) => d.is_active === false);

			// Client-side pagination
			const start = (params.page - 1) * params.per_page;
			const end = start + params.per_page;
			definitions = list.slice(start, end);
			table.setTotalItems(list.length);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load variables';
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => {
		fetchDefinitions(get(table.fetchParams));
	});

	function handleSort(key: string) {
		table.toggleSort(key);
	}

	function openCreate() {
		editingDef = null;
		form = { ...emptyForm };
		formError = '';
		modalOpen = true;
	}

	function openEdit(def: VariableDefinition) {
		editingDef = def;
		form = {
			tag: def.tag,
			name: def.name,
			description: def.description || '',
			data_type: def.data_type || 'text',
			default_value: def.default_value || '',
			category: def.category || '',
			is_active: def.is_active !== false,
			is_required: def.is_required || false
		};
		formError = '';
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
		editingDef = null;
	}

	async function saveDefinition() {
		if (!form.tag || !form.name) {
			formError = 'Tag and name are required';
			return;
		}

		saving = true;
		formError = '';
		try {
			const body: Record<string, unknown> = {
				tag: form.tag,
				name: form.name,
				description: form.description || null,
				data_type: form.data_type,
				default_value: form.default_value || null,
				category: form.category || null,
				is_active: form.is_active,
				is_required: form.is_required
			};

			if (editingDef) {
				await apiFetch(endpoints.variables.definition(editingDef.tag), {
					method: 'PUT',
					body: JSON.stringify(body)
				});
				toast.success('Variable updated');
			} else {
				await apiFetch(endpoints.variables.definitions, {
					method: 'POST',
					body: JSON.stringify(body)
				});
				toast.success('Variable created');
			}
			closeModal();
			fetchDefinitions(get(table.fetchParams));
		} catch (err: unknown) {
			formError = err instanceof Error ? err.message : 'Failed to save variable';
		} finally {
			saving = false;
		}
	}

	async function deleteDefinition(tag: string) {
		try {
			await apiFetch(endpoints.variables.definition(tag), { method: 'DELETE' });
			toast.success('Variable deleted');
			deleteConfirmId = null;
			fetchDefinitions(get(table.fetchParams));
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete variable');
		}
	}

	// Extract unique categories from loaded data
	const categories = $derived(() => {
		const cats = new Set<string>();
		// We need all definitions, not just current page. We'll use the filterCategory options from a known set.
		return ['system', 'user', 'fitness', 'training', 'journey'];
	});
</script>

<svelte:head>
	<title>Variables - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Variables</h1>
			<p class="text-sm text-gray-500 mt-1">Manage chatbot template variables</p>
		</div>
		<button
			onclick={openCreate}
			class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
		>
			<PlusIcon class="h-4 w-4" />
			Add Variable
		</button>
	</div>

	<!-- Error -->
	{#if error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
	{/if}

	<!-- Filters -->
	<AppFilters
		bind:search={$table.search}
		bind:perPage={$table.perPage}
		searchPlaceholder="Search variables..."
		onSearchChange={(q) => table.setSearch(q)}
		onPerPageChange={(pp) => table.setPerPage(pp)}
		loading={$table.loading}
	>
		<select
			bind:value={filterCategory}
			onchange={() => table.setPage(1)}
			disabled={$table.loading}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			<option value="">All Categories</option>
			{#each categories() as cat}
				<option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
			{/each}
		</select>
		<select
			bind:value={filterDataType}
			onchange={() => table.setPage(1)}
			disabled={$table.loading}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			<option value="">All Types</option>
			{#each ['text', 'number', 'boolean', 'date', 'json', 'select'] as t}
				<option value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
			{/each}
		</select>
		<select
			bind:value={filterActive}
			onchange={() => table.setPage(1)}
			disabled={$table.loading}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			<option value="">All</option>
			<option value="active">Active</option>
			<option value="inactive">Inactive</option>
		</select>
	</AppFilters>

	<!-- Table -->
	<AppTable
		columns={columns}
		rows={definitions}
		loading={$table.loading}
		sortKey={$table.sortKey}
		sortDirection={$table.sortDirection}
		onSort={handleSort}
		onRowClick={(row) => openEdit(row as VariableDefinition)}
	>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'tag'}
				<span class="font-mono text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{row.tag as string}</span>
			{:else if col.key === 'name'}
				<span class="font-medium text-gray-900">{row.name as string}</span>
			{:else if col.key === 'category'}
				{#if row.category}
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{row.category as string}</span>
				{:else}
					<span class="text-gray-300">—</span>
				{/if}
			{:else if col.key === 'data_type'}
				<span class="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{(row.data_type as string) || 'text'}</span>
			{:else if col.key === 'is_active'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {row.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
					{row.is_active !== false ? 'Active' : 'Inactive'}
				</span>
			{:else if col.key === 'is_system_variable'}
				{#if row.is_system_variable}
					<CodeIcon class="h-4 w-4 text-purple-500" />
				{:else}
					<span class="text-gray-300">—</span>
				{/if}
			{:else}
				{row[col.key] as unknown as string ?? ''}
			{/if}
		{/snippet}

		<AppPagination
			current={$table.page}
			total={$table.totalPages}
			totalItems={$table.totalItems}
			perPage={$table.perPage}
			onPageChange={(p) => table.setPage(p)}
		/>
	</AppTable>

	<!-- Create/Edit Modal -->
	<AppModal open={modalOpen} title={editingDef ? 'Edit Variable' : 'Add Variable'} onClose={closeModal}>
		<div class="space-y-4">
			{#if formError}
				<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
			{/if}

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="tag" class="block text-sm font-medium text-gray-700 mb-1">Tag</label>
					<input id="tag" type="text" bind:value={form.tag} disabled={!!editingDef} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500" placeholder="variable_name" />
				</div>
				<div>
					<label for="var_name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
					<input id="var_name" type="text" bind:value={form.name} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Variable Name" />
				</div>
			</div>

			<div>
				<label for="var_desc" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
				<textarea id="var_desc" bind:value={form.description} rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What this variable is used for"></textarea>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="var_type" class="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
					<select id="var_type" bind:value={form.data_type} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="text">Text</option>
						<option value="number">Number</option>
						<option value="boolean">Boolean</option>
						<option value="date">Date</option>
						<option value="json">JSON</option>
						<option value="select">Select</option>
					</select>
				</div>
				<div>
					<label for="var_category" class="block text-sm font-medium text-gray-700 mb-1">Category</label>
					<select id="var_category" bind:value={form.category} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="">None</option>
						<option value="system">System</option>
						<option value="user">User</option>
						<option value="fitness">Fitness</option>
						<option value="training">Training</option>
						<option value="journey">Journey</option>
					</select>
				</div>
			</div>

			<div>
				<label for="var_default" class="block text-sm font-medium text-gray-700 mb-1">Default Value</label>
				<input id="var_default" type="text" bind:value={form.default_value} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
			</div>

			<div class="flex items-center gap-6">
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={form.is_active} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
					<span class="text-sm text-gray-700">Active</span>
				</label>
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={form.is_required} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
					<span class="text-sm text-gray-700">Required</span>
				</label>
			</div>

			<div class="flex justify-between pt-2">
				{#if editingDef}
					<button onclick={() => { deleteConfirmId = editingDef.tag; }} class="px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Delete</button>
				{:else}
					<div></div>
				{/if}
				<div class="flex gap-3">
					<button onclick={closeModal} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
					<button onclick={saveDefinition} disabled={saving} class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
						{saving ? 'Saving...' : editingDef ? 'Update' : 'Create'}
					</button>
				</div>
			</div>
		</div>
	</AppModal>

	<!-- Delete Confirmation -->
	{#if deleteConfirmId !== null}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => deleteConfirmId = null}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6" onclick={(e) => e.stopPropagation()}>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Variable</h3>
				<p class="text-sm text-gray-600 mb-6">Delete variable <span class="font-mono bg-gray-100 px-1 rounded">{deleteConfirmId}</span>? This cannot be undone.</p>
				<div class="flex justify-end gap-3">
					<button onclick={() => deleteConfirmId = null} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
					<button onclick={() => deleteDefinition(deleteConfirmId)} class="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
				</div>
			</div>
		</div>
	{/if}
</div>
