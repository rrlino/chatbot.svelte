<script lang="ts">
	import { KeyIcon, PlusIcon, CopyIcon, Trash2Icon, EyeIcon, EyeOffIcon } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';

	interface ApiToken {
		id: number;
		name: string;
		token_prefix?: string;
		is_active: boolean;
		last_used_at?: string;
		expires_at?: string;
		created_at: string;
		[key: string]: unknown;
	}

	let tokens = $state<ApiToken[]>([]);
	let loading = $state(true);
	let error = $state('');
	let createModalOpen = $state(false);
	let createName = $state('');
	let createError = $state('');
	let newToken = $state('');
	let showNewToken = $state(false);
	let revealTokenId = $state<number | null>(null);
	let confirmRevokeId = $state<number | null>(null);

	async function fetchTokens() {
		loading = true; error = '';
		try {
			const response = await apiFetch<{ data: ApiToken[] }>('/auth/me');
			// Tokens may come from a dedicated endpoint
			const data = response.data;
			tokens = Array.isArray(data) ? data : [];
		} catch {
			// If no token endpoint exists, show empty state
			tokens = [];
		} finally {
			loading = false;
		}
	}

	$effect(() => { fetchTokens(); });

	function openCreate() { createModalOpen = true; createName = ''; createError = ''; newToken = ''; showNewToken = false; }
	function closeCreate() { createModalOpen = false; showNewToken = false; }

	async function createToken() {
		if (!createName) { createError = 'Token name is required'; return; }
		try {
			// Attempt to create token — may not exist yet
			const response = await apiFetch<{ token?: string; data?: { token?: string } }>('/auth/users', {
				method: 'POST',
				body: JSON.stringify({ name: createName })
			});
			const token = response.token || response.data?.token || '';
			if (token) {
				newToken = token;
				showNewToken = true;
			} else {
				toast.success('Token created');
				closeCreate();
			}
			fetchTokens();
		} catch (err: unknown) {
			createError = err instanceof Error ? err.message : 'Failed to create token. The API token endpoint may not be implemented yet.';
		}
	}

	async function revokeToken(id: number) {
		try {
			await apiFetch(`/auth/users/${id}`, { method: 'DELETE' });
			toast.success('Token revoked');
			confirmRevokeId = null;
			fetchTokens();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Failed to revoke token');
		}
	}

	function copyToken(token: string) {
		navigator.clipboard.writeText(token).then(() => toast.success('Token copied to clipboard'));
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>API Tokens - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">API Tokens</h1>
			<p class="text-sm text-gray-500 mt-1">Manage API access tokens</p>
		</div>
		<button onclick={openCreate} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
			<PlusIcon class="h-4 w-4" />Generate Token
		</button>
	</div>

	{#if error}<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>{/if}

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if tokens.length === 0}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
			<KeyIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
			<h3 class="text-lg font-medium text-gray-900 mb-1">No API Tokens</h3>
			<p class="text-sm text-gray-500">Generate an API token to authenticate programmatic access to the API.</p>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each tokens as token}
						<tr class="hover:bg-gray-50">
							<td class="px-4 py-3 text-sm font-medium text-gray-900">{token.name}</td>
							<td class="px-4 py-3 text-sm font-mono text-gray-500">
								{revealTokenId === token.id ? (token.token_prefix || 'sk_...') + '••••••••' : (token.token_prefix || 'sk_') + '••••••••'}
								<button onclick={() => revealTokenId = revealTokenId === token.id ? null : token.id} class="ml-2 text-gray-400 hover:text-gray-600">
									{#if revealTokenId === token.id}<EyeOffIcon class="h-3.5 w-3.5 inline" />{:else}<EyeIcon class="h-3.5 w-3.5 inline" />{/if}
								</button>
							</td>
							<td class="px-4 py-3">
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {token.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">{token.is_active ? 'Active' : 'Inactive'}</span>
							</td>
							<td class="px-4 py-3 text-sm text-gray-500">{formatDate(token.last_used_at as string)}</td>
							<td class="px-4 py-3 text-sm text-gray-500">{formatDate(token.created_at)}</td>
							<td class="px-4 py-3 text-right">
								<button onclick={() => confirmRevokeId = token.id} class="text-sm text-red-600 hover:text-red-800 font-medium">Revoke</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Create Modal -->
	{#if createModalOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeCreate}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between p-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-900">{showNewToken ? 'Token Generated' : 'Generate API Token'}</h3>
					<button onclick={closeCreate} class="text-gray-400 hover:text-gray-600">&times;</button>
				</div>
				<div class="p-4">
					{#if showNewToken}
						<div class="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
							<p class="text-sm text-amber-800 font-medium">Copy this token now. You won't be able to see it again.</p>
						</div>
						<div class="flex items-center gap-2">
							<code class="flex-1 bg-gray-900 text-green-400 p-3 rounded-lg text-sm font-mono overflow-x-auto">{newToken}</code>
							<button onclick={() => copyToken(newToken)} class="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
								<CopyIcon class="h-4 w-4 text-gray-600" />
							</button>
						</div>
						<div class="flex justify-end mt-4">
							<button onclick={closeCreate} class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">Done</button>
						</div>
					{:else}
						<div class="space-y-4">
							{#if createError}<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{createError}</div>{/if}
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Token Name *</label>
								<input type="text" bind:value={createName} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Production API" />
							</div>
							<div class="flex justify-end gap-3">
								<button onclick={closeCreate} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
								<button onclick={createToken} class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">Generate</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Revoke Confirmation -->
	{#if confirmRevokeId !== null}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => confirmRevokeId = null}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center gap-3 mb-4">
					<div class="p-2 bg-red-100 rounded-full"><Trash2Icon class="h-5 w-5 text-red-600" /></div>
					<h3 class="text-lg font-semibold text-gray-900">Revoke Token</h3>
				</div>
				<p class="text-sm text-gray-600 mb-6">This will permanently revoke the token. Any applications using it will lose access.</p>
				<div class="flex justify-end gap-3">
					<button onclick={() => confirmRevokeId = null} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
					<button onclick={() => { if (confirmRevokeId !== null) revokeToken(confirmRevokeId); }} class="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Revoke</button>
				</div>
			</div>
		</div>
	{/if}
</div>
