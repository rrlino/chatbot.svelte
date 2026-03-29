<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { RefreshCwIcon, MessageSquareIcon, ArrowUpIcon, ArrowDownIcon, AlertCircleIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters } from '$components/core';
	import { toast } from '$lib/stores/toast';
	import type { Column } from '$components/core/AppTable.svelte';
	import type { PageData } from './$types';

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

	let { data }: { data: PageData } = $props();

	let selectedMessage = $state<Message | null>(null);
	let loading = $state(false);

	// Filter state synced from URL via server data
	let searchValue = $state(data.filters.search);
	let perPageValue = $state(data.filters.perPage);
	let filterStatus = $state(data.filters.status);
	let filterDirection = $state(data.filters.direction);

	// Sync local state when server data updates (after navigation)
	$effect(() => {
		searchValue = data.filters.search;
		perPageValue = data.filters.perPage;
		filterStatus = data.filters.status;
		filterDirection = data.filters.direction;
	});

	// Handle form action results
	$effect(() => {
		const formResult = page.form;
		if (formResult?.success && formResult.action === 'retry') {
			toast.success('Message retry queued');
			invalidateAll();
		}
		if (formResult?.error) {
			toast.error(formResult.error as string);
		}
	});

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.filters.perPage)));

	const columns: Column[] = [
		{ key: 'id', label: 'ID', sortable: true },
		{ key: 'direction', label: 'Direction', sortable: true },
		{ key: 'content', label: 'Content' },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'created_at', label: 'Date', sortable: true },
		{ key: 'error_message', label: 'Error' }
	];

	function buildUrl(overrides: Record<string, string | number> = {}): string {
		const params: Record<string, string | number> = {
			page: data.filters.page,
			per_page: data.filters.perPage,
			sort_by: data.filters.sortBy,
			sort_direction: data.filters.sortDirection
		};
		if (data.filters.status) params.status = data.filters.status;
		if (data.filters.direction) params.direction = data.filters.direction;
		if (data.filters.search) params.search = data.filters.search;

		Object.assign(params, overrides);

		const qs = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value !== '' && value !== 0) qs.set(key, String(value));
		}
		return `/messages?${qs.toString()}`;
	}

	async function navigateTo(overrides: Record<string, string | number> = {}) {
		loading = true;
		await goto(buildUrl(overrides));
		loading = false;
	}

	function handleSort(key: string) {
		const currentKey = data.filters.sortBy;
		const currentDir = data.filters.sortDirection;
		const newDir = currentKey === key && currentDir === 'desc' ? 'asc' : 'desc';
		navigateTo({ sort_by: key, sort_direction: newDir, page: 1 });
	}

	function handlePageChange(p: number) {
		navigateTo({ page: p });
	}

	function handleSearchChange(q: string) {
		navigateTo({ search: q, page: 1 });
	}

	function handlePerPageChange(pp: number) {
		navigateTo({ per_page: pp, page: 1 });
	}

	function handleRowClick(row: Record<string, unknown>) {
		selectedMessage = row as Message;
	}

	function closeDetail() {
		selectedMessage = null;
	}

	async function refreshData() {
		loading = true;
		await invalidateAll();
		loading = false;
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
			onclick={refreshData}
			disabled={loading}
			class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
		>
			<RefreshCwIcon class="h-4 w-4" />
			Refresh
		</button>
	</div>

	<!-- Stats Bar -->
	{#if data.stats}
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
			{#each [
				{ label: 'Total', value: data.stats.total, color: 'bg-gray-50' },
				{ label: 'Sent', value: data.stats.sent, color: 'bg-blue-50' },
				{ label: 'Delivered', value: data.stats.delivered, color: 'bg-green-50' },
				{ label: 'Read', value: data.stats.read, color: 'bg-purple-50' },
				{ label: 'Failed', value: data.stats.failed, color: 'bg-red-50' },
				{ label: 'Pending', value: data.stats.pending, color: 'bg-yellow-50' }
			] as stat}
				<div class="{stat.color} rounded-lg p-3">
					<p class="text-xs font-medium text-gray-500 uppercase">{stat.label}</p>
					<p class="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Error -->
	{#if data.error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{data.error}</div>
	{/if}

	<!-- Filters -->
	<AppFilters
		bind:search={searchValue}
		bind:perPage={perPageValue}
		searchPlaceholder="Search messages..."
		onSearchChange={(q) => handleSearchChange(q)}
		onPerPageChange={(pp) => handlePerPageChange(pp)}
		{loading}
	>
		<!-- Status filter -->
		<select
			bind:value={filterStatus}
			onchange={() => navigateTo({ status: filterStatus, page: 1 })}
			disabled={loading}
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
			onchange={() => navigateTo({ direction: filterDirection, page: 1 })}
			disabled={loading}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			<option value="">All Directions</option>
			<option value="inbound">Inbound</option>
			<option value="outbound">Outbound</option>
		</select>
	</AppFilters>

	<!-- Table -->
	<AppTable
		{columns}
		rows={data.messages}
		{loading}
		sortKey={data.filters.sortBy}
		sortDirection={data.filters.sortDirection as 'asc' | 'desc'}
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
					<span class="text-gray-300">&mdash;</span>
				{/if}
			{:else}
				{row[col.key] as unknown as string ?? ''}
			{/if}
		{/snippet}

		<AppPagination
			current={data.filters.page}
			total={totalPages}
			totalItems={data.total}
			perPage={data.filters.perPage}
			onPageChange={handlePageChange}
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
						<form
							method="POST"
							action="?/retry"
							use:enhance={() => {
								return ({ update }) => {
									update({ reset: false });
									closeDetail();
								};
							}}
						>
							<input type="hidden" name="id" value={selectedMessage.id} />
							<button
								type="submit"
								class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
							>
								<MessageSquareIcon class="h-4 w-4" />
								Retry Message
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
