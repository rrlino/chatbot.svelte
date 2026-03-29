<script lang="ts">
	import { page } from '$app/state';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';

	interface Setting {
		key: string;
		value: unknown;
		category?: string;
		description?: string;
		updated_at?: string;
		[key: string]: unknown;
	}

	let activeTab = $state('ai');
	let settings = $state<Setting[]>([]);
	let loading = $state(true);
	let error = $state('');
	let editingKey = $state<string | null>(null);
	let editValue = $state('');
	let saving = $state(false);

	const tabs = [
		{ key: 'ai', label: 'AI Configuration' },
		{ key: 'api', label: 'API Settings' },
		{ key: 'whatsapp', label: 'WhatsApp' },
		{ key: 'preferences', label: 'User Preferences' },
		{ key: 'upgrades', label: 'System Upgrades' }
	];

	async function fetchSettings() {
		loading = true; error = '';
		try {
			const response = await apiFetch<{ data: Setting[] }>(`/settings?category=${activeTab}`);
			const data = response.data ?? response;
			settings = Array.isArray(data) ? data : [];
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load settings';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		const tab = page.url.searchParams.get('tab');
		if (tab && tabs.some((t) => t.key === tab)) activeTab = tab;
	});

	$effect(() => { fetchSettings(); });

	function startEdit(setting: Setting) {
		editingKey = setting.key;
		editValue = typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value, null, 2);
	}

	function cancelEdit() { editingKey = null; editValue = ''; }

	async function saveSetting() {
		if (!editingKey) return;
		saving = true;
		try {
			let value: unknown = editValue;
			try { value = JSON.parse(editValue); } catch { /* keep as string */ }

			await apiFetch(`/settings/${editingKey}`, {
				method: 'PUT',
				body: JSON.stringify({ value })
			});
			toast.success(`Setting "${editingKey}" updated`);
			editingKey = null; editValue = '';
			fetchSettings();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Failed to save setting');
		} finally { saving = false; }
	}

	function formatValue(value: unknown): string {
		if (value === null || value === undefined) return '—';
		if (typeof value === 'object') return JSON.stringify(value, null, 2);
		return String(value);
	}
</script>

<svelte:head>
	<title>System Settings - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">System Settings</h1>
		<p class="text-sm text-gray-500 mt-1">Configure system-wide settings</p>
	</div>

	<!-- Tabs -->
	<div class="flex border-b border-gray-200 mb-6">
		{#each tabs as tab}
			<button
				onclick={() => activeTab = tab.key}
				class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === tab.key
					? 'border-blue-600 text-blue-600'
					: 'border-transparent text-gray-500 hover:text-gray-700'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
	{:else if settings.length === 0}
		<div class="text-center py-12">
			<p class="text-gray-500">No settings found for this category.</p>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
			{#each settings as setting}
				<div class="p-4">
					<div class="flex items-center justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<h3 class="text-sm font-medium text-gray-900 font-mono">{setting.key}</h3>
								{#if setting.description}
									<span class="text-xs text-gray-400">— {setting.description}</span>
								{/if}
							</div>
							{#if editingKey === setting.key}
								<div class="mt-2">
									<textarea
										bind:value={editValue}
										rows="3"
										class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
									></textarea>
									<div class="flex gap-2 mt-2">
										<button onclick={saveSetting} disabled={saving} class="px-3 py-1 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
										<button onclick={cancelEdit} class="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
									</div>
								</div>
							{:else}
								<pre class="mt-1 text-sm text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto max-h-32">{formatValue(setting.value)}</pre>
							{/if}
						</div>
						{#if editingKey !== setting.key}
							<button onclick={() => startEdit(setting)} class="ml-4 text-sm text-blue-600 hover:text-blue-800 font-medium shrink-0">Edit</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
