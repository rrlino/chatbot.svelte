<script lang="ts">
	import { GaugeIcon, PlusIcon } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';

	interface RateLimitRule {
		id: number;
		name: string;
		endpoint_pattern: string;
		max_requests: number;
		window_seconds: number;
		is_active: boolean;
		description?: string;
		created_at: string;
		[key: string]: unknown;
	}

	interface RateLimitForm {
		name: string;
		endpoint_pattern: string;
		max_requests: number;
		window_seconds: number;
		is_active: boolean;
		description: string;
	}

	const emptyForm: RateLimitForm = {
		name: '', endpoint_pattern: '', max_requests: 100, window_seconds: 60, is_active: true, description: ''
	};

	let rules = $state<RateLimitRule[]>([]);
	let loading = $state(true);
	let error = $state('');
	let modalOpen = $state(false);
	let editingRule = $state<RateLimitRule | null>(null);
	let form = $state<RateLimitForm>({ ...emptyForm });
	let formError = $state('');
	let saving = $state(false);

	async function fetchRules() {
		loading = true; error = '';
		try {
			const response = await apiFetch<{ data: RateLimitRule[] }>('/settings?category=rate_limiting');
			const data = response.data ?? response;
			rules = Array.isArray(data) ? data : [];
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load rate limit rules';
		} finally {
			loading = false;
		}
	}

	$effect(() => { fetchRules(); });

	function openCreate() { editingRule = null; form = { ...emptyForm }; formError = ''; modalOpen = true; }
	function openEdit(rule: RateLimitRule) {
		editingRule = rule;
		form = {
			name: rule.name, endpoint_pattern: rule.endpoint_pattern,
			max_requests: rule.max_requests, window_seconds: rule.window_seconds,
			is_active: rule.is_active, description: rule.description || ''
		};
		formError = ''; modalOpen = true;
	}
	function closeModal() { modalOpen = false; editingRule = null; }

	async function saveRule() {
		if (!form.name || !form.endpoint_pattern) { formError = 'Name and endpoint pattern are required'; return; }
		saving = true; formError = '';
		try {
			const body = { ...form, category: 'rate_limiting' };
			await apiFetch('/settings', { method: 'POST', body: JSON.stringify(body) });
			toast.success(editingRule ? 'Rule updated' : 'Rule created');
			closeModal(); fetchRules();
		} catch (err: unknown) { formError = err instanceof Error ? err.message : 'Failed to save'; } finally { saving = false; }
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Rate Limiting - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Rate Limiting</h1>
			<p class="text-sm text-gray-500 mt-1">Configure API rate limit rules</p>
		</div>
		<button onclick={openCreate} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
			<PlusIcon class="h-4 w-4" />Add Rule
		</button>
	</div>

	{#if error}<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>{/if}

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if rules.length === 0}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
			<GaugeIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
			<p class="text-gray-500">No rate limit rules configured.</p>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint Pattern</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limit</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Window</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each rules as rule}
						<tr class="hover:bg-gray-50 cursor-pointer" onclick={() => openEdit(rule)}>
							<td class="px-4 py-3 text-sm font-medium text-gray-900">{rule.name}</td>
							<td class="px-4 py-3 text-sm font-mono text-gray-600">{rule.endpoint_pattern}</td>
							<td class="px-4 py-3 text-sm text-gray-700">{rule.max_requests} req</td>
							<td class="px-4 py-3 text-sm text-gray-700">{rule.window_seconds}s</td>
							<td class="px-4 py-3">
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">{rule.is_active ? 'Active' : 'Inactive'}</span>
							</td>
							<td class="px-4 py-3 text-sm text-gray-500">{formatDate(rule.created_at)}</td>
							<td class="px-4 py-3 text-right">
								<button onclick={(e) => { e.stopPropagation(); openEdit(rule); }} class="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Create/Edit Modal -->
	{#if modalOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeModal}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between p-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-900">{editingRule ? 'Edit Rule' : 'Add Rate Limit Rule'}</h3>
					<button onclick={closeModal} class="text-gray-400 hover:text-gray-600">&times;</button>
				</div>
				<div class="p-4 space-y-4">
					{#if formError}<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>{/if}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
						<input type="text" bind:value={form.name} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Endpoint Pattern *</label>
						<input type="text" bind:value={form.endpoint_pattern} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="/api/v1/messages" />
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Max Requests</label>
							<input type="number" bind:value={form.max_requests} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Window (seconds)</label>
							<input type="number" bind:value={form.window_seconds} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
							<textarea bind:value={form.description} rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>>
					</div>
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={form.is_active} class="rounded border-gray-300 text-blue-600" />
						<span class="text-sm text-gray-700">Active</span>
					</label>
					<div class="flex justify-end gap-3 pt-2">
						<button onclick={closeModal} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
						<button onclick={saveRule} disabled={saving} class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : editingRule ? 'Update' : 'Create'}</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
