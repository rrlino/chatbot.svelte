<script lang="ts">
	import { RefreshCwIcon, SendIcon, WebhookIcon } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';

	interface WebhookConfig {
		id: number;
		url: string;
		events: string[];
		is_active: boolean;
		secret?: string;
		last_delivery_at?: string;
		failure_count: number;
		created_at: string;
		[key: string]: unknown;
	}

	interface WebhookStatus {
		mercadopago: string;
		getnet: string;
		cielo: string;
		stripe: string;
		[key: string]: unknown;
	}

	let webhooks = $state<WebhookConfig[]>([]);
	let webhookStatus = $state<WebhookStatus | null>(null);
	let loading = $state(true);
	let error = $state('');

	// Simulator
	let simUrl = $state('');
	let simPayload = $state('{}');
	let simMethod = $state('POST');
	let simResponse = $state('');
	let simLoading = $state(false);

	async function fetchWebhooks() {
		loading = true; error = '';
		try {
			const [configRes, statusRes] = await Promise.all([
				apiFetch<{ data: WebhookConfig[] }>('/channels'),
				apiFetch<{ data: WebhookStatus }>(endpoints.webhooks.status)
			]);
			const data = configRes.data ?? configRes;
			webhooks = Array.isArray(data) ? data : [];
			webhookStatus = statusRes.data ?? statusRes;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load webhook data';
		} finally {
			loading = false;
		}
	}

	$effect(() => { fetchWebhooks(); });

	async function simulateWebhook() {
		if (!simUrl) { toast.error('URL is required'); return; }
		simLoading = true; simResponse = '';
		try {
			await apiFetch(endpoints.webhooks.simulate, {
				method: 'POST',
				body: JSON.stringify({ url: simUrl, method: simMethod, payload: JSON.parse(simPayload) })
			});
			simResponse = 'Webhook sent successfully';
			toast.success('Webhook simulated');
		} catch (err: unknown) {
			simResponse = err instanceof Error ? err.message : 'Simulation failed';
			toast.error('Simulation failed');
		} finally {
			simLoading = false;
		}
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<svelte:head>
	<title>Webhook Management - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Webhook Management</h1>
			<p class="text-sm text-gray-500 mt-1">Configure and test webhook integrations</p>
		</div>
		<button onclick={fetchWebhooks} class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
			<RefreshCwIcon class="h-4 w-4" />Refresh
		</button>
	</div>

	{#if error}<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>{/if}

	<!-- Webhook Provider Status -->
	{#if webhookStatus}
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
			{#each ['mercadopago', 'getnet', 'cielo', 'stripe'] as provider}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
					<div class="flex items-center gap-2 mb-2">
						<WebhookIcon class="h-4 w-4 text-gray-400" />
						<p class="text-xs font-medium text-gray-500 uppercase">{provider}</p>
					</div>
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {webhookStatus[provider] === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
						{webhookStatus[provider] || 'unknown'}
					</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Channel Webhooks Table -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
		<div class="px-4 py-3 border-b border-gray-200">
			<h2 class="text-sm font-semibold text-gray-700">Configured Webhooks</h2>
		</div>
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		{:else if webhooks.length === 0}
			<div class="p-8 text-center">
				<p class="text-gray-500">No webhook configurations found.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failures</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Delivery</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each webhooks as wh}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3 text-sm font-mono text-gray-700 truncate max-w-xs">{wh.url || '#' + wh.id}</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {wh.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">{wh.is_active ? 'Active' : 'Inactive'}</span>
								</td>
								<td class="px-4 py-3 text-sm {wh.failure_count > 0 ? 'text-red-600' : 'text-gray-500'}">{wh.failure_count}</td>
								<td class="px-4 py-3 text-sm text-gray-500">{formatDate(wh.last_delivery_at as string)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Webhook Simulator -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200">
		<div class="px-4 py-3 border-b border-gray-200">
			<h2 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
				<SendIcon class="h-4 w-4" />Webhook Simulator
			</h2>
		</div>
		<div class="p-4 space-y-4">
			<div class="grid grid-cols-3 gap-4">
				<div class="col-span-2">
					<label class="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
					<input type="text" bind:value={simUrl} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/webhook" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Method</label>
					<select bind:value={simMethod} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="POST">POST</option>
						<option value="GET">GET</option>
						<option value="PUT">PUT</option>
					</select>
				</div>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Payload (JSON)</label>
				<textarea bind:value={simPayload} rows="6" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500">{`{ "event": "test", "data": { "message": "Hello" } }`}</textarea>
			</div>
			<button onclick={simulateWebhook} disabled={simLoading} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
				<SendIcon class="h-4 w-4" />
				{simLoading ? 'Sending...' : 'Send Test Webhook'}
			</button>
			{#if simResponse}
				<div class="p-3 bg-gray-50 rounded-lg">
					<p class="text-xs font-medium text-gray-500 uppercase mb-1">Response</p>
					<pre class="text-sm text-gray-700">{simResponse}</pre>
				</div>
			{/if}
		</div>
	</div>
</div>
