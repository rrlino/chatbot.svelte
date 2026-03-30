<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		WebhookIcon,
		RefreshCwIcon,
		PlusIcon,
		SearchIcon,
		EyeIcon,
		PlayIcon,
		FileTextIcon,
		PencilIcon,
		TrashIcon,
		CopyIcon,
		CheckCircleIcon,
		XCircleIcon,
		PauseCircleIcon,
		ClockIcon,
		LinkIcon,
		ActivityIcon,
		ShieldCheckIcon,
		XIcon
	} from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { endpoints } from '$config/endpoints';
	import { toast } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchTerm = $state('');
	let statusFilter = $state('');
	let loading = $state(false);
	let showCreateModal = $state(false);
	let activeDropdown = $state<number | null>(null);

	// Create form state
	let newWebhook = $state({
		name: '',
		url: '',
		events: [] as string[],
		secret: '',
		description: ''
	});

	// Detail/log modal state
	let detailWebhook = $state<Webhook | null>(null);
	let showDetailModal = $state(false);
	let showLogModal = $state(false);

	const availableEvents = [
		'message.sent',
		'message.received',
		'user.created',
		'journey.completed',
		'training.assigned',
		'system.error'
	];

	interface Webhook {
		id: number;
		name: string;
		provider: string;
		status: string;
		is_active: boolean;
		webhook_url: string | null;
		webhook_secret: string | null;
		created_at: string;
		updated_at: string;
	}

	let filteredWebhooks = $derived(() => {
		let filtered = data.webhooks as Webhook[];
		if (searchTerm) {
			const term = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(w) =>
					w.name.toLowerCase().includes(term) ||
					(w.webhook_url || '').toLowerCase().includes(term) ||
					w.provider.toLowerCase().includes(term)
			);
		}
		if (statusFilter) {
			filtered = filtered.filter((w) =>
				statusFilter === 'active' ? w.is_active : !w.is_active
			);
		}
		return filtered;
	});

	function formatDate(d: string | null): string {
		if (!d) return 'Never';
		return new Date(d).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatTime(d: string): string {
		const now = new Date();
		const date = new Date(d);
		const diffMs = now.getTime() - date.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'Just now';
		if (diffMin < 60) return `${diffMin} min ago`;
		const hours = Math.floor(diffMin / 60);
		return `${hours}h ago`;
	}

	async function refreshData() {
		loading = true;
		await invalidateAll();
		loading = false;
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success('URL copied to clipboard');
		} catch {
			toast.error('Failed to copy URL');
		}
	}

	async function testWebhook(webhook: Webhook) {
		try {
			await apiFetch(endpoints.webhooks.simulate, {
				method: 'POST',
				body: JSON.stringify({ webhook_id: webhook.id })
			});
			toast.success(`Test sent to ${webhook.name}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to test webhook');
		}
		activeDropdown = null;
	}

	async function deleteWebhook(webhook: Webhook) {
		if (!confirm(`Delete webhook configuration for "${webhook.name}"?`)) return;
		try {
			await apiFetch(`${endpoints.channels.get(String(webhook.id))}`, {
				method: 'PUT',
				body: JSON.stringify({ webhook_url: null, webhook_secret: null })
			});
			toast.success(`Removed webhook from ${webhook.name}`);
			await refreshData();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete webhook');
		}
		activeDropdown = null;
	}

	function toggleEvent(event: string) {
		if (newWebhook.events.includes(event)) {
			newWebhook.events = newWebhook.events.filter((e) => e !== event);
		} else {
			newWebhook.events = [...newWebhook.events, event];
		}
	}

	function closeCreateModal() {
		showCreateModal = false;
		newWebhook = { name: '', url: '', events: [], secret: '', description: '' };
	}

	function handleClickOutside() {
		activeDropdown = null;
	}
</script>

<svelte:head>
	<title>Webhooks - TrueLocal AI</title>
</svelte:head>

<svelte:window onclick={handleClickOutside} />

<div class="p-6">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
					<WebhookIcon class="h-7 w-7 text-blue-600" />
					Webhook Management
				</h1>
				<p class="text-sm text-gray-500 mt-1">
					Manage webhook endpoints, signatures, and delivery monitoring
				</p>
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={refreshData}
					disabled={loading}
					class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
				>
					<RefreshCwIcon class="h-4 w-4 {loading ? 'animate-spin' : ''}" />
				</button>
				<button
					onclick={() => (showCreateModal = true)}
					class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
				>
					<PlusIcon class="h-4 w-4" />
					Create Webhook
				</button>
			</div>
		</div>

		<!-- Statistics -->
		{#if data.webhookStatus}
			<div class="mt-4 grid grid-cols-4 gap-4">
				<div class="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
						<LinkIcon class="h-5 w-5 text-blue-600" />
					</div>
					<div>
						<p class="text-xs text-gray-500">Configured Webhooks</p>
						<p class="text-lg font-semibold text-gray-900">{data.webhooks.length}</p>
					</div>
				</div>
				<div class="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
						<CheckCircleIcon class="h-5 w-5 text-green-600" />
					</div>
					<div>
						<p class="text-xs text-gray-500">Total Events</p>
						<p class="text-lg font-semibold text-gray-900">{data.webhookStatus.total_events.toLocaleString()}</p>
					</div>
				</div>
				<div class="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg">
						<ClockIcon class="h-5 w-5 text-amber-600" />
					</div>
					<div>
						<p class="text-xs text-gray-500">Unprocessed</p>
						<p class="text-lg font-semibold text-gray-900">{data.webhookStatus.unprocessed_events}</p>
					</div>
				</div>
				<div class="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
						<ShieldCheckIcon class="h-5 w-5 text-purple-600" />
					</div>
					<div>
						<p class="text-xs text-gray-500">Status</p>
						<p class="text-lg font-semibold text-gray-900 capitalize">{data.webhookStatus.status}</p>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Webhook Endpoints Table -->
	<div class="bg-white rounded-lg border border-gray-200 mb-4">
		<div class="p-4 border-b border-gray-200 flex items-center justify-between">
			<h2 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
				<ActivityIcon class="h-4 w-4 text-gray-500" />
				Webhook Endpoints
			</h2>
			<div class="flex items-center gap-2">
				<div class="relative">
					<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						type="text"
						bind:value={searchTerm}
						placeholder="Search webhooks..."
						class="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
					/>
				</div>
				<select
					bind:value={statusFilter}
					class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				>
					<option value="">All Statuses</option>
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
				</select>
			</div>
		</div>

		{#if filteredWebhooks().length === 0}
			<div class="p-12 flex flex-col items-center text-gray-500">
				<WebhookIcon class="h-12 w-12 mb-3 text-gray-300" />
				<h3 class="text-lg font-medium text-gray-700 mb-1">No webhooks configured</h3>
				<p class="text-sm mb-4">Configure webhook URLs on your channels to get started.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-gray-50">
						<tr>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Channel</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Webhook URL</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Provider</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
							<th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each filteredWebhooks() as webhook (webhook.id)}
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										{#if webhook.is_active}
											<CheckCircleIcon class="h-4 w-4 text-green-500 shrink-0" />
										{:else}
											<PauseCircleIcon class="h-4 w-4 text-amber-500 shrink-0" />
										{/if}
										<div>
											<p class="font-medium text-gray-900">{webhook.name}</p>
										</div>
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<code class="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded max-w-[280px] truncate block">
											{webhook.webhook_url || 'N/A'}
										</code>
										<button
											onclick={() => copyToClipboard(webhook.webhook_url || '')}
											class="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
											title="Copy URL"
										>
											<CopyIcon class="h-3.5 w-3.5" />
										</button>
									</div>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
										{webhook.provider}
									</span>
								</td>
								<td class="px-4 py-3">
									<span
										class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
											{webhook.is_active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}"
									>
										{webhook.is_active ? 'Active' : 'Inactive'}
									</span>
								</td>
								<td class="px-4 py-3 text-gray-500 text-xs">
									{formatDate(webhook.created_at)}
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center justify-end gap-1">
										<button
											onclick={() => testWebhook(webhook)}
											class="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
											title="Test Webhook"
										>
											<PlayIcon class="h-4 w-4" />
										</button>
										<button
											onclick={() => { detailWebhook = webhook; showDetailModal = true; }}
											class="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
											title="View Details"
										>
											<EyeIcon class="h-4 w-4" />
										</button>
										<button
											onclick={() => deleteWebhook(webhook)}
											class="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
											title="Delete"
										>
											<TrashIcon class="h-4 w-4" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Payment Provider Webhooks -->
	{#if data.webhookStatus?.providers?.length}
		<div class="bg-white rounded-lg border border-gray-200">
			<div class="p-4 border-b border-gray-200">
				<h2 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
					<FileTextIcon class="h-4 w-4 text-gray-500" />
					Payment Provider Webhooks
				</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-gray-50">
						<tr>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Provider</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Endpoint</th>
							<th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each data.webhookStatus.providers as provider}
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="px-4 py-3">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
										{provider}
									</span>
								</td>
								<td class="px-4 py-3">
									<code class="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
										/webhooks/{provider}
									</code>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
										<CheckCircleIcon class="h-3 w-3" />
										Operational
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- Detail Modal -->
{#if showDetailModal && detailWebhook}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => (showDetailModal = false)}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h3 class="text-sm font-semibold text-gray-900">Webhook Details</h3>
				<button onclick={() => (showDetailModal = false)} class="text-gray-400 hover:text-gray-600">
					<XIcon class="h-4 w-4" />
				</button>
			</div>
			<div class="p-4 space-y-3">
				<div>
					<p class="text-xs text-gray-500">Channel Name</p>
					<p class="text-sm font-medium text-gray-900">{detailWebhook.name}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Provider</p>
					<p class="text-sm text-gray-900 capitalize">{detailWebhook.provider}</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Webhook URL</p>
					<code class="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded block break-all">
						{detailWebhook.webhook_url || 'Not configured'}
					</code>
				</div>
				<div>
					<p class="text-xs text-gray-500">Webhook Secret</p>
					<p class="text-sm text-gray-900">
						{detailWebhook.webhook_secret ? '••••••••' : 'Not configured'}
					</p>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<p class="text-xs text-gray-500">Status</p>
						<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
							{detailWebhook.is_active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
							{detailWebhook.is_active ? 'Active' : 'Inactive'}
						</span>
					</div>
					<div>
						<p class="text-xs text-gray-500">Created</p>
						<p class="text-sm text-gray-900">{formatDate(detailWebhook.created_at)}</p>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Create Webhook Modal -->
{#if showCreateModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeCreateModal}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
					<PlusIcon class="h-4 w-4" />
					Create Webhook
				</h3>
				<button onclick={closeCreateModal} class="text-gray-400 hover:text-gray-600">
					<XIcon class="h-4 w-4" />
				</button>
			</div>
			<div class="p-4 space-y-4">
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1">Name *</label>
					<input
						type="text"
						bind:value={newWebhook.name}
						placeholder="e.g., Message Events Webhook"
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1">Webhook URL *</label>
					<input
						type="url"
						bind:value={newWebhook.url}
						placeholder="https://your-app.com/webhooks/truelocal"
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1">Events to Subscribe *</label>
					<div class="grid grid-cols-2 gap-2">
						{#each availableEvents as event}
							<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
								<input
									type="checkbox"
									checked={newWebhook.events.includes(event)}
									onchange={() => toggleEvent(event)}
									class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								/>
								<span class="text-xs">{event}</span>
							</label>
						{/each}
					</div>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1">Webhook Secret</label>
					<input
						type="text"
						bind:value={newWebhook.secret}
						placeholder="Optional secret for signature validation"
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
					<p class="text-xs text-gray-500 mt-1">Used for HMAC signature validation. Leave empty to auto-generate.</p>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1">Description</label>
					<textarea
						bind:value={newWebhook.description}
						rows="2"
						placeholder="Optional description for this webhook..."
						class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					></textarea>
				</div>
			</div>
			<div class="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
				<button
					onclick={closeCreateModal}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={() => { toast.info('Webhook creation will be available when the CRUD API is implemented'); closeCreateModal(); }}
					class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
				>
					Create Webhook
				</button>
			</div>
		</div>
	</div>
{/if}
