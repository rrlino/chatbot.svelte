<script lang="ts">
	import {
		ShieldCheckIcon,
		SearchIcon,
		DownloadIcon,
		XCircleIcon,
		RefreshCwIcon
	} from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	interface DeletionRequest {
		id: number;
		confirmation_code: string;
		app_scoped_user_id: string | null;
		status: string;
		created_at: string;
		processed_at: string | null;
	}

	let searchTerm = $state('');
	let statusFilter = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');
	let currentPage = $state(1);
	let refreshing = $state(false);
	const itemsPerPage = 20;

	const statusColors: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-700',
		processing: 'bg-blue-100 text-blue-700',
		completed: 'bg-green-100 text-green-700',
		failed: 'bg-red-100 text-red-700'
	};

	let filteredRequests = $derived(() => {
		let filtered = data.deletionRequests as DeletionRequest[];

		if (searchTerm) {
			const q = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(r) =>
					r.confirmation_code?.toLowerCase().includes(q) ||
					(r.app_scoped_user_id || '').toLowerCase().includes(q)
			);
		}

		if (statusFilter) {
			filtered = filtered.filter((r) => r.status === statusFilter);
		}

		if (dateFrom) {
			const from = new Date(dateFrom);
			filtered = filtered.filter((r) => new Date(r.created_at) >= from);
		}

		if (dateTo) {
			const to = new Date(dateTo);
			to.setHours(23, 59, 59, 999);
			filtered = filtered.filter((r) => new Date(r.created_at) <= to);
		}

		return filtered;
	});

	let totalPages = $derived(Math.ceil(filteredRequests().length / itemsPerPage));

	let paginatedRequests = $derived(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredRequests().slice(start, start + itemsPerPage);
	});

	let visiblePages = $derived(() => {
		const pages: number[] = [];
		const start = Math.max(1, currentPage - 2);
		const end = Math.min(totalPages, currentPage + 2);
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	});

	const activeFilterCount = $derived(
		(statusFilter ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)
	);

	function formatDate(d: string | null): string {
		if (!d) return '-';
		return new Date(d).toLocaleString();
	}

	function clearFilters() {
		statusFilter = '';
		dateFrom = '';
		dateTo = '';
		searchTerm = '';
		currentPage = 1;
	}

	async function refreshData() {
		refreshing = true;
		await invalidateAll();
		refreshing = false;
	}

	function exportToCSV() {
		const headers = ['Confirmation Code', 'User ID', 'Status', 'Created At', 'Processed At'];
		const rows = filteredRequests().map((r) => [
			r.confirmation_code,
			r.app_scoped_user_id || '',
			r.status,
			formatDate(r.created_at),
			r.processed_at ? formatDate(r.processed_at) : ''
		]);

		const csvContent = [
			headers.join(','),
			...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `data_deletions_${new Date().toISOString().split('T')[0]}.csv`;
		link.click();
	}
</script>

<svelte:head>
	<title>Data Deletions - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
				<ShieldCheckIcon class="h-7 w-7 text-blue-600" />
				Data Deletions
			</h1>
			<p class="text-sm text-gray-500 mt-1">
				Facebook/Meta data deletion request compliance
			</p>
		</div>
		<div class="flex items-center gap-3">
			<div class="text-sm text-gray-500 flex items-center gap-2">
				<span class="font-semibold text-gray-700">{filteredRequests().length}</span>
				requests
			</div>
			<button
				onclick={refreshData}
				disabled={refreshing}
				class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
			>
				<RefreshCwIcon class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
			</button>
		</div>
	</div>

	<!-- Filters -->
	<div class="bg-white rounded-lg border border-gray-200 p-4 mb-4">
		<div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
			<div>
				<label class="block text-xs font-medium text-gray-500 mb-1">Search</label>
				<div class="relative">
					<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						type="text"
						bind:value={searchTerm}
						placeholder="Code or User ID..."
						class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
			</div>
			<div>
				<label class="block text-xs font-medium text-gray-500 mb-1">Status</label>
				<select
					bind:value={statusFilter}
					class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">All Statuses</option>
					<option value="pending">Pending</option>
					<option value="processing">Processing</option>
					<option value="completed">Completed</option>
					<option value="failed">Failed</option>
				</select>
			</div>
			<div>
				<label class="block text-xs font-medium text-gray-500 mb-1">Date From</label>
				<input
					type="date"
					bind:value={dateFrom}
					class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<div>
				<label class="block text-xs font-medium text-gray-500 mb-1">Date To</label>
				<input
					type="date"
					bind:value={dateTo}
					class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<div class="flex items-end gap-2">
				<button
					onclick={exportToCSV}
					class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
				>
					<DownloadIcon class="h-4 w-4" />
					Export
				</button>
				{#if activeFilterCount > 0}
					<button
						onclick={clearFilters}
						class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
					>
						<XCircleIcon class="h-4 w-4" />
						Clear ({activeFilterCount})
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg border border-gray-200">
		{#if paginatedRequests().length === 0}
			<div class="p-12 flex flex-col items-center text-gray-500">
				<ShieldCheckIcon class="h-12 w-12 mb-3 text-gray-300" />
				<h3 class="text-lg font-medium text-gray-700 mb-1">No deletion requests</h3>
				<p class="text-sm">Data deletion requests from Facebook/Meta will appear here.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-gray-50">
						<tr>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Confirmation Code</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User ID</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Processed</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each paginatedRequests() as request (request.id)}
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="px-4 py-3">
									<code class="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
										{request.confirmation_code}
									</code>
								</td>
								<td class="px-4 py-3 text-gray-600">
									{request.app_scoped_user_id || '-'}
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize {statusColors[request.status] || 'bg-gray-100 text-gray-600'}">
										{request.status}
									</span>
								</td>
								<td class="px-4 py-3 text-gray-500 text-xs">
									{formatDate(request.created_at)}
								</td>
								<td class="px-4 py-3 text-gray-500 text-xs">
									{formatDate(request.processed_at)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="flex items-center justify-center gap-1 p-4 border-t border-gray-200">
					<button
						onclick={() => (currentPage = 1)}
						disabled={currentPage === 1}
						class="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
					>
						&laquo;
					</button>
					<button
						onclick={() => currentPage--}
						disabled={currentPage === 1}
						class="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
					>
						&lsaquo;
					</button>
					{#each visiblePages as page}
						<button
							onclick={() => (currentPage = page)}
							class="px-3 py-1 text-sm rounded {currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}"
						>
							{page}
						</button>
					{/each}
					<button
						onclick={() => currentPage++}
						disabled={currentPage === totalPages}
						class="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
					>
						&rsaquo;
					</button>
					<button
						onclick={() => (currentPage = totalPages)}
						disabled={currentPage === totalPages}
						class="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
					>
						&raquo;
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
