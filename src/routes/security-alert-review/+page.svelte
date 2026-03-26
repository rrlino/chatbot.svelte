<script lang="ts">
	import { get } from 'svelte/store';
	import { RefreshCwIcon, ShieldAlertIcon, ShieldCheckIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { endpoints } from '$config/endpoints';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import type { Column } from '$components/core/AppTable.svelte';

	interface SecurityEvent {
		id: number;
		event_type: string;
		severity: string;
		description: string;
		source_ip?: string;
		user_agent?: string;
		entity_type?: string;
		entity_id?: number;
		reviewed: boolean;
		reviewed_by?: number;
		reviewed_at?: string;
		created_at: string;
		[key: string]: unknown;
	}

	interface SecurityStatus {
		status: string;
		recent_alerts: number;
		unreviewed_alerts: number;
		last_check?: string;
		[key: string]: unknown;
	}

	const table = useTable({ initialSortKey: 'created_at', initialSortDirection: 'desc' });

	let events = $state<SecurityEvent[]>([]);
	let securityStatus = $state<SecurityStatus | null>(null);
	let error = $state('');
	let filterSeverity = $state('');
	let filterReviewed = $state('');

	const columns: Column[] = [
		{ key: 'severity', label: 'Severity', sortable: true },
		{ key: 'event_type', label: 'Type', sortable: true },
		{ key: 'description', label: 'Description' },
		{ key: 'source_ip', label: 'Source IP' },
		{ key: 'reviewed', label: 'Status' },
		{ key: 'created_at', label: 'Date', sortable: true }
	];

	const severityColors: Record<string, string> = {
		critical: 'bg-red-100 text-red-700 border-red-300',
		high: 'bg-orange-100 text-orange-700 border-orange-300',
		medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
		low: 'bg-blue-100 text-blue-700 border-blue-300',
		info: 'bg-gray-100 text-gray-600 border-gray-300'
	};

	async function fetchSecurityStatus() {
		try {
			const response = await apiFetch<{ data: SecurityStatus }>(endpoints.security.status);
			securityStatus = response.data ?? response;
		} catch { securityStatus = null; }
	}

	async function fetchEvents(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set('limit', String(params.per_page));
			qs.set('offset', String((params.page - 1) * params.per_page));
			if (params.search) qs.set('search', params.search);

			const response = await apiFetch<{ data: SecurityEvent[]; total?: number }>(
				`/audit?${qs.toString()}`
			);

			let data = response.data ?? response;
			let list = Array.isArray(data) ? data : [];
			if (filterSeverity) list = list.filter((e) => e.severity === filterSeverity);
			if (filterReviewed === 'reviewed') list = list.filter((e) => e.reviewed);
			if (filterReviewed === 'unreviewed') list = list.filter((e) => !e.reviewed);

			events = list;
			table.setTotalItems(response.total ?? list.length);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load security events';
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => { fetchSecurityStatus(); });
	$effect(() => { fetchEvents(get(table.fetchParams)); });

	function handleSort(key: string) { table.toggleSort(key); }

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<svelte:head>
	<title>Security Alert Review - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Security Alert Review</h1>
			<p class="text-sm text-gray-500 mt-1">Monitor and review security events</p>
		</div>
		<button onclick={() => { fetchSecurityStatus(); fetchEvents(get(table.fetchParams)); }} class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
			<RefreshCwIcon class="h-4 w-4" />Refresh
		</button>
	</div>

	<!-- Security Status Summary -->
	{#if securityStatus}
		<div class="grid grid-cols-3 gap-4 mb-6">
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-full {securityStatus.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}">
						{#if securityStatus.status === 'healthy'}
							<ShieldCheckIcon class="h-5 w-5 text-green-600" />
						{:else}
							<ShieldAlertIcon class="h-5 w-5 text-red-600" />
						{/if}
					</div>
					<div>
						<p class="text-xs font-medium text-gray-500 uppercase">System Status</p>
						<p class="text-lg font-bold capitalize {securityStatus.status === 'healthy' ? 'text-green-700' : 'text-red-700'}">{securityStatus.status}</p>
					</div>
				</div>
			</div>
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<p class="text-xs font-medium text-gray-500 uppercase">Recent Alerts</p>
				<p class="text-lg font-bold text-gray-900">{securityStatus.recent_alerts ?? 0}</p>
			</div>
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<p class="text-xs font-medium text-gray-500 uppercase">Unreviewed</p>
				<p class="text-lg font-bold text-orange-600">{securityStatus.unreviewed_alerts ?? 0}</p>
			</div>
		</div>
	{/if}

	{#if error}<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>{/if}

	<AppFilters bind:search={$table.search} bind:perPage={$table.perPage} searchPlaceholder="Search events..." onSearchChange={(q) => table.setSearch(q)} onPerPageChange={(pp) => table.setPerPage(pp)} loading={$table.loading}>
		<select bind:value={filterSeverity} onchange={() => table.setPage(1)} disabled={$table.loading} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
			<option value="">All Severities</option>
			{#each ['critical', 'high', 'medium', 'low', 'info'] as s}
				<option value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
			{/each}
		</select>
		<select bind:value={filterReviewed} onchange={() => table.setPage(1)} disabled={$table.loading} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
			<option value="">All</option>
			<option value="reviewed">Reviewed</option>
			<option value="unreviewed">Unreviewed</option>
		</select>
	</AppFilters>

	<AppTable columns={columns} rows={events} loading={$table.loading} sortKey={$table.sortKey} sortDirection={$table.sortDirection} onSort={handleSort}>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'severity'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border {severityColors[row.severity as string] || 'bg-gray-100 text-gray-600'}">
					{(row.severity as string)?.toUpperCase() || 'INFO'}
				</span>
			{:else if col.key === 'description'}
				<span class="text-gray-700 text-sm truncate max-w-xs block">{row.description as string}</span>
			{:else if col.key === 'reviewed'}
				{#if row.reviewed}
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Reviewed</span>
				{:else}
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Pending</span>
				{/if}
			{:else if col.key === 'created_at'}
				<span class="text-gray-500 text-sm">{formatDate(row.created_at as string)}</span>
			{:else}
				{row[col.key] as unknown as string ?? ''}
			{/if}
		{/snippet}
		{#snippet children()}
			<AppPagination current={$table.page} total={$table.totalPages} totalItems={$table.totalItems} perPage={$table.perPage} onPageChange={(p) => table.setPage(p)} />
		{/snippet}
	</AppTable>
</div>
