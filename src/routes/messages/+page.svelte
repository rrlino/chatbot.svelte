<script lang="ts">
	import { get } from 'svelte/store';
	import { RefreshCwIcon, MessageSquareIcon, ArrowUpIcon, ArrowDownIcon, AlertCircleIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { endpoints } from '$config/endpoints';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import type { Column } from '$components/core/AppTable.svelte';

	interface Message {
		id: number;
		conversation_id: number;
		direction: string;
		content: string;
		status: string;
		external_message_id?: string;
		sent_at?: string;
		delivered_at?: string;
		read_at?: string;
		retry_count: number;
		error_message?: string;
		created_at: string;
		[key: string]: unknown;
	}

	interface MessageStats {
		total: number;
		sent: number;
		delivered: number;
		read: number;
		failed: number;
		pending: number;
	}

	const table = useTable({ initialSortKey: 'created_at', initialSortDirection: 'desc' });

	let messages = $state<Message[]>([]);
	let error = $state('');
	let stats = $state<MessageStats | null>(null);
	let selectedMessage = $state<Message | null>(null);

	// Filters
	let filterStatus = $state('');
	let filterDirection = $state('');
	let filterPhone = $state('');

	const columns: Column[] = [
		{ key: 'id', label: 'ID', sortable: true },
		{ key: 'direction', label: 'Direction', sortable: true },
		{ key: 'content', label: 'Content' },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'created_at', label: 'Date', sortable: true },
		{ key: 'error_message', label: 'Error' }
	];

	async function fetchStats() {
		try {
			const response = await apiFetch<{ data: MessageStats }>(endpoints.messages.stats);
			stats = response.data ?? response;
		} catch {
			stats = null;
		}
	}

	async function fetchMessages(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set('limit', String(params.per_page));
			qs.set('offset', String((params.page - 1) * params.per_page));
			if (params.sort_by) qs.set('sort_by', params.sort_by);
			if (params.sort_direction) qs.set('sort_direction', params.sort_direction);
			if (filterStatus) qs.set('status', filterStatus);
			if (filterDirection) qs.set('direction', filterDirection);
			if (filterPhone) qs.set('phone', filterPhone);
			if (params.search) qs.set('search', params.search);

			const response = await apiFetch<{ data: Message[]; total?: number }>(
				`${endpoints.messages.list}?${qs.toString()}`
			);

			const data = response.data ?? response;
			messages = Array.isArray(data) ? data : [];
			table.setTotalItems(response.total ?? messages.length);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load messages';
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => {
		fetchStats();
	});

	$effect(() => {
		fetchMessages(get(table.fetchParams));
	});

	function handleSort(key: string) {
		table.toggleSort(key);
	}

	function handleRowClick(row: Record<string, unknown>) {
		selectedMessage = row as Message;
	}

	function closeDetail() {
		selectedMessage = null;
	}

	async function retryMessage(msg: Message) {
		try {
			await apiFetch(endpoints.messages.retry(String(msg.id)), { method: 'POST' });
			toast.success(`Message #${msg.id} retry queued`);
			fetchMessages(get(table.fetchParams));
			fetchStats();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Retry failed');
		}
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}

	const statusColors: Record<string, string> = {
		sent: 'bg-blue-100 text-blue-700',
		delivered: 'bg-green-100 text-green-700',
		read: 'bg-purple-100 text-purple-700',
		failed: 'bg-red-100 text-red-700',
		error: 'bg-red-100 text-red-700',
		processing: 'bg-yellow-100 text-yellow-700',
		queued: 'bg-gray-100 text-gray-600',
		received: 'bg-indigo-100 text-indigo-700'
	};

	const directionColors: Record<string, string> = {
		inbound: 'bg-cyan-100 text-cyan-700',
		outbound: 'bg-orange-100 text-orange-700'
	};
</script>

<svelte:head>
	<title>Messages - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Messages</h1>
			<p class="text-sm text-gray-500 mt-1">Monitor and manage all messages</p>
		</div>
		<button
			onclick={() => { fetchStats(); fetchMessages(get(table.fetchParams)); }}
			class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
		>
			<RefreshCwIcon class="h-4 w-4" />
			Refresh
		</button>
	</div>

	<!-- Stats Bar -->
	{#if stats}
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
			{#each [
				{ label: 'Total', value: stats.total, color: 'bg-gray-50' },
				{ label: 'Sent', value: stats.sent, color: 'bg-blue-50' },
				{ label: 'Delivered', value: stats.delivered, color: 'bg-green-50' },
				{ label: 'Read', value: stats.read, color: 'bg-purple-50' },
				{ label: 'Failed', value: stats.failed, color: 'bg-red-50' },
				{ label: 'Pending', value: stats.pending, color: 'bg-yellow-50' }
			] as stat}
				<div class="{stat.color} rounded-lg p-3">
					<p class="text-xs font-medium text-gray-500 uppercase">{stat.label}</p>
					<p class="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Error -->
	{#if error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
	{/if}

	<!-- Filters -->
	<AppFilters
		bind:search={$table.search}
		bind:perPage={$table.perPage}
		searchPlaceholder="Search messages..."
		onSearchChange={(q) => table.setSearch(q)}
		onPerPageChange={(pp) => table.setPerPage(pp)}
		loading={$table.loading}
	>
		<!-- Status filter -->
		<select
			bind:value={filterStatus}
			onchange={() => table.setPage(1)}
			disabled={$table.loading}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			<option value="">All Statuses</option>
			{#each ['sent', 'delivered', 'read', 'failed', 'error', 'processing', 'queued', 'received'] as s}
				<option value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
			{/each}
		</select>

		<!-- Direction filter -->
		<select
			bind:value={filterDirection}
			onchange={() => table.setPage(1)}
			disabled={$table.loading}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			<option value="">All Directions</option>
			<option value="inbound">Inbound</option>
			<option value="outbound">Outbound</option>
		</select>
	</AppFilters>

	<!-- Table -->
	<AppTable
		columns={columns}
		rows={messages}
		loading={$table.loading}
		sortKey={$table.sortKey}
		sortDirection={$table.sortDirection}
		onSort={handleSort}
		onRowClick={handleRowClick}
	>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'direction'}
				<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium {directionColors[row.direction as string] || 'bg-gray-100 text-gray-600'}">
					{#if row.direction === 'inbound'}
						<ArrowDownIcon class="h-3 w-3" />
					{:else}
						<ArrowUpIcon class="h-3 w-3" />
					{/if}
					{row.direction as string}
				</span>
			{:else if col.key === 'content'}
				<span class="text-gray-700 truncate max-w-xs block text-sm">{(row.content as string)?.slice(0, 80)}{(row.content as string)?.length > 80 ? '...' : ''}</span>
			{:else if col.key === 'status'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusColors[row.status as string] || 'bg-gray-100 text-gray-600'}">
					{row.status as string}
				</span>
			{:else if col.key === 'created_at'}
				<span class="text-gray-500 text-sm">{formatDate(row.created_at as string)}</span>
			{:else if col.key === 'error_message'}
				{#if row.error_message}
					<span class="text-red-600 text-xs truncate max-w-[200px] block" title={row.error_message as string}>{row.error_message as string}</span>
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

	<!-- Message Detail Modal -->
	{#if selectedMessage}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeDetail}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
					<h3 class="text-lg font-semibold text-gray-900">Message #{selectedMessage.id}</h3>
					<button onclick={closeDetail} class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
				</div>
				<div class="p-4 space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="text-xs font-medium text-gray-500 uppercase">Direction</label>
							<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ml-2 {directionColors[selectedMessage.direction] || ''}">
								{selectedMessage.direction}
							</span>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-500 uppercase">Status</label>
							<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2 {statusColors[selectedMessage.status] || ''}">
								{selectedMessage.status}
							</span>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-500 uppercase">Conversation</label>
							<p class="text-sm text-gray-900 mt-0.5">#{selectedMessage.conversation_id}</p>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-500 uppercase">Retry Count</label>
							<p class="text-sm text-gray-900 mt-0.5">{selectedMessage.retry_count}</p>
						</div>
					</div>

					<div>
						<label class="text-xs font-medium text-gray-500 uppercase">Content</label>
						<div class="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-800 whitespace-pre-wrap">{selectedMessage.content}</div>
					</div>

					<div class="grid grid-cols-3 gap-4">
						<div>
							<label class="text-xs font-medium text-gray-500 uppercase">Created</label>
							<p class="text-sm text-gray-700 mt-0.5">{formatDate(selectedMessage.created_at)}</p>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-500 uppercase">Sent</label>
							<p class="text-sm text-gray-700 mt-0.5">{selectedMessage.sent_at ? formatDate(selectedMessage.sent_at) : '—'}</p>
						</div>
						<div>
							<label class="text-xs font-medium text-gray-500 uppercase">Delivered</label>
							<p class="text-sm text-gray-700 mt-0.5">{selectedMessage.delivered_at ? formatDate(selectedMessage.delivered_at) : '—'}</p>
						</div>
					</div>

					{#if selectedMessage.error_message}
						<div class="p-3 bg-red-50 border border-red-200 rounded-lg">
							<div class="flex items-center gap-2 text-red-700">
								<AlertCircleIcon class="h-4 w-4" />
								<span class="text-xs font-medium uppercase">Error</span>
							</div>
							<p class="text-sm text-red-700 mt-1">{selectedMessage.error_message}</p>
						</div>
					{/if}

					{#if selectedMessage.status === 'failed' || selectedMessage.status === 'error'}
						<button
							onclick={() => retryMessage(selectedMessage)}
							class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
						>
							<MessageSquareIcon class="h-4 w-4" />
							Retry Message
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
