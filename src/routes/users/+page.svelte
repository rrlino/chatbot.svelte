<script lang="ts">
	import { goto } from '$app/navigation';
	import { UsersIcon } from 'lucide-svelte';
	import AppFilters from '$lib/components/core/AppFilters.svelte';
	import AppPagination from '$lib/components/core/AppPagination.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state(data.search);
	let perPage = $state(data.perPage);
	let statusFilter = $state(data.statusFilter);
	let loading = $state(false);

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / perPage)));

	function roleLabel(status: string | null): string {
		if (status === 'registered') return 'Registered';
		if (status === 'guest') return 'Guest';
		return status ?? 'Guest';
	}

	function formatDate(d: string | null): string {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function buildUrl(params: Record<string, string | number | boolean>): string {
		const sp = new URLSearchParams();
		for (const [k, v] of Object.entries(params)) {
			if (v !== '' && v !== 0 && v !== false) sp.set(k, String(v));
		}
		const qs = sp.toString();
		return `/users${qs ? `?${qs}` : ''}`;
	}

	async function navigate(params: Record<string, string | number | boolean>) {
		loading = true;
		await goto(buildUrl(params));
		loading = false;
	}

	function handleSearchChange(query: string) {
		search = query;
		navigate({ page: 1, perPage, search: query, status: statusFilter });
	}

	function handlePerPageChange(newPerPage: number) {
		perPage = newPerPage;
		navigate({ page: 1, perPage: newPerPage, search, status: statusFilter });
	}

	function handlePageChange(pageNum: number) {
		navigate({ page: pageNum, perPage, search, status: statusFilter });
	}

	function handleStatusChange(e: Event) {
		statusFilter = (e.target as HTMLSelectElement).value;
		navigate({ page: 1, perPage, search, status: statusFilter });
	}
</script>

<svelte:head>
	<title>Users - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Users</h1>
			<p class="text-sm text-gray-500 mt-1">
				Manage user accounts
				<span class="ml-2 text-gray-400">{data.total} total</span>
			</p>
		</div>
	</div>

	<!-- Filters -->
	<AppFilters
		bind:search
		bind:perPage
		searchPlaceholder="Search by name or email..."
		{loading}
		onSearchChange={handleSearchChange}
		onPerPageChange={handlePerPageChange}
	>
		<!-- Status filter -->
		<select
			value={statusFilter}
			onchange={handleStatusChange}
			disabled={loading}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
		>
			<option value="">All Status</option>
			<option value="registered">Registered</option>
			<option value="guest">Guest</option>
		</select>
	</AppFilters>

	<!-- Table -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
		{#if data.users.length === 0 && !loading}
			<div class="p-12">
				<div class="flex flex-col items-center text-gray-500">
					<UsersIcon class="h-12 w-12 mb-3 text-gray-300" />
					<h3 class="text-lg font-medium text-gray-700 mb-1">No users found</h3>
					<p class="text-sm">
						{search ? 'Try adjusting your search.' : 'No users have been created yet.'}
					</p>
				</div>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#if loading}
							<tr>
								<td colspan="5" class="px-4 py-12 text-center text-gray-500">
									<div class="flex items-center justify-center gap-2">
										<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
										<span>Loading...</span>
									</div>
								</td>
							</tr>
						{:else}
							{#each data.users as user (user.id)}
								<tr class="hover:bg-gray-50 transition-colors">
									<td class="px-4 py-3">
										<span class="text-sm font-medium text-gray-900">
											{user.name || 'Unknown User'}
										</span>
									</td>
									<td class="px-4 py-3 text-sm text-gray-500">
										{user.email || '—'}
									</td>
									<td class="px-4 py-3">
										<span
											class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
											{user.status === 'registered' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}"
										>
											{roleLabel(user.status)}
										</span>
									</td>
									<td class="px-4 py-3">
										<span
											class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
											{user.chatbot_paused ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}"
										>
											{user.chatbot_paused ? 'Paused' : 'Active'}
										</span>
									</td>
									<td class="px-4 py-3 text-sm text-gray-500">
										{formatDate(user.created_at)}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if data.total > 0}
				<AppPagination
					current={data.page}
					total={totalPages}
					totalItems={data.total}
					{perPage}
					onPageChange={handlePageChange}
				/>
			{/if}
		{/if}
	</div>
</div>
