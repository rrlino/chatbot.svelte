<script lang="ts">
	import { get } from 'svelte/store';
	import { PlusIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { endpoints } from '$config/endpoints';
	import { apiFetch } from '$utils/api';
	import ChatbotModal from '$components/chatbots/ChatbotModal.svelte';
	import type { Column } from '$components/core/AppTable.svelte';

	interface Chatbot {
		id: number;
		name: string;
		description: string;
		status: string;
		created_at: string;
		updated_at: string;
		[key: string]: unknown;
	}

	const table = useTable({ initialSortKey: 'name', initialSortDirection: 'asc' });

	let chatbots = $state<Chatbot[]>([]);
	let modalOpen = $state(false);
	let editingChatbot = $state<Chatbot | null>(null);
	let error = $state('');

	const columns: Column[] = [
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'description', label: 'Description' },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'created_at', label: 'Created', sortable: true }
	];

	async function fetchChatbots(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set('page', String(params.page));
			qs.set('per_page', String(params.per_page));
			if (params.sort_by) qs.set('sort_by', params.sort_by);
			if (params.sort_direction) qs.set('sort_direction', params.sort_direction);
			if (params.search) qs.set('search', params.search);

			const response = await apiFetch<{ data: Chatbot[]; meta?: { total?: number } }>(
				`${endpoints.chatbots.list}?${qs.toString()}`
			);

			const data = response.data ?? response;
			chatbots = Array.isArray(data) ? data : [];
			table.setTotalItems(response.meta?.total ?? chatbots.length);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load chatbots';
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => {
		fetchChatbots(get(table.fetchParams));
	});

	function handleSort(key: string) {
		table.toggleSort(key);
	}

	function handleEdit(chatbot: Record<string, unknown>) {
		editingChatbot = chatbot as Chatbot;
		modalOpen = true;
	}

	function handleCreate() {
		editingChatbot = null;
		modalOpen = true;
	}

	function handleModalClose() {
		modalOpen = false;
		editingChatbot = null;
	}

	function handleModalSave() {
		handleModalClose();
		fetchChatbots(get(table.fetchParams));
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Chatbots - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Chatbots</h1>
			<p class="text-sm text-gray-500 mt-1">Manage your chatbot instances</p>
		</div>
		<button
			onclick={handleCreate}
			class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
		>
			<PlusIcon class="h-4 w-4" />
			Create Chatbot
		</button>
	</div>

	<!-- Error -->
	{#if error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
			{error}
		</div>
	{/if}

	<!-- Filters -->
	<AppFilters
		bind:search={$table.search}
		bind:perPage={$table.perPage}
		searchPlaceholder="Search chatbots..."
		onSearchChange={(q) => table.setSearch(q)}
		onPerPageChange={(pp) => table.setPerPage(pp)}
		loading={$table.loading}
	/>

	<!-- Table -->
	<AppTable
		columns={columns}
		rows={chatbots}
		loading={$table.loading}
		sortKey={$table.sortKey}
		sortDirection={$table.sortDirection}
		onSort={handleSort}
		onRowClick={handleEdit}
	>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'name'}
				<span class="font-medium text-gray-900">{row.name as string}</span>
			{:else if col.key === 'description'}
				<span class="text-gray-500 truncate max-w-xs block">{(row.description as string) || '—'}</span>
			{:else if col.key === 'status'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
					{row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
					{row.status as string}
				</span>
			{:else if col.key === 'created_at'}
				<span class="text-gray-500">{formatDate(row.created_at as string)}</span>
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

	<ChatbotModal
		bind:open={modalOpen}
		mode={editingChatbot ? 'edit' : 'create'}
		chatbot={editingChatbot}
		onSave={handleModalSave}
		onClose={handleModalClose}
	/>
</div>
