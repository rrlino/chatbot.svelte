<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { QrCode, RefreshCw, Link2, Unlink, ExternalLink, Trash2, Download, Terminal, BarChart3, Activity } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { toast } from '$stores/toast';
	import { endpoints } from '$config/endpoints';

	interface LogEntry {
		timestamp: string;
		level: 'info' | 'warning' | 'error' | 'success';
		message: string;
	}

	let connectionState = $state<'connected' | 'connecting' | 'disconnected'>('connecting');
	let lastUpdated = $state<string | null>(null);
	let connectedUser = $state<string | null>(null);
	let messagesSent = $state(0);
	let messagesReceived = $state(0);
	let uptime = $state(0);
	let connectionQuality = $state<'good' | 'fair' | 'poor'>('good');
	let logs = $state<LogEntry[]>([]);
	let autoScroll = $state(true);
	let qrUrl = $state('');
	let qrStatusText = $state('Initializing...');
	let logContainerEl: HTMLDivElement | undefined = $state();

	let simulationInterval: ReturnType<typeof setInterval> | null = null;

	const formattedUptime = $derived(() => {
		const hours = Math.floor(uptime / 3600);
		const minutes = Math.floor((uptime % 3600) / 60);
		const seconds = uptime % 60;
		return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	});

	function addLog(level: LogEntry['level'], message: string) {
		const entry: LogEntry = { timestamp: new Date().toISOString(), level, message };
		logs = [...logs, entry];
		if (logs.length > 100) logs = logs.slice(-100);
		if (autoScroll && logContainerEl) {
			requestAnimationFrame(() => {
				if (logContainerEl) logContainerEl.scrollTop = logContainerEl.scrollHeight;
			});
		}
	}

	function formatDate(dateString: string): string {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleString();
	}

	function formatLogTime(timestamp: string): string {
		return new Date(timestamp).toLocaleTimeString();
	}

	function connectWhatsApp() {
		connectionState = 'connecting';
		lastUpdated = new Date().toISOString();
		addLog('info', 'Initiating WhatsApp connection...');
		toast.success('Connection initiated');
	}

	function disconnectWhatsApp() {
		connectionState = 'disconnected';
		lastUpdated = new Date().toISOString();
		connectedUser = null;
		addLog('info', 'WhatsApp disconnected');
		toast.success('Disconnected');
	}

	function reconnectWhatsApp() {
		connectionState = 'connecting';
		lastUpdated = new Date().toISOString();
		addLog('info', 'Reconnecting to WhatsApp service...');
		setTimeout(() => {
			connectionState = 'connected';
			lastUpdated = new Date().toISOString();
			addLog('info', 'Reconnected successfully');
		}, 2000);
		toast.success('Reconnection initiated');
	}

	function clearLogs() {
		logs = [];
		toast.success('Logs cleared');
	}

	function downloadLogs() {
		const logsText = logs
			.map((l) => `[${formatLogTime(l.timestamp)}] ${l.level.toUpperCase()}: ${l.message}`)
			.join('\n');
		const blob = new Blob([logsText], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `whatsapp-logs-${new Date().toISOString().split('T')[0]}.txt`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success('Logs downloaded');
	}

	function startSimulation() {
		addLog('info', 'WhatsApp Web Connector initialized');
		setTimeout(() => {
			connectionState = 'connected';
			connectedUser = '+55 11 99999-9999';
			lastUpdated = new Date().toISOString();
			addLog('info', 'Connected to WhatsApp Web successfully');
		}, 3000);

		simulationInterval = setInterval(() => {
			if (connectionState === 'connected') {
				uptime++;
				if (Math.random() < 0.1) {
					if (Math.random() < 0.6) {
						messagesReceived++;
						addLog('info', 'Received message from user');
					} else {
						messagesSent++;
						addLog('info', 'Sent response to user');
					}
				}
			}
		}, 1000);
	}

	onMount(() => {
		startSimulation();
	});

	onDestroy(() => {
		if (simulationInterval) clearInterval(simulationInterval);
	});
</script>

<svelte:head>
	<title>WhatsApp Web Connector - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
		<div class="flex items-center justify-between mb-2">
			<h1 class="text-xl font-bold text-gray-900">WhatsApp Web Connector</h1>
			<div class="flex items-center gap-2 text-sm">
				<div class="h-2.5 w-2.5 rounded-full {connectionState === 'connected' ? 'bg-green-500' : 'bg-red-500'}"></div>
				<span class="font-medium text-gray-600">
					{connectionState === 'connected' ? 'Connected' : connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
				</span>
			</div>
		</div>
		<p class="text-sm text-gray-500">Connect and manage your WhatsApp Web session for real-time messaging</p>
	</div>

	<!-- QR Code + Stats -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
		<!-- QR Code -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			<div class="px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold flex items-center gap-2">
					<QrCode class="h-5 w-5 text-blue-600" />
					Connection Status
				</h2>
			</div>
			<div class="p-6 text-center">
				{#if connectionState === 'connected'}
					<div class="py-4">
						<Activity class="h-16 w-16 text-green-500 mx-auto mb-3" />
						<h3 class="text-lg font-semibold text-green-600 mb-1">Connected</h3>
						<p class="text-sm text-gray-500 mb-4">WhatsApp Web is connected and ready</p>
						<button onclick={disconnectWhatsApp} class="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 text-sm rounded-lg hover:bg-red-50 transition-colors">
							<Unlink class="h-4 w-4" />
							Disconnect
						</button>
					</div>
				{:else if connectionState === 'connecting'}
					<div class="py-4">
						<div class="flex items-center justify-center gap-2 text-gray-500 mb-4">
							<div class="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent"></div>
							<span class="text-sm">Awaiting connection...</span>
						</div>
						<div class="flex items-center justify-center min-h-[200px] border border-dashed border-gray-300 rounded-lg p-4">
							{#if qrUrl}
								<img src={qrUrl} alt="WhatsApp QR Code" class="max-w-[200px] rounded-lg" />
							{:else}
								<span class="text-sm text-gray-400">Waiting for QR code...</span>
							{/if}
						</div>
						<p class="text-xs text-gray-400 mt-2">Status: {qrStatusText}</p>
					</div>
				{:else}
					<div class="py-4">
						<p class="text-sm text-gray-500 mb-4">Scan the QR code with WhatsApp to connect</p>
						<div class="flex items-center justify-center min-h-[200px] border border-dashed border-gray-300 rounded-lg p-4 mb-4">
							{#if qrUrl}
								<img src={qrUrl} alt="WhatsApp QR Code" class="max-w-[200px] rounded-lg" />
							{:else}
								<span class="text-sm text-gray-400">Waiting for QR code...</span>
							{/if}
						</div>
						<div class="flex items-center justify-center gap-2">
							<button onclick={connectWhatsApp} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
								<Link2 class="h-4 w-4" />
								Connect
							</button>
							<button onclick={() => window.open('http://localhost:8102/', '_blank')} class="flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors">
								<ExternalLink class="h-4 w-4" />
								Open in New Tab
							</button>
						</div>
					</div>
				{/if}

				<div class="mt-4 pt-3 border-t border-gray-100">
					<p class="text-xs text-gray-400">
						Last updated: {lastUpdated ? formatDate(lastUpdated) : '-'}
					</p>
				</div>
			</div>
		</div>

		<!-- Statistics -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
				<h2 class="text-lg font-semibold flex items-center gap-2">
					<BarChart3 class="h-5 w-5 text-blue-600" />
					Statistics
				</h2>
				<button onclick={async () => { addLog('info', 'Refreshing...'); toast.success('Refreshed'); }} class="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
					<RefreshCw class="h-3.5 w-3.5" /> Refresh
				</button>
			</div>
			<div class="p-6">
				<div class="grid grid-cols-2 gap-4 text-center">
					<div class="border-r border-gray-100">
						<h3 class="text-2xl font-bold text-blue-600">{messagesSent}</h3>
						<p class="text-xs text-gray-500">Messages Sent</p>
					</div>
					<div>
						<h3 class="text-2xl font-bold text-green-600">{messagesReceived}</h3>
						<p class="text-xs text-gray-500">Messages Received</p>
					</div>
					<div class="border-r border-gray-100 pt-2">
						<h4 class="text-sm font-medium text-gray-700">{connectedUser ?? '-'}</h4>
						<p class="text-xs text-gray-500">Connected User</p>
					</div>
					<div class="pt-2">
						<h4 class="text-sm font-medium text-blue-600">{formattedUptime()}</h4>
						<p class="text-xs text-gray-500">Uptime</p>
					</div>
				</div>
				<div class="text-center mt-4 pt-4 border-t border-gray-100">
					<span class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
						{connectionQuality === 'good' ? 'bg-green-100 text-green-700' : connectionQuality === 'fair' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}">
						{connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
					</span>
					<p class="text-xs text-gray-400 mt-1">Connection Quality</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Real-time Logs -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200">
		<div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
			<h2 class="text-lg font-semibold flex items-center gap-2">
				<Terminal class="h-5 w-5 text-blue-600" />
				Real-time Logs
			</h2>
			<div class="flex items-center gap-1">
				<button onclick={clearLogs} title="Clear logs" class="p-1.5 border border-gray-300 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
					<Trash2 class="h-4 w-4" />
				</button>
				<button onclick={downloadLogs} title="Download logs" class="p-1.5 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
					<Download class="h-4 w-4" />
				</button>
				<button onclick={reconnectWhatsApp} title="Reconnect" class="p-1.5 border border-gray-300 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
					<RefreshCw class="h-4 w-4" />
				</button>
			</div>
		</div>
		<div class="bg-gray-900 p-3 font-mono text-sm overflow-y-auto" style="height: 400px;" bind:this={logContainerEl}>
			{#each logs as log}
				<div class="mb-1 leading-relaxed">
					<span class="text-gray-500">[{formatLogTime(log.timestamp)}]</span>
					<span class={
						log.level === 'error' ? 'text-red-400' :
						log.level === 'warning' ? 'text-yellow-400' :
						log.level === 'success' ? 'text-green-400' :
						'text-blue-400'
					}>
						{log.message}
					</span>
				</div>
			{/each}
			{#if logs.length === 0}
				<div class="text-gray-500 text-center py-12">
					<Terminal class="h-8 w-8 mx-auto mb-2" />
					<p>No logs yet</p>
				</div>
			{/if}
		</div>
		<div class="flex items-center gap-2 px-4 py-2 bg-gray-100 border-t border-gray-200">
			<label class="relative inline-flex items-center cursor-pointer">
				<input type="checkbox" bind:checked={autoScroll} class="sr-only peer" />
				<div class="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
			</label>
			<span class="text-sm text-gray-600">Auto-scroll</span>
		</div>
	</div>
</div>
