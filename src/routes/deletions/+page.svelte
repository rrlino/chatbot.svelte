<script lang="ts">
	import { ShieldCheckIcon, RefreshCwIcon, CheckIcon, XIcon } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	interface DeletionRequest {
		id: number;
		user_name: string;
		status: string;
		created_at: string;
	}

	type ActionData = {
		error?: string;
		success?: boolean;
		action?: string;
	} | null;

	let refreshing = $state(false);

	const statusColors: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-700',
		approved: 'bg-green-100 text-green-700',
		rejected: 'bg-red-100 text-red-700',
		completed: 'bg-green-100 text-green-700',
		failed: 'bg-red-100 text-red-700'
	};

	function formatDate(d: string): string {
		return new Date(d).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function refreshData() {
		refreshing = true;
		await invalidateAll();
		refreshing = false;
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
			<p class="text-sm text-gray-500 mt-1">Review and manage data deletion requests</p>
		</div>
		<button
			onclick={refreshData}
			disabled={refreshing}
			class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
		>
			<RefreshCwIcon class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
		</button>
	</div>

	<!-- Form action feedback -->
	{#if form?.error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
			{form.error}
		</div>
	{:else if form?.success}
		<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
			Request {form.action}d successfully.
		</div>
	{/if}

	<!-- Table -->
	<div class="bg-white rounded-lg border border-gray-200">
		{#if data.deletionRequests.length === 0}
			<div class="p-12 flex flex-col items-center text-gray-500">
				<ShieldCheckIcon class="h-12 w-12 mb-3 text-gray-300" />
				<h3 class="text-lg font-medium text-gray-700 mb-1">No deletion requests</h3>
				<p class="text-sm">Data deletion requests will appear here.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-gray-50">
						<tr>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User Name</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Requested Date</th>
							<th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each data.deletionRequests as request (request.id)}
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="px-4 py-3 font-medium text-gray-900">
									{request.user_name}
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize {statusColors[request.status] || 'bg-gray-100 text-gray-600'}">
										{request.status}
									</span>
								</td>
								<td class="px-4 py-3 text-gray-500 text-xs">
									{formatDate(request.created_at)}
								</td>
								<td class="px-4 py-3">
									{#if request.status === 'pending'}
										<div class="flex items-center justify-end gap-1">
											<form method="POST" action="?/approve">
												<input type="hidden" name="id" value={request.id} />
												<button
													type="submit"
													class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
												>
													<CheckIcon class="h-3.5 w-3.5" />
													Approve
												</button>
											</form>
											<form method="POST" action="?/reject">
												<input type="hidden" name="id" value={request.id} />
												<button
													type="submit"
													class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
												>
													<XIcon class="h-3.5 w-3.5" />
													Reject
												</button>
											</form>
										</div>
									{:else}
										<span class="text-xs text-gray-400">-</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
