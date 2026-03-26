<script lang="ts">
	import { RocketIcon, RefreshCwIcon } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';

	interface VersionInfo {
		version: string;
		commit?: string;
		build_time?: string;
		rust_version?: string;
		[key: string]: unknown;
	}

	let versionInfo = $state<VersionInfo | null>(null);
	let upgradeLog = $state('');
	let loading = $state(true);
	let upgrading = $state(false);
	let error = $state('');
	let showConfirm = $state(false);

	async function fetchVersion() {
		loading = true; error = '';
		try {
			const response = await apiFetch<{ data: VersionInfo }>(endpoints.system.version);
			versionInfo = response.data ?? response;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load version info';
		} finally {
			loading = false;
		}
	}

	$effect(() => { fetchVersion(); });

	async function startUpgrade() {
		upgrading = true; upgradeLog = ''; showConfirm = false;
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_BASE_URL || ''}${endpoints.system.upgrade}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
					}
				}
			);

			if (response.ok) {
				const text = await response.text();
				upgradeLog = text;
				toast.success('Upgrade completed');
				fetchVersion();
			} else {
				const text = await response.text();
				upgradeLog = `Error: ${response.status}\n${text}`;
				toast.error('Upgrade failed');
			}
		} catch (err: unknown) {
			upgradeLog = err instanceof Error ? err.message : 'Upgrade request failed';
			toast.error('Upgrade failed');
		} finally {
			upgrading = false;
		}
	}
</script>

<svelte:head>
	<title>System Upgrade - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">System Upgrade</h1>
		<p class="text-sm text-gray-500 mt-1">Manage system version and upgrades</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
	{/if}

	<!-- Current Version -->
	{#if versionInfo}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="p-2 bg-blue-100 rounded-lg">
					<RocketIcon class="h-5 w-5 text-blue-600" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-gray-900">Current Version</h2>
					<p class="text-2xl font-bold text-blue-600">{versionInfo.version}</p>
				</div>
			</div>
			<div class="grid grid-cols-3 gap-4">
				{#if versionInfo.commit}
					<div class="bg-gray-50 rounded-lg p-3">
						<p class="text-xs font-medium text-gray-500 uppercase">Commit</p>
						<p class="text-sm font-mono text-gray-700 mt-0.5">{versionInfo.commit.slice(0, 12)}</p>
					</div>
				{/if}
				{#if versionInfo.build_time}
					<div class="bg-gray-50 rounded-lg p-3">
						<p class="text-xs font-medium text-gray-500 uppercase">Built</p>
						<p class="text-sm text-gray-700 mt-0.5">{new Date(versionInfo.build_time).toLocaleString()}</p>
					</div>
				{/if}
				{#if versionInfo.rust_version}
					<div class="bg-gray-50 rounded-lg p-3">
						<p class="text-xs font-medium text-gray-500 uppercase">Rust</p>
						<p class="text-sm text-gray-700 mt-0.5">{versionInfo.rust_version}</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Upgrade Section -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Upgrade System</h2>

		{#if !showConfirm && !upgrading}
			<div class="flex items-center gap-4">
				<button
					onclick={() => showConfirm = true}
					class="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
				>
					<RocketIcon class="h-4 w-4" />
					Start Upgrade
				</button>
				<button
					onclick={fetchVersion}
					class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
				>
					<RefreshCwIcon class="h-4 w-4" />
					Check Version
				</button>
			</div>
		{:else if showConfirm}
			<div class="p-4 bg-orange-50 border border-orange-200 rounded-lg">
				<p class="text-sm text-orange-800 font-medium mb-3">Are you sure you want to upgrade the system? This will restart the server.</p>
				<div class="flex gap-3">
					<button onclick={startUpgrade} class="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors">Confirm Upgrade</button>
					<button onclick={() => showConfirm = false} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
				</div>
			</div>
		{:else if upgrading}
			<div class="flex items-center gap-3">
				<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
				<span class="text-sm text-gray-600">Upgrading system...</span>
			</div>
		{/if}
	</div>

	<!-- Upgrade Log -->
	{#if upgradeLog}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Upgrade Log</h2>
			<pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto max-h-96 overflow-y-auto font-mono">{upgradeLog}</pre>
		</div>
	{/if}
</div>
