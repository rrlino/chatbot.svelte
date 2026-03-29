<script lang="ts">
	import { UsersIcon, SearchIcon, XIcon } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state('');

	let filtered = $derived.by(() => {
		const q = search.toLowerCase().trim();
		if (!q) return data.users;
		return data.users.filter(
			(u) =>
				(u.name?.toLowerCase().includes(q) ?? false) ||
				(u.email?.toLowerCase().includes(q) ?? false)
		);
	});

	function roleLabel(status: string | null): string {
		if (status === 'registered') return 'Registered';
		if (status === 'guest') return 'Guest';
		return status ?? 'Guest';
	}

	function formatDate(d: string): string {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
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

	<!-- Search -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
		<div class="relative max-w-md">
			<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
			<input
				type="text"
				bind:value={search}
				placeholder="Search by name or email..."
				class="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			/>
			{#if search}
				<button
					onclick={() => (search = '')}
					class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
				>
					<XIcon class="h-4 w-4" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Table -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#if filtered.length === 0}
						<tr>
							<td colspan="5" class="px-4 py-12 text-center">
								<div class="flex flex-col items-center text-gray-500">
									<UsersIcon class="h-12 w-12 mb-3 text-gray-300" />
									<h3 class="text-lg font-medium text-gray-700 mb-1">No users found</h3>
									<p class="text-sm">
										{search ? 'Try adjusting your search.' : 'No users have been created yet.'}
									</p>
								</div>
							</td>
						</tr>
					{:else}
						{#each filtered as user (user.id)}
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

		{#if search}
			<div class="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
				Showing {filtered.length} of {data.users.length} users
			</div>
		{/if}
	</div>
</div>
