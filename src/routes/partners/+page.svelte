<script lang="ts">
	import type { PageData } from './$types';
	import { Users, Search, Building2, Mail, CheckCircle2, XCircle, Clock } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let searchTerm = $state('');

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function statusBadge(status: string): string {
		if (status === 'active') return 'bg-green-100 text-green-700';
		if (status === 'inactive') return 'bg-gray-100 text-gray-600';
		if (status === 'suspended') return 'bg-red-100 text-red-700';
		return 'bg-yellow-100 text-yellow-700';
	}

	function partnerName(p: { name?: string; company_name?: string }): string {
		return p.company_name || p.name || 'Unknown';
	}

	function partnerEmail(p: { email?: string; contact_email?: string }): string {
		return p.contact_email || p.email || '—';
	}

	let filteredPartners = $derived(() => {
		if (!searchTerm) return data.partners;
		const term = searchTerm.toLowerCase();
		return data.partners.filter(
			(p) =>
				partnerName(p).toLowerCase().includes(term) ||
				partnerEmail(p).toLowerCase().includes(term) ||
				p.status.toLowerCase().includes(term)
		);
	});
</script>

<svelte:head>
	<title>Partners - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
				<Users class="h-7 w-7" />
				Partner Management
			</h1>
			<p class="text-sm text-gray-500 mt-1">Manage partners and their access</p>
		</div>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 mb-1">Total Partners</p>
					<span class="text-xl font-bold">{data.partners.length}</span>
				</div>
				<Users class="h-8 w-8 text-blue-500" />
			</div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 mb-1">Active</p>
					<span class="text-xl font-bold text-green-600">{data.activePartners}</span>
				</div>
				<CheckCircle2 class="h-8 w-8 text-green-500" />
			</div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 mb-1">Inactive</p>
					<span class="text-xl font-bold text-gray-500">{data.inactivePartners}</span>
				</div>
				<XCircle class="h-8 w-8 text-gray-400" />
			</div>
		</div>
	</div>

	<!-- Partners Table -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200">
		<div class="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold flex items-center gap-2">
				<Building2 class="h-5 w-5" />
				Partners
			</h2>
			<div class="relative">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search partners..."
					class="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
				/>
			</div>
		</div>
		{#if filteredPartners().length === 0}
			<div class="p-8 text-center text-gray-400">
				<Users class="h-10 w-10 mx-auto mb-2 text-gray-300" />
				<p class="text-sm">No partners found</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-gray-50 text-xs text-gray-500 uppercase">
						<tr>
							<th class="px-4 py-3 text-left">Partner</th>
							<th class="px-4 py-3 text-left">Email</th>
							<th class="px-4 py-3 text-left">Status</th>
							<th class="px-4 py-3 text-left">Created</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each filteredPartners() as partner (partner.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<Building2 class="h-4 w-4 text-gray-400 shrink-0" />
										<span class="font-medium text-gray-900">{partnerName(partner)}</span>
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<Mail class="h-4 w-4 text-gray-400 shrink-0" />
										<span class="text-gray-600">{partnerEmail(partner)}</span>
									</div>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusBadge(partner.status)} capitalize">
										{partner.status}
									</span>
								</td>
								<td class="px-4 py-3 text-xs text-gray-400">
									<div class="flex items-center gap-1">
										<Clock class="h-3.5 w-3.5" />
										{formatDate(partner.created_at)}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
