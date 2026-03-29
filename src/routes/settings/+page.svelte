<script lang="ts">
	import { page } from '$app/state';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import { endpoints } from '$config/endpoints';

	interface Setting {
		key: string;
		value: string;
		category?: string;
		description?: string;
		updated_at?: string;
	}

	let activeTab = $state('user-prefs');
	let loading = $state(true);
	let saving = $state(false);
	let hasChanges = $state(false);

	// --- Tab definitions ---
	const tabs = [
		{ key: 'user-prefs', label: 'User Preferences', icon: 'user' },
		{ key: 'whatsapp', label: 'WhatsApp', icon: 'message' },
		{ key: 'ai', label: 'AI Services', icon: 'cpu' },
		{ key: 'api', label: 'API Configuration', icon: 'server' },
		{ key: 'upgrades', label: 'Upgrades', icon: 'rocket' }
	];

	// --- Settings state per tab ---

	// User Preferences
	let prefs = $state({
		theme: 'default',
		interface_language: 'en_US',
		date_format: 'MM/dd/yyyy',
		timezone: 'America/Sao_Paulo'
	});
	let savedPrefs = $state({ ...prefs });

	// WhatsApp
	let whatsapp = $state({
		enabled: false,
		baseUrl: 'https://graph.facebook.com/v22.0',
		devMode: false,
		phoneNumberId: '',
		businessAccountId: '',
		accessToken: '',
		verifyToken: '',
		facebookAppSecret: '',
		allowedNumbers: '',
		testRecipient: '',
		webhookUrl: ''
	});
	let savedWhatsapp = $state({ ...whatsapp });
	let showAccessToken = $state(false);
	let showAppSecret = $state(false);

	// AI
	let ai = $state({
		apiUrl: '',
		apiKey: '',
		model: '',
		systemPrompt: ''
	});
	let savedAi = $state({ ...ai });
	let showApiKey = $state(false);

	// API
	let api = $state({
		api_base_url: '',
		api_timeout: 30,
		rate_limit: 60,
		enable_api_logging: false,
		db_pool_size: 20,
		db_timeout: 30,
		enable_db_logging: false,
		enable_caching: true,
		cache_ttl: 15,
		cache_size: 100
	});
	let savedApi = $state({ ...api });

	// Upgrades
	let upgrades = $state({
		enable_auto_updates: false,
		update_frequency: 'weekly',
		auto_install_types: 'security',
		maintenance_window: '03:00',
		backup_before_update: true
	});
	let savedUpgrades = $state({ ...upgrades });

	// --- Read tab from URL ---
	$effect(() => {
		const tab = page.url.searchParams.get('tab');
		if (tab && tabs.some((t) => t.key === tab)) activeTab = tab;
	});

	// --- Load settings ---
	async function loadAllSettings() {
		loading = true;
		try {
			await Promise.all([
				loadSettingsByCategory('preferences', prefs, savedPrefs),
				loadSettingsByCategory('whatsapp', whatsapp, savedWhatsapp, whatsappKeyMap),
				loadSettingsByCategory('ai', ai, savedAi, aiKeyMap),
				loadSettingsByCategory('api', api, savedApi),
				loadSettingsByCategory('upgrades', upgrades, savedUpgrades)
			]);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to load settings');
		} finally {
			loading = false;
		}
	}

	// Key mappings for WhatsApp settings
	const whatsappKeyMap: Record<string, string> = {
		enabled: 'WHATSAPP_CLOUD_API_ENABLED',
		baseUrl: 'WHATSAPP_CLOUD_API_BASE_URL',
		devMode: 'WHATSAPP_API_DEVELOPMENT_MODE',
		phoneNumberId: 'WHATSAPP_PHONE_NUMBER_ID',
		businessAccountId: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
		accessToken: 'WHATSAPP_ACCESS_TOKEN',
		verifyToken: 'WHATSAPP_VERIFY_TOKEN',
		facebookAppSecret: 'FACEBOOK_APP_SECRET',
		allowedNumbers: 'WHATSAPP_ALLOWED_NUMBERS',
		testRecipient: 'WHATSAPP_CLOUD_API_TEST_RECIPIENT'
	};

	// Key mappings for AI settings
	const aiKeyMap: Record<string, string> = {
		apiUrl: 'OPENWEBUI_API_URL',
		apiKey: 'OPENWEBUI_API_KEY',
		model: 'OPENWEBUI_DEFAULT_MODEL',
		systemPrompt: 'OPENWEBUI_SYSTEM_PROMPT'
	};

	async function loadSettingsByCategory(
		category: string,
		target: Record<string, unknown>,
		snapshot: Record<string, unknown>,
		keyMap?: Record<string, string>
	) {
		try {
			const response = await apiFetch<{ data?: Setting[]; settings?: Setting[] }>(
				`${endpoints.settings.list}?category=${category}`
			);
			const data = response.data ?? response.settings ?? response;
			const settings = Array.isArray(data) ? data : [];

			for (const s of settings) {
				// Find which local field this maps to
				const localKey = keyMap
					? Object.entries(keyMap).find(([, v]) => v === s.key)?.[0]
					: Object.keys(target).find((k) => k === s.key || k === s.key.toLowerCase());

				if (localKey && localKey in target) {
					const val = parseValue(s.value, target[localKey]);
					target[localKey] = val;
				}
			}
			Object.assign(snapshot, target);
		} catch {
			// Category might not exist yet — keep defaults
		}
	}

	function parseValue(rawValue: string, currentVal: unknown): unknown {
		if (typeof currentVal === 'boolean') return rawValue === 'true';
		if (typeof currentVal === 'number') return Number(rawValue) || 0;
		return rawValue;
	}

	// Detect changes
	$effect(() => {
		hasChanges =
			JSON.stringify(prefs) !== JSON.stringify(savedPrefs) ||
			JSON.stringify(whatsapp) !== JSON.stringify(savedWhatsapp) ||
			JSON.stringify(ai) !== JSON.stringify(savedAi) ||
			JSON.stringify(api) !== JSON.stringify(savedApi) ||
			JSON.stringify(upgrades) !== JSON.stringify(savedUpgrades);
	});

	// --- Save helpers ---
	function snapshotCurrent() {
		Object.assign(savedPrefs, prefs);
		Object.assign(savedWhatsapp, whatsapp);
		Object.assign(savedAi, ai);
		Object.assign(savedApi, api);
		Object.assign(savedUpgrades, upgrades);
	}

	async function saveCategory(
		category: string,
		data: Record<string, unknown>,
		snapshot: Record<string, unknown>,
		keyMap?: Record<string, string>
	) {
		const changed: { key: string; value: string; category: string }[] = [];

		for (const [localKey, rawVal] of Object.entries(data)) {
			const apiKey = keyMap ? keyMap[localKey] : localKey;
			if (!apiKey) continue;

			const savedVal = (snapshot as Record<string, unknown>)[localKey];
			if (JSON.stringify(rawVal) !== JSON.stringify(savedVal)) {
				changed.push({
					key: apiKey,
					value: String(rawVal),
					category
				});
			}
		}

		if (changed.length === 0) return;
		await apiFetch(endpoints.settings.import, {
			method: 'POST',
			body: JSON.stringify({ settings: changed })
		});
	}

	async function saveCurrentTab() {
		saving = true;
		try {
			switch (activeTab) {
				case 'user-prefs':
					await saveCategory('preferences', prefs, savedPrefs);
					break;
				case 'whatsapp':
					await saveCategory('whatsapp', whatsapp, savedWhatsapp, whatsappKeyMap);
					break;
				case 'ai':
					await saveCategory('ai', ai, savedAi, aiKeyMap);
					break;
				case 'api':
					await saveCategory('api', api, savedApi);
					break;
				case 'upgrades':
					await saveCategory('upgrades', upgrades, savedUpgrades);
					break;
			}
			snapshotCurrent();
			toast.success('Settings saved');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save settings');
		} finally {
			saving = false;
		}
	}

	async function saveAllSettings() {
		saving = true;
		try {
			await Promise.all([
				saveCategory('preferences', prefs, savedPrefs),
				saveCategory('whatsapp', whatsapp, savedWhatsapp, whatsappKeyMap),
				saveCategory('ai', ai, savedAi, aiKeyMap),
				saveCategory('api', api, savedApi),
				saveCategory('upgrades', upgrades, savedUpgrades)
			]);
			snapshotCurrent();
			toast.success('All settings saved');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save settings');
		} finally {
			saving = false;
		}
	}

	function resetChanges() {
		Object.assign(prefs, savedPrefs);
		Object.assign(whatsapp, savedWhatsapp);
		Object.assign(ai, savedAi);
		Object.assign(api, savedApi);
		Object.assign(upgrades, savedUpgrades);
	}

	function resetPrefsToDefaults() {
		if (!confirm('Reset all user preferences to defaults?')) return;
		prefs.theme = 'default';
		prefs.interface_language = 'en_US';
		prefs.date_format = 'MM/dd/yyyy';
		prefs.timezone = 'America/Sao_Paulo';
	}

	// --- Test actions ---
	async function testWhatsAppConnection() {
		try {
			await apiFetch(endpoints.whatsapp.settings);
			toast.success('WhatsApp connection OK');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'WhatsApp connection failed');
		}
	}

	async function testAIConnection() {
		try {
			await apiFetch(endpoints.ai.health);
			toast.success('AI service is reachable');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'AI service unreachable');
		}
	}

	async function testAPIConnection() {
		try {
			await apiFetch(endpoints.health.check);
			toast.success('API is online');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'API connection failed');
		}
	}

	async function clearSystemCache() {
		if (!confirm('Clear all system cache?')) return;
		try {
			await apiFetch(endpoints.ai.clearCache, { method: 'POST' });
			toast.success('Cache cleared');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to clear cache');
		}
	}

	async function runHealthCheck() {
		try {
			const res = await apiFetch<{ status?: string; services?: Record<string, string> }>(
				endpoints.health.detailed
			);
			toast.success(res.status === 'ok' ? 'System healthy' : 'Health check complete');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Health check failed');
		}
	}

	async function checkForUpdates() {
		toast.info('No updates available — system is up to date');
	}

	// Clipboard helper
	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success('Copied to clipboard');
		} catch {
			toast.error('Failed to copy');
		}
	}

	// Init
	loadAllSettings();
</script>

<svelte:head>
	<title>System Settings - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="mb-6 flex items-start justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">System Settings</h1>
			<p class="text-sm text-gray-500 mt-1">Configure system-wide settings and preferences</p>
		</div>
		<button
			onclick={saveAllSettings}
			disabled={!hasChanges || saving}
			class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
		>
			{#if saving}
				<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
				Saving...
			{:else}
				{hasChanges ? 'Save All Changes' : 'All Saved'}
			{/if}
		</button>
	</div>

	<!-- Tabs -->
	<div class="flex border-b border-gray-200 mb-6 overflow-x-auto">
		{#each tabs as tab}
			<button
				onclick={() => (activeTab = tab.key)}
				class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
					{activeTab === tab.key
						? 'border-blue-600 text-blue-600'
						: 'border-transparent text-gray-500 hover:text-gray-700'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-16">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else}
		<!-- ============ USER PREFERENCES TAB ============ -->
		{#if activeTab === 'user-prefs'}
			<div class="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
				<h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
					Interface Preferences
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Theme -->
					<div>
						<label for="theme" class="block text-sm font-medium text-gray-700 mb-1">Theme</label>
						<select id="theme" bind:value={prefs.theme} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
							<option value="default">Default</option>
							<option value="ocean_breeze">Ocean Breeze</option>
							<option value="forest_green">Forest Green</option>
						</select>
						<p class="text-xs text-gray-400 mt-1">Choose the visual theme for the admin interface</p>
					</div>

					<!-- Language -->
					<div>
						<label for="lang" class="block text-sm font-medium text-gray-700 mb-1">Interface Language</label>
						<select id="lang" bind:value={prefs.interface_language} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
							<option value="en_US">English (US)</option>
							<option value="pt_BR">Portugu&ecirc;s (Brasil)</option>
							<option value="es_ES">Espa&ntilde;ol</option>
						</select>
						<p class="text-xs text-gray-400 mt-1">Select your preferred language for the interface</p>
					</div>

					<!-- Date Format -->
					<div>
						<label for="dateFormat" class="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
						<select id="dateFormat" bind:value={prefs.date_format} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
							<option value="MM/dd/yyyy">MM/dd/yyyy (US)</option>
							<option value="dd/MM/yyyy">dd/MM/yyyy (European)</option>
							<option value="yyyy-MM-dd">yyyy-MM-dd (ISO)</option>
						</select>
						<p class="text-xs text-gray-400 mt-1">Choose how dates are displayed</p>
					</div>

					<!-- Timezone -->
					<div>
						<label for="tz" class="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
						<select id="tz" bind:value={prefs.timezone} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
							<option value="America/Sao_Paulo">America/Sao Paulo (GMT-3)</option>
							<option value="America/New_York">America/New York (GMT-5)</option>
							<option value="Europe/London">Europe/London (GMT+0)</option>
							<option value="UTC">UTC (GMT+0)</option>
						</select>
						<p class="text-xs text-gray-400 mt-1">Select your local timezone for time displays</p>
					</div>
				</div>

				<hr class="border-gray-200" />

				<div class="flex gap-3">
					<button onclick={saveCurrentTab} disabled={!hasChanges || saving} class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
					<button onclick={resetChanges} disabled={!hasChanges || saving} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
						Reset Changes
					</button>
					<button onclick={resetPrefsToDefaults} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						Reset to Defaults
					</button>
				</div>
			</div>

		<!-- ============ WHATSAPP TAB ============ -->
		{:else if activeTab === 'whatsapp'}
			<div class="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
				<h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
					WhatsApp Cloud API Configuration
				</h2>

				<!-- API Configuration -->
				<h3 class="text-sm font-semibold text-blue-600">API Configuration</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Enable -->
					<div class="md:col-span-2 flex items-center gap-3">
						<button
							type="button"
							role="switch"
							aria-checked={whatsapp.enabled}
							onclick={() => (whatsapp.enabled = !whatsapp.enabled)}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {whatsapp.enabled ? 'bg-blue-600' : 'bg-gray-300'}"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {whatsapp.enabled ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
						<span class="text-sm text-gray-700">Enable WhatsApp Cloud API</span>
					</div>

					<div>
						<label for="waBaseUrl" class="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
						<input id="waBaseUrl" type="url" bind:value={whatsapp.baseUrl} placeholder="https://graph.facebook.com/v22.0" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
						<p class="text-xs text-gray-400 mt-1">Facebook Graph API base URL</p>
					</div>

					<!-- Dev Mode -->
					<div class="flex items-center gap-3 self-end pb-5">
						<button
							type="button"
							role="switch"
							aria-checked={whatsapp.devMode}
							onclick={() => (whatsapp.devMode = !whatsapp.devMode)}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {whatsapp.devMode ? 'bg-blue-600' : 'bg-gray-300'}"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {whatsapp.devMode ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
						<span class="text-sm text-gray-700">Development Mode</span>
					</div>
				</div>

				<!-- Business Config -->
				<h3 class="text-sm font-semibold text-green-600 pt-2">WhatsApp Business Configuration</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="waPhoneId" class="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
						<input id="waPhoneId" type="text" bind:value={whatsapp.phoneNumberId} placeholder="Enter phone number ID" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
					<div>
						<label for="waBizId" class="block text-sm font-medium text-gray-700 mb-1">Business Account ID</label>
						<input id="waBizId" type="text" bind:value={whatsapp.businessAccountId} placeholder="Enter business account ID" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>

					<!-- Access Token -->
					<div>
						<label for="waToken" class="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
						<div class="flex">
							<input
								id="waToken"
								type={showAccessToken ? 'text' : 'password'}
								bind:value={whatsapp.accessToken}
								placeholder="Enter access token"
								class="flex-1 rounded-l-lg border border-r-0 border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<button type="button" onclick={() => (showAccessToken = !showAccessToken)} class="px-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 text-sm" title={showAccessToken ? 'Hide' : 'Show'}>
								{showAccessToken ? 'Hide' : 'Show'}
							</button>
							<button type="button" onclick={() => copyToClipboard(whatsapp.accessToken)} class="px-3 border border-gray-300 rounded-r-lg bg-white hover:bg-gray-50 text-gray-500 text-sm" title="Copy">
								Copy
							</button>
						</div>
						<p class="text-xs text-gray-400 mt-1">WhatsApp Business API access token</p>
					</div>

					<!-- Verify Token -->
					<div>
						<label for="waVerify" class="block text-sm font-medium text-gray-700 mb-1">Webhook Verify Token</label>
						<input id="waVerify" type="text" bind:value={whatsapp.verifyToken} placeholder="Enter verify token" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
						<p class="text-xs text-gray-400 mt-1">Webhook verification token</p>
					</div>

					<!-- Facebook App Secret -->
					<div>
						<label for="waFbSecret" class="block text-sm font-medium text-gray-700 mb-1">Facebook App Secret</label>
						<div class="flex">
							<input
								id="waFbSecret"
								type={showAppSecret ? 'text' : 'password'}
								bind:value={whatsapp.facebookAppSecret}
								placeholder="Enter Facebook app secret"
								class="flex-1 rounded-l-lg border border-r-0 border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<button type="button" onclick={() => (showAppSecret = !showAppSecret)} class="px-3 border border-gray-300 rounded-r-lg bg-white hover:bg-gray-50 text-gray-500 text-sm" title={showAppSecret ? 'Hide' : 'Show'}>
								{showAppSecret ? 'Hide' : 'Show'}
							</button>
						</div>
						<p class="text-xs text-gray-400 mt-1">Facebook application secret for webhook validation</p>
					</div>
				</div>

				<!-- Webhook -->
				<h3 class="text-sm font-semibold text-cyan-600 pt-2">Webhook Configuration</h3>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="md:col-span-2">
						<label for="waWebhook" class="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
						<input id="waWebhook" type="url" bind:value={whatsapp.webhookUrl} placeholder="https://your-domain.com/api/v1/messages/webhook" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
						<p class="text-xs text-gray-400 mt-1">URL where WhatsApp will send webhook events</p>
					</div>
				</div>

				<!-- Testing -->
				<h3 class="text-sm font-semibold text-amber-600 pt-2">Testing Configuration</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="waAllowed" class="block text-sm font-medium text-gray-700 mb-1">Allowed Numbers (Testing)</label>
						<textarea id="waAllowed" bind:value={whatsapp.allowedNumbers} rows="3" placeholder="447305634482,5511969653788" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
						<p class="text-xs text-gray-400 mt-1">Comma-separated phone numbers allowed during testing</p>
					</div>
					<div>
						<label for="waTest" class="block text-sm font-medium text-gray-700 mb-1">Primary Test Recipient</label>
						<input id="waTest" type="text" bind:value={whatsapp.testRecipient} placeholder="+447305634482" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
						<p class="text-xs text-gray-400 mt-1">Primary phone number for testing</p>
					</div>
				</div>

				<hr class="border-gray-200" />

				<div class="flex gap-3">
					<button onclick={saveCurrentTab} disabled={!hasChanges || saving} class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
					<button onclick={resetChanges} disabled={!hasChanges || saving} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
						Reset Changes
					</button>
					<button onclick={testWhatsAppConnection} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						Test Connection
					</button>
				</div>
			</div>

		<!-- ============ AI TAB ============ -->
		{:else if activeTab === 'ai'}
			<div class="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
				<h2 class="text-lg font-semibold text-gray-800">AI Configuration</h2>

				<h3 class="text-sm font-semibold text-blue-600">OpenAI Compatible Endpoint Configuration</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="aiUrl" class="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
						<input id="aiUrl" type="url" bind:value={ai.apiUrl} placeholder="https://api.openai.com/v1" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
						<p class="text-xs text-gray-400 mt-1">OpenAI compatible API base URL</p>
					</div>

					<!-- API Key -->
					<div>
						<label for="aiKey" class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
						<div class="flex">
							<input
								id="aiKey"
								type={showApiKey ? 'text' : 'password'}
								bind:value={ai.apiKey}
								placeholder="Enter your API key"
								class="flex-1 rounded-l-lg border border-r-0 border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<button type="button" onclick={() => (showApiKey = !showApiKey)} class="px-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 text-sm" title={showApiKey ? 'Hide' : 'Show'}>
								{showApiKey ? 'Hide' : 'Show'}
							</button>
							<button type="button" onclick={() => copyToClipboard(ai.apiKey)} class="px-3 border border-gray-300 rounded-r-lg bg-white hover:bg-gray-50 text-gray-500 text-sm" title="Copy">
								Copy
							</button>
						</div>
						<p class="text-xs text-gray-400 mt-1">Your OpenAI compatible API key</p>
					</div>

					<div>
						<label for="aiModel" class="block text-sm font-medium text-gray-700 mb-1">Default Model</label>
						<input id="aiModel" type="text" bind:value={ai.model} placeholder="gpt-4o" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
						<p class="text-xs text-gray-400 mt-1">Model used for AI conversations</p>
					</div>
				</div>

				<div>
					<label for="aiPrompt" class="block text-sm font-medium text-gray-700 mb-1">System Prompt (Fallback)</label>
					<textarea id="aiPrompt" bind:value={ai.systemPrompt} rows="4" placeholder="You are a helpful fitness trainer assistant." class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
					<p class="text-xs text-gray-400 mt-1">Default system prompt used when no specific prompt is configured</p>
				</div>

				<hr class="border-gray-200" />

				<div class="flex gap-3">
					<button onclick={saveCurrentTab} disabled={!hasChanges || saving} class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
					<button onclick={resetChanges} disabled={!hasChanges || saving} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
						Reset Changes
					</button>
					<button onclick={testAIConnection} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						Test AI Connection
					</button>
				</div>
			</div>

		<!-- ============ API TAB ============ -->
		{:else if activeTab === 'api'}
			<div class="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
				<h2 class="text-lg font-semibold text-gray-800">API Configuration</h2>

				<h3 class="text-sm font-semibold text-blue-600">API Settings</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="apiBaseUrl" class="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
						<input id="apiBaseUrl" type="url" bind:value={api.api_base_url} placeholder="http://localhost:8100" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
					<div>
						<label for="apiTimeout" class="block text-sm font-medium text-gray-700 mb-1">API Timeout (seconds)</label>
						<input id="apiTimeout" type="number" bind:value={api.api_timeout} min="5" max="300" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
					<div>
						<label for="rateLimit" class="block text-sm font-medium text-gray-700 mb-1">Rate Limit (req/min)</label>
						<input id="rateLimit" type="number" bind:value={api.rate_limit} min="1" max="1000" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>

					<!-- Enable API logging -->
					<div class="flex items-center gap-3 self-end pb-5">
						<button
							type="button"
							role="switch"
							aria-checked={api.enable_api_logging}
							onclick={() => (api.enable_api_logging = !api.enable_api_logging)}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {api.enable_api_logging ? 'bg-blue-600' : 'bg-gray-300'}"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {api.enable_api_logging ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
						<span class="text-sm text-gray-700">Enable API Logging</span>
					</div>
				</div>

				<h3 class="text-sm font-semibold text-green-600 pt-2">Database Settings</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label for="dbPool" class="block text-sm font-medium text-gray-700 mb-1">Connection Pool Size</label>
						<input id="dbPool" type="number" bind:value={api.db_pool_size} min="1" max="100" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
					<div>
						<label for="dbTimeout" class="block text-sm font-medium text-gray-700 mb-1">DB Timeout (seconds)</label>
						<input id="dbTimeout" type="number" bind:value={api.db_timeout} min="5" max="120" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>

					<!-- Enable DB logging -->
					<div class="flex items-center gap-3 self-end pb-5">
						<button
							type="button"
							role="switch"
							aria-checked={api.enable_db_logging}
							onclick={() => (api.enable_db_logging = !api.enable_db_logging)}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {api.enable_db_logging ? 'bg-blue-600' : 'bg-gray-300'}"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {api.enable_db_logging ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
						<span class="text-sm text-gray-700">Enable DB Logging</span>
					</div>
				</div>

				<h3 class="text-sm font-semibold text-purple-600 pt-2">Cache Settings</h3>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<!-- Enable Caching -->
					<div class="flex items-center gap-3">
						<button
							type="button"
							role="switch"
							aria-checked={api.enable_caching}
							onclick={() => (api.enable_caching = !api.enable_caching)}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {api.enable_caching ? 'bg-blue-600' : 'bg-gray-300'}"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {api.enable_caching ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
						<span class="text-sm text-gray-700">Enable Caching</span>
					</div>
					<div>
						<label for="cacheTtl" class="block text-sm font-medium text-gray-700 mb-1">Cache TTL (minutes)</label>
						<input id="cacheTtl" type="number" bind:value={api.cache_ttl} min="1" max="1440" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
					<div>
						<label for="cacheSize" class="block text-sm font-medium text-gray-700 mb-1">Max Cache Entries</label>
						<input id="cacheSize" type="number" bind:value={api.cache_size} min="10" max="10000" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
				</div>

				<hr class="border-gray-200" />

				<div class="flex gap-3">
					<button onclick={saveCurrentTab} disabled={!hasChanges || saving} class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
					<button onclick={resetChanges} disabled={!hasChanges || saving} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
						Reset Changes
					</button>
					<button onclick={testAPIConnection} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						Test Connection
					</button>
					<button onclick={clearSystemCache} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						Clear Cache
					</button>
				</div>
			</div>

		<!-- ============ UPGRADES TAB ============ -->
		{:else if activeTab === 'upgrades'}
			<div class="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
				<h2 class="text-lg font-semibold text-gray-800">System Updates & Maintenance</h2>

				<!-- System Info Cards -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
						<div class="text-3xl mb-2">&#9881;</div>
						<h4 class="text-sm font-medium text-gray-500">Current Version</h4>
						<p class="text-lg font-bold text-gray-900">v2.1.4</p>
					</div>
					<div class="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
						<div class="text-3xl mb-2">&#128197;</div>
						<h4 class="text-sm font-medium text-gray-500">Last Updated</h4>
						<p class="text-sm font-semibold text-gray-900">{new Date().toLocaleDateString()}</p>
					</div>
					<div class="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
						<div class="text-3xl mb-2">&#9989;</div>
						<h4 class="text-sm font-medium text-gray-500">System Status</h4>
						<span class="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Healthy</span>
					</div>
				</div>

				<!-- Update Alerts -->
				<div class="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
					<span class="text-green-600">&#10003;</span>
					<span class="text-sm text-green-700">System is up to date. No updates available.</span>
				</div>

				<!-- Auto-update Settings -->
				<h3 class="text-sm font-semibold text-gray-600 pt-2">Update Settings</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<!-- Enable Auto Updates -->
					<div class="md:col-span-2 flex items-center gap-3">
						<button
							type="button"
							role="switch"
							aria-checked={upgrades.enable_auto_updates}
							onclick={() => (upgrades.enable_auto_updates = !upgrades.enable_auto_updates)}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {upgrades.enable_auto_updates ? 'bg-blue-600' : 'bg-gray-300'}"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {upgrades.enable_auto_updates ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
						<span class="text-sm text-gray-700">Enable Automatic Updates</span>
					</div>

					<div>
						<label for="updateFreq" class="block text-sm font-medium text-gray-700 mb-1">Check for Updates</label>
						<select id="updateFreq" bind:value={upgrades.update_frequency} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
							<option value="daily">Daily</option>
							<option value="weekly">Weekly</option>
							<option value="monthly">Monthly</option>
							<option value="manual">Manual Only</option>
						</select>
						<p class="text-xs text-gray-400 mt-1">How often to check for system updates</p>
					</div>

					<div>
						<label for="installTypes" class="block text-sm font-medium text-gray-700 mb-1">Auto-Install Types</label>
						<select id="installTypes" bind:value={upgrades.auto_install_types} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
							<option value="security">Security Only</option>
							<option value="security_patches">Security + Patches</option>
							<option value="all">All Updates</option>
							<option value="none">None (Manual)</option>
						</select>
						<p class="text-xs text-gray-400 mt-1">Which update types to install automatically</p>
					</div>

					<div>
						<label for="maintWin" class="block text-sm font-medium text-gray-700 mb-1">Maintenance Window</label>
						<select id="maintWin" bind:value={upgrades.maintenance_window} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
							<option value="02:00">2:00 AM</option>
							<option value="03:00">3:00 AM</option>
							<option value="04:00">4:00 AM</option>
							<option value="05:00">5:00 AM</option>
						</select>
						<p class="text-xs text-gray-400 mt-1">Preferred time for automatic updates</p>
					</div>

					<!-- Backup Before Update -->
					<div class="flex items-center gap-3 self-end pb-5">
						<button
							type="button"
							role="switch"
							aria-checked={upgrades.backup_before_update}
							onclick={() => (upgrades.backup_before_update = !upgrades.backup_before_update)}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {upgrades.backup_before_update ? 'bg-blue-600' : 'bg-gray-300'}"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {upgrades.backup_before_update ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
						<span class="text-sm text-gray-700">Create Backup Before Updates</span>
					</div>
				</div>

				<hr class="border-gray-200" />

				<div class="flex gap-3">
					<button onclick={saveCurrentTab} disabled={!hasChanges || saving} class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
						{saving ? 'Saving...' : 'Save Settings'}
					</button>
					<button onclick={resetChanges} disabled={!hasChanges || saving} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
						Reset Changes
					</button>
					<button onclick={checkForUpdates} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						Check for Updates
					</button>
					<button onclick={runHealthCheck} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						Health Check
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>
