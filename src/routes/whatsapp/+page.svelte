<script lang="ts">
	import { onMount } from 'svelte';
	import { Cloud, RefreshCw, Pencil, Check, X, Copy, Eye, EyeOff, Key, Phone, Building2, ListChecks, ShieldCheck, Code2, AlertTriangle, History } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { toast } from '$stores/toast';
	import { endpoints } from '$config/endpoints';
	import { AppModal } from '$components/core';

	let loading = $state(false);
	let error = $state('');
	let editing = $state(false);
	let saving = $state(false);
	let restarting = $state(false);
	let showRestartModal = $state(false);

	let config = $state({
		WHATSAPP_PHONE_NUMBER_ID: '',
		WHATSAPP_BUSINESS_ACCOUNT_ID: '',
		WHATSAPP_ACCESS_TOKEN: '',
		WHATSAPP_SESSION_ID: '',
		WHATSAPP_CLOUD_API_ENABLED: '',
		WHATSAPP_ALLOWED_NUMBERS: '',
		WHATSAPP_VERIFY_TOKEN: '',
		WHATSAPP_API_DEVELOPMENT_MODE: '',
		last_restart: null as string | null
	});

	let editableConfig = $state({ ...config });
	let showTokens = $state({ access_token: false, verify_token: false });

	async function loadConfiguration() {
		loading = true;
		error = '';
		try {
			const response = await apiFetch<Record<string, string>>(endpoints.whatsapp.settings);
			config = { ...config, ...response };
			editableConfig = { ...config };
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load configuration';
		} finally {
			loading = false;
		}
	}

	function toggleEdit() {
		if (editing) {
			editableConfig = { ...config };
		}
		editing = !editing;
	}

	async function saveSettings() {
		saving = true;
		try {
			await apiFetch(endpoints.whatsapp.settings, {
				method: 'PUT',
				body: JSON.stringify(editableConfig)
			});
			config = { ...editableConfig };
			editing = false;
			toast.success('Settings saved successfully');
		} catch {
			toast.error('Failed to save settings');
		} finally {
			saving = false;
		}
	}

	async function confirmRestart() {
		showRestartModal = false;
		restarting = true;
		try {
			await apiFetch(endpoints.whatsapp.connector, { method: 'POST' });
			config.last_restart = new Date().toISOString();
			toast.success('System restarted successfully');
		} catch {
			toast.error('Restart failed');
		} finally {
			restarting = false;
		}
	}

	async function copyToClipboard(text: string, isSecret = false) {
		if (!text || text === 'Not configured') {
			toast.error('No value to copy');
			return;
		}
		try {
			await navigator.clipboard.writeText(text);
			toast.success(isSecret ? 'Secret copied' : 'Value copied');
		} catch {
			toast.error('Failed to copy');
		}
	}

	function formatDate(dateString: string): string {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleString();
	}

	onMount(() => {
		loadConfiguration();
	});

	const fields = [
		{ key: 'WHATSAPP_PHONE_NUMBER_ID', label: 'Phone Number ID', icon: Phone, secret: false, help: 'WhatsApp Cloud API Phone Number ID' },
		{ key: 'WHATSAPP_BUSINESS_ACCOUNT_ID', label: 'Business Account ID', icon: Building2, secret: false, help: 'Meta Business Account ID' },
		{ key: 'WHATSAPP_ACCESS_TOKEN', label: 'Access Token', icon: Key, secret: 'access_token', help: 'WhatsApp Cloud API access token' },
		{ key: 'WHATSAPP_SESSION_ID', label: 'Session ID', icon: ListChecks, secret: false, help: 'WhatsApp session identifier' },
		{ key: 'WHATSAPP_CLOUD_API_ENABLED', label: 'Cloud API Enabled', icon: Cloud, secret: false, help: 'Enable/disable WhatsApp Cloud API', boolean: true },
		{ key: 'WHATSAPP_ALLOWED_NUMBERS', label: 'Allowed Numbers', icon: ListChecks, secret: false, help: 'Comma-separated phone numbers allowed to interact', monospace: true },
		{ key: 'WHATSAPP_VERIFY_TOKEN', label: 'Verify Token', icon: ShieldCheck, secret: 'verify_token', help: 'Webhook verification token' },
		{ key: 'WHATSAPP_API_DEVELOPMENT_MODE', label: 'API Development Mode', icon: Code2, secret: false, help: 'Enable development mode for testing', boolean: true }
	];
</script>

<svelte:head>
	<title>WhatsApp Settings - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
		<div class="flex items-center justify-between mb-3">
			<h1 class="text-xl font-bold text-gray-900">WhatsApp Settings</h1>
			<div class="flex items-center gap-1 text-gray-500 text-sm">
				<Cloud class="h-4 w-4" />
				<span class="font-medium">Configuration</span>
			</div>
		</div>
		<p class="text-sm text-gray-500 mb-3">Configure your WhatsApp Business API integration settings</p>
		<div class="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
			<AlertTriangle class="h-4 w-4 mt-0.5 shrink-0" />
			<div>
				<strong>Restart Required:</strong>
				Changes to WhatsApp settings require a system restart to take effect.
			</div>
		</div>
	</div>

	<!-- Environment Variables -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
		<div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
			<h2 class="text-lg font-semibold flex items-center gap-2">
				<Cloud class="h-5 w-5 text-blue-600" />
				Environment Variables
			</h2>
			<div class="flex items-center gap-2">
				{#if !editing}
					<button onclick={toggleEdit} class="flex items-center gap-1 px-3 py-1.5 text-sm border border-green-300 rounded-lg text-green-700 hover:bg-green-50 transition-colors">
						<Pencil class="h-3.5 w-3.5" /> Edit
					</button>
				{:else}
					<button onclick={saveSettings} disabled={saving} class="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
						{#if saving}
							<div class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
							Saving...
						{:else}
							<Check class="h-3.5 w-3.5" /> Save
						{/if}
					</button>
					<button onclick={toggleEdit} disabled={saving} class="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
						<X class="h-3.5 w-3.5" /> Cancel
					</button>
				{/if}
				<button onclick={loadConfiguration} disabled={editing} class="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
					<RefreshCw class="h-3.5 w-3.5" /> Refresh
				</button>
			</div>
		</div>

		<div class="p-6">
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				</div>
			{:else if error}
				<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each fields as field}
						<div>
							<p class="block text-sm font-medium text-gray-700 mb-1">{field.label}</p>
							<div class="flex items-center">
								<span class="flex items-center justify-center w-10 h-10 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-gray-400">
									<field.icon class="h-4 w-4" />
								</span>
								{#if field.boolean && editing}
									<select bind:value={editableConfig[field.key]} class="flex-1 px-3 py-2 border border-gray-300 rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
										<option value="true">Enabled</option>
										<option value="false">Disabled</option>
									</select>
								{:else}
									<input
										type={field.secret ? (showTokens[field.secret] ? 'text' : 'password') : 'text'}
										value={editableConfig[field.key] ?? ''}
										oninput={(e) => (editableConfig[field.key] = (e.target as HTMLInputElement).value)}
										readonly={!editing}
										class="flex-1 px-3 py-2 border border-gray-300 rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 {field.monospace || field.secret ? 'font-mono' : ''}"
									/>
								{/if}
								{#if field.secret}
									<button onclick={() => (showTokens[field.secret] = !showTokens[field.secret])} class="flex items-center justify-center w-10 h-10 border border-l-0 border-gray-300 text-gray-400 hover:text-gray-600">
										{#if showTokens[field.secret]}
											<EyeOff class="h-4 w-4" />
										{:else}
											<Eye class="h-4 w-4" />
										{/if}
									</button>
								{/if}
								<button onclick={() => copyToClipboard(editableConfig[field.key] ?? '', !!field.secret)} class="flex items-center justify-center w-10 h-10 border border-l-0 border-gray-300 rounded-r-lg text-gray-400 hover:text-gray-600">
									<Copy class="h-4 w-4" />
								</button>
								{#if field.boolean && !editing}
									<span class="flex items-center justify-center w-10 h-10 bg-gray-50 border border-l-0 border-gray-300 rounded-r-lg">
										{#if config[field.key] === 'true'}
											<Check class="h-4 w-4 text-green-600" />
										{:else}
											<X class="h-4 w-4 text-red-500" />
										{/if}
									</span>
								{/if}
							</div>
							<p class="text-xs text-gray-400 mt-1">{field.help}</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- System Restart Section -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<div class="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h2 class="text-lg font-semibold flex items-center gap-2 mb-3">
				<RefreshCw class="h-5 w-5 text-yellow-600" />
				System Restart
			</h2>
			<p class="text-sm text-gray-500 mb-4">Restart the WhatsApp service to apply configuration changes</p>
			<button
				onclick={() => (showRestartModal = true)}
				disabled={restarting}
				class="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
			>
				{#if restarting}
					<div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
					Restarting...
				{:else}
					<RefreshCw class="h-4 w-4" />
					Restart System
				{/if}
			</button>
		</div>

		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h2 class="text-lg font-semibold flex items-center gap-2 mb-3">
				<History class="h-5 w-5 text-blue-500" />
				Last Restart
			</h2>
			{#if config.last_restart}
				<div class="text-center py-2">
					<p class="text-sm text-gray-600">{formatDate(config.last_restart)}</p>
				</div>
			{:else}
				<div class="text-center py-4">
					<History class="h-8 w-8 text-gray-300 mx-auto mb-2" />
					<p class="text-sm text-gray-400">No restart information available</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Restart Confirmation Modal -->
<AppModal open={showRestartModal} title="Confirm Restart" onClose={() => (showRestartModal = false)}>
	<div class="space-y-4">
		<p class="text-sm text-gray-600">Are you sure you want to restart the WhatsApp service?</p>
		<ul class="text-sm text-gray-500 list-disc list-inside space-y-1">
			<li>All active connections will be terminated</li>
			<li>Messages in transit may be lost</li>
			<li>The service will be unavailable briefly</li>
		</ul>
		<div class="flex justify-end gap-2 pt-2">
			<button onclick={() => (showRestartModal = false)} class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
			<button onclick={confirmRestart} class="flex items-center gap-1 px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
				<RefreshCw class="h-4 w-4" />
				Confirm Restart
			</button>
		</div>
	</div>
</AppModal>
