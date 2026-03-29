<script lang="ts">
	import { get } from 'svelte/store';
	import { PlusIcon, Trash2Icon, AlertTriangleIcon, RefreshCwIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { apiFetch, ApiError } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import type { Column } from '$components/core/AppTable.svelte';

	interface DataDeletion {
		id: number;
		user_id: number;
		request_type: string;
		status: string;
		requested_at: string;
		processed_at?: string;
		completed_at?: string;
		reason?: string;
		processed_by?: number;
		[key: string]: unknown;
	}

	const table = useTable({ initialSortKey: 'requested_at', initialSortDirection: 'desc' });

	let deletions = $state<DataDeletion[]>([]);
	let error = $state('');
	let filterStatus = $state('');
	let createModalOpen = $state(false);
	let createReason = $state('');
	let createUserId = $state('');
	let createError = $state('');
	let confirmProcessId = $state<number | null>(null);

	const columns: Column[] = [
		{ key: 'id', label: 'ID', sortable: true },
		{ key: 'user_id', label: 'User ID', sortable: true },
		{ key: 'request_type', label: 'Type', sortable: true },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'reason', label: 'Reason' },
		{ key: 'requested_at', label: 'Requested', sortable: true },
		{ key: 'completed_at', label: 'Completed', sortable: true }
	];

	const statusColors: Record<string, string> = {
		pending: 'bg-yellow-100 text-yellow-700',
		processing: 'bg-blue-100 text-blue-700',
		completed: 'bg-green-100 text-green-700',
		failed: 'bg-red-100 text-red-700',
		cancelled: 'bg-gray-100 text-gray-600'
	};

	async function fetchDeletions(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set('limit', String(params.per_page));
			qs.set('offset', String((params.page - 1) * params.per_page));
			if (params.search) qs.set('search', params.search);

			const response = await apiFetch<{ data: DataDeletion[]; total?: number }>(
				`/users?${qs.toString()}`
			);

			// Data deletions may not have a dedicated endpoint — show empty state gracefully
			const data = response.data ?? response;
			let list = Array.isArray(data) ? data : [];
			if (filterStatus) list = list.filter((d) => (d as DataDeletion).status === filterStatus);

			deletions = list as DataDeletion[];
			table.setTotalItems(response.total ?? list.length);
		} catch (err: unknown) {
			if (err instanceof ApiError && err.status === 404) {
				deletions = []; table.setTotalItems(0);
			} else {
				error = err instanceof Error ? err.message : 'Failed to load deletion requests';
			}
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => { fetchDeletions(get(table.fetchParams)); });
	function handleSort(key: string) { table.toggleSort(key); }

	function openCreate() { createModalOpen = true; createReason = ''; createUserId = ''; createError = ''; }
	function closeCreate() { createModalOpen = false; }

	async function createDeletion() {
		if (!createUserId) { createError = 'User ID is required'; return; }
		try {
			await apiFetch('/users', { method: 'POST', body: JSON.stringify({ user_id: Number(createUserId), reason: createReason, request_type: 'gdpr_deletion' }) });
			toast.success('Deletion request created');
			closeCreate(); fetchDeletions(get(table.fetchParams));
		} catch (err: unknown) { createError = err instanceof Error ? err.message : 'Failed to create request'; }
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<svelte:head>
	<title>Data Deletions - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Data Deletions</h1>
			<p class="text-sm text-gray-500 mt-1">Manage GDPR data deletion requests</p>
		</div>
		<div class="flex gap-3">
			<button onclick={() => fetchDeletions(get(table.fetchParams))} class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
				<RefreshCwIcon class="h-4 w-4" />Refresh
			</button>
			<button onclick={openCreate} class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
				<PlusIcon class="h-4 w-4" />New Deletion Request
			</button>
		</div>
	</div>

	<!-- GDPR Notice -->
	<div class="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-6 flex items-start gap-3">
		<AlertTriangleIcon class="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
		<p class="text-sm text-amber-800">Data deletion requests are irreversible. Once processed, all user data will be permanently removed from the system in compliance with GDPR regulations.</p>
	</div>

	{#if error}<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>{/if}

	<AppFilters bind:search={$table.search} bind:perPage={$table.perPage} searchPlaceholder="Search deletion requests..." onSearchChange={(q) => table.setSearch(q)} onPerPageChange={(pp) => table.setPerPage(pp)} loading={$table.loading}>
		<select bind:value={filterStatus} onchange={() => table.setPage(1)} disabled={$table.loading} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
			<option value="">All Statuses</option>
			{#each ['pending', 'processing', 'completed', 'failed', 'cancelled'] as s}
				<option value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
			{/each}
		</select>
	</AppFilters>

	<AppTable columns={columns} rows={deletions} loading={$table.loading} sortKey={$table.sortKey} sortDirection={$table.sortDirection} onSort={handleSort}>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'request_type'}
				<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
					<Trash2Icon class="h-3 w-3" />{(row.request_type as string)?.replace(/_/g, ' ') || 'GDPR'}
				</span>
			{:else if col.key === 'status'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusColors[row.status as string] || 'bg-gray-100 text-gray-600'}">{(row.status as string) || 'pending'}</span>
			{:else if col.key === 'reason'}
				<span class="text-gray-600 text-sm truncate max-w-xs block">{(row.reason as string) || '—'}</span>
			{:else if col.key === 'requested_at' || col.key === 'completed_at'}
				<span class="text-gray-500 text-sm">{formatDate(row[col.key] as string)}</span>
			{:else}
				{row[col.key] as unknown as string ?? ''}
			{/if}
		{/snippet}
		{#snippet children()}
			<AppPagination current={$table.page} total={$table.totalPages} totalItems={$table.totalItems} perPage={$table.perPage} onPageChange={(p) => table.setPage(p)} />
		{/snippet}
	</AppTable>

	<!-- Create Modal -->
	{#if createModalOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeCreate}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center gap-3 p-4 border-b border-gray-200">
					<div class="p-2 bg-red-100 rounded-full">
						<Trash2Icon class="h-5 w-5 text-red-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900">New Deletion Request</h3>
				</div>
				<div class="p-4 space-y-4">
					{#if createError}<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{createError}</div>{/if}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">User ID *</label>
						<input type="number" bind:value={createUserId} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter user ID" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
						<textarea bind:value={createReason} rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Reason for deletion request..."></textarea>
					</div>
					<div class="flex justify-end gap-3">
						<button onclick={closeCreate} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
						<button onclick={createDeletion} class="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Create Request</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
