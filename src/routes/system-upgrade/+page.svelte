<script lang="ts">
	import { RefreshCwIcon, ActivityIcon } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { endpoints } from '$config/endpoints';

	interface HealthCheck {
		status: string;
		message?: string;
		[key: string]: unknown;
	}

	interface HealthDetailed {
		status: string;
		timestamp: string;
		uptime: number;
		environment: string;
		checks: Record<string, HealthCheck>;
		[key: string]: unknown;
	}

	let healthInfo = $state<HealthDetailed | null>(null);
	let loading = $state(true);
	let error = $state('');

	async function fetchHealth() {
		loading = true; error = '';
		try {
			const response = await apiFetch<Record<string, unknown>>(endpoints.system.version);
			healthInfo = (response.data ?? response) as HealthDetailed;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load system health';
		} finally {
			loading = false;
		}
	}

	$effect(() => { fetchHealth(); });

	function formatUptime(seconds: number): string {
		const d = Math.floor(seconds / 86400);
		const h = Math.floor((seconds % 86400) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		if (d > 0) return `${d}d ${h}h ${m}m`;
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}
</script>

<svelte:head>
	<title>System Health - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">System Health</h1>
			<p class="text-sm text-gray-500 mt-1">System status and health checks</p>
		</div>
		<button onclick={fetchHealth} class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
			<RefreshCwIcon class="h-4 w-4" />Refresh
		</button>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
	{:else if healthInfo}
		<!-- Status Overview -->
		<div class="grid grid-cols-3 gap-4 mb-6">
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-full {healthInfo.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}">
						<ActivityIcon class="h-5 w-5 {healthInfo.status === 'healthy' ? 'text-green-600' : 'text-red-600'}" />
					</div>
					<div>
						<p class="text-xs font-medium text-gray-500 uppercase">Status</p>
						<p class="text-lg font-bold capitalize {healthInfo.status === 'healthy' ? 'text-green-700' : 'text-red-700'}">{healthInfo.status}</p>
					</div>
				</div>
			</div>
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<p class="text-xs font-medium text-gray-500 uppercase">Environment</p>
				<p class="text-lg font-bold text-gray-900">{healthInfo.environment || '—'}</p>
			</div>
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<p class="text-xs font-medium text-gray-500 uppercase">Uptime</p>
				<p class="text-lg font-bold text-gray-900">{healthInfo.uptime ? formatUptime(healthInfo.uptime) : '—'}</p>
			</div>
		</div>

		<!-- Health Checks -->
		{#if healthInfo.checks && Object.keys(healthInfo.checks).length > 0}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Health Checks</h2>
				<div class="space-y-3">
					{#each Object.entries(healthInfo.checks) as [name, check]}
						<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
							<span class="text-sm font-medium text-gray-700">{name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
							<div class="flex items-center gap-2">
								{#if check.message}
									<span class="text-xs text-gray-500">{check.message}</span>
								{/if}
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {check.status === 'healthy' || check.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
									{check.status}
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if healthInfo.timestamp}
			<p class="text-xs text-gray-400 mt-4">Last checked: {new Date(healthInfo.timestamp).toLocaleString()}</p>
		{/if}
	{/if}
</div>
