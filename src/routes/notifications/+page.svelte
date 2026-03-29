<script lang="ts">
	import { get } from 'svelte/store';
	import { BellIcon, RefreshCwIcon, CheckIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { apiFetch, ApiError } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import { endpoints } from '$config/endpoints';
	import type { Column } from '$components/core/AppTable.svelte';

	interface Notification {
		id: number;
		type: string;
		title: string;
		message: string;
		is_read: boolean;
		severity?: string;
		created_at: string;
		[key: string]: unknown;
	}

	const table = useTable({ initialSortKey: 'created_at', initialSortDirection: 'desc' });

	let notifications = $state<Notification[]>([]);
	let error = $state('');
	let filterRead = $state('');
	let unreadCount = $state(0);

	const columns: Column[] = [
		{ key: 'is_read', label: '', sortable: true },
		{ key: 'type', label: 'Type' },
		{ key: 'title', label: 'Title' },
		{ key: 'message', label: 'Message' },
		{ key: 'severity', label: 'Severity' },
		{ key: 'created_at', label: 'Date', sortable: true }
	];

	const severityColors: Record<string, string> = {
		critical: 'bg-red-100 text-red-700',
		warning: 'bg-yellow-100 text-yellow-700',
		info: 'bg-blue-100 text-blue-700',
		success: 'bg-green-100 text-green-700'
	};

	async function fetchNotifications(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set('limit', String(params.per_page));
			qs.set('offset', String((params.page - 1) * params.per_page));
			if (params.search) qs.set('search', params.search);

			const response = await apiFetch<unknown>(
				`${endpoints.audit.list}?${qs.toString()}`
			);

			let raw = Array.isArray(response) ? response : ((response as Record<string, unknown>).data ?? []);
			raw = Array.isArray(raw) ? raw : [];
			let list = raw.map((item: Record<string, unknown>) => ({
				...item,
				type: item.action_type || item.type || 'system',
				title: (item.description as string)?.slice(0, 50) || item.title || 'Notification',
				message: item.description || item.message || '',
				is_read: item.reviewed ?? item.is_read ?? true,
				severity: item.severity || 'info'
			}));

			if (filterRead === 'unread') list = list.filter((n) => !n.is_read);
			if (filterRead === 'read') list = list.filter((n) => n.is_read);

			unreadCount = list.filter((n: Notification) => !n.is_read).length;
			notifications = list as Notification[];
			table.setTotalItems(Array.isArray(response) ? list.length : ((response as Record<string, unknown>).total as number ?? list.length));
		} catch (err: unknown) {
			if (err instanceof ApiError && err.status === 404) {
				notifications = []; table.setTotalItems(0);
			} else {
				error = err instanceof Error ? err.message : 'Failed to load notifications';
			}
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => { fetchNotifications(get(table.fetchParams)); });
	function handleSort(key: string) { table.toggleSort(key); }

	async function markAsRead(id: number) {
		try {
			const notif = notifications.find((n) => n.id === id);
			if (notif) { notif.is_read = true; unreadCount = Math.max(0, unreadCount - 1); }
		} catch {
			// No-op for now
		}
	}

	async function markAllRead() {
		notifications.forEach((n) => n.is_read = true);
		unreadCount = 0;
		toast.success('All notifications marked as read');
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<svelte:head>
	<title>Notifications - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Notifications</h1>
			<p class="text-sm text-gray-500 mt-1">View system notifications and alerts</p>
		</div>
		<div class="flex gap-3">
			{#if unreadCount > 0}
				<button onclick={markAllRead} class="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors">
					<CheckIcon class="h-4 w-4" />
					Mark All Read ({unreadCount})
				</button>
			{/if}
			<button onclick={() => fetchNotifications(get(table.fetchParams))} class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
				<RefreshCwIcon class="h-4 w-4" />Refresh
			</button>
		</div>
	</div>

	{#if error}<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>{/if}

	<AppFilters bind:search={$table.search} bind:perPage={$table.perPage} searchPlaceholder="Search notifications..." onSearchChange={(q) => table.setSearch(q)} onPerPageChange={(pp) => table.setPerPage(pp)} loading={$table.loading}>
		<select bind:value={filterRead} onchange={() => table.setPage(1)} disabled={$table.loading} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
			<option value="">All</option>
			<option value="unread">Unread</option>
			<option value="read">Read</option>
		</select>
	</AppFilters>

	<AppTable columns={columns} rows={notifications} loading={$table.loading} sortKey={$table.sortKey} sortDirection={$table.sortDirection} onSort={handleSort} onRowClick={(row) => markAsRead((row as Notification).id)}>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'is_read'}
				{#if !row.is_read}
					<div class="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
				{:else}
					<div class="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
				{/if}
			{:else if col.key === 'type'}
				<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
					<BellIcon class="h-3 w-3" />{(row.type as string) || 'system'}
				</span>
			{:else if col.key === 'title'}
				<span class="text-sm font-medium text-gray-900 {!row.is_read ? '' : 'opacity-60'}">{row.title as string}</span>
			{:else if col.key === 'message'}
				<span class="text-gray-600 text-sm truncate max-w-xs block">{(row.message as string)?.slice(0, 100)}</span>
			{:else if col.key === 'severity'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {severityColors[row.severity as string] || 'bg-gray-100 text-gray-600'}">{(row.severity as string) || 'info'}</span>
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
