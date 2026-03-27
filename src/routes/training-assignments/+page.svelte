<script lang="ts">
	import { get } from 'svelte/store';
	import { RefreshCwIcon, PlayIcon, PauseIcon, CheckCircleIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { endpoints } from '$config/endpoints';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import type { Column } from '$components/core/AppTable.svelte';

	interface JourneyAssignment {
		id: number;
		user_id: number;
		journey_metadata_id: number;
		conversation_id?: number;
		status: string;
		current_step: number;
		total_steps: number;
		started_at?: string;
		completed_at?: string;
		last_interaction_at?: string;
		created_at: string;
		[key: string]: unknown;
	}

	const table = useTable({ initialSortKey: 'created_at', initialSortDirection: 'desc' });

	let assignments = $state<JourneyAssignment[]>([]);
	let error = $state('');
	let filterStatus = $state('');

	const columns: Column[] = [
		{ key: 'id', label: 'ID', sortable: true },
		{ key: 'user_id', label: 'User ID', sortable: true },
		{ key: 'journey_metadata_id', label: 'Journey', sortable: true },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'progress', label: 'Progress' },
		{ key: 'started_at', label: 'Started', sortable: true },
		{ key: 'completed_at', label: 'Completed', sortable: true }
	];

	const statusColors: Record<string, string> = {
		in_progress: 'bg-blue-100 text-blue-700',
		completed: 'bg-green-100 text-green-700',
		paused: 'bg-yellow-100 text-yellow-700',
		expired: 'bg-gray-100 text-gray-600',
		assigned: 'bg-purple-100 text-purple-700'
	};

	async function fetchAssignments(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set('limit', String(params.per_page));
			qs.set('offset', String((params.page - 1) * params.per_page));
			if (params.search) qs.set('search', params.search);

			const response = await apiFetch<Record<string, unknown>>(
				`${endpoints.journeyAssignments.list}?${qs.toString()}`
			);

			let list = (response as Record<string, unknown>).items ?? response.data ?? response;
			list = Array.isArray(list) ? list : [];
			if (filterStatus) list = (list as JourneyAssignment[]).filter((a) => a.status === filterStatus);

			assignments = list as JourneyAssignment[];
			table.setTotalItems((response as Record<string, unknown>).count as number ?? (response as Record<string, unknown>).total as number ?? list.length);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load assignments';
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => { fetchAssignments(get(table.fetchParams)); });
	function handleSort(key: string) { table.toggleSort(key); }

	async function completeAssignment(id: number) {
		try {
			await apiFetch(endpoints.journeyAssignments.complete(String(id)), { method: 'PUT' });
			toast.success('Assignment completed');
			fetchAssignments(get(table.fetchParams));
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Failed to complete assignment');
		}
	}

	async function pauseAssignment(id: number) {
		try {
			await apiFetch(endpoints.journeyAssignments.pause(String(id)), { method: 'PUT' });
			toast.success('Assignment paused');
			fetchAssignments(get(table.fetchParams));
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Failed to pause');
		}
	}

	async function resumeAssignment(id: number) {
		try {
			await apiFetch(endpoints.journeyAssignments.resume(String(id)), { method: 'PUT' });
			toast.success('Assignment resumed');
			fetchAssignments(get(table.fetchParams));
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Failed to resume');
		}
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<svelte:head>
	<title>Training Assignments - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Training Assignments</h1>
			<p class="text-sm text-gray-500 mt-1">Monitor journey assignments and progress</p>
		</div>
		<button onclick={() => fetchAssignments(get(table.fetchParams))} class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
			<RefreshCwIcon class="h-4 w-4" />Refresh
		</button>
	</div>

	{#if error}<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>{/if}

	<AppFilters bind:search={$table.search} bind:perPage={$table.perPage} searchPlaceholder="Search assignments..." onSearchChange={(q) => table.setSearch(q)} onPerPageChange={(pp) => table.setPerPage(pp)} loading={$table.loading}>
		<select bind:value={filterStatus} onchange={() => table.setPage(1)} disabled={$table.loading} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
			<option value="">All Statuses</option>
			{#each ['assigned', 'in_progress', 'paused', 'completed', 'expired'] as s}
				<option value={s}>{s.replace(/_/g, ' ')}</option>
			{/each}
		</select>
	</AppFilters>

	<AppTable columns={columns} rows={assignments} loading={$table.loading} sortKey={$table.sortKey} sortDirection={$table.sortDirection} onSort={handleSort}>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'status'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusColors[row.status as string] || 'bg-gray-100 text-gray-600'}">{(row.status as string).replace(/_/g, ' ')}</span>
			{:else if col.key === 'progress'}
				<div class="flex items-center gap-2">
					<div class="w-20 bg-gray-200 rounded-full h-1.5">
						<div class="bg-blue-600 h-1.5 rounded-full" style="width: {row.total_steps > 0 ? (row.current_step / row.total_steps) * 100 : 0}%"></div>
					</div>
					<span class="text-xs text-gray-500">{row.current_step}/{row.total_steps}</span>
				</div>
			{:else if col.key === 'started_at'}
				<span class="text-gray-500 text-sm">{formatDate(row.started_at as string)}</span>
			{:else if col.key === 'completed_at'}
				<span class="text-gray-500 text-sm">{formatDate(row.completed_at as string)}</span>
			{:else}
				{row[col.key] as unknown as string ?? ''}
			{/if}
		{/snippet}

		<!-- Action buttons in table footer area -->
		{#snippet children()}
			<AppPagination current={$table.page} total={$table.totalPages} totalItems={$table.totalItems} perPage={$table.perPage} onPageChange={(p) => table.setPage(p)} />
		{/snippet}
	</AppTable>
</div>
