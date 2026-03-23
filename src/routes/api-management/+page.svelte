<script lang="ts">
	import { onMount } from 'svelte';
	import { Globe, Tag, GitBranch, ShieldCheck, Download, Rocket, FileCode, FileText, Code2 } from 'lucide-svelte';

	let selectedVersion = $state('v1');
	let endpointCount = $state(356);
	let activeTab = $state('curl');
	let loading = $state(true);

	const API_PORT = typeof import.meta.env.VITE_API_PORT !== 'undefined' ? import.meta.env.VITE_API_PORT : 8100;

	const apiBaseUrl = $derived(() => {
		if (typeof window === 'undefined') return `http://localhost:${API_PORT}/api/${selectedVersion}`;
		return window.location.origin.replace(':8101', `:${API_PORT}`) + `/api/${selectedVersion}`;
	});

	const swaggerBaseUrl = $derived(() => {
		if (typeof window === 'undefined') return `http://localhost:${API_PORT}`;
		return window.location.origin.replace(':8101', `:${API_PORT}`);
	});

	async function loadApiSpec() {
		if (typeof window === 'undefined') return;
		try {
			const response = await fetch(`${swaggerBaseUrl()}/openapi.json`);
			const apiSpec = await response.json();
			let count = 0;
			if (apiSpec.paths) {
				for (const path of Object.values(apiSpec.paths)) {
					count += Object.keys(path as Record<string, unknown>).filter((m) =>
						['get', 'post', 'put', 'delete', 'patch'].includes(m)
					).length;
				}
			}
			endpointCount = count;
		} catch {
			endpointCount = 356;
		} finally {
			loading = false;
		}
	}

	async function downloadOpenApiSpec() {
		if (typeof window === 'undefined') return;
		try {
			const response = await fetch(`${swaggerBaseUrl()}/openapi.json`);
			const apiSpec = await response.json();
			const blob = new Blob([JSON.stringify(apiSpec, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `truelocal-api-${selectedVersion}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			console.error('Failed to download API spec');
		}
	}

	onMount(() => {
		loadApiSpec();
	});

	const tabs = [
		{ id: 'curl', label: 'cURL' },
		{ id: 'python', label: 'Python' },
		{ id: 'javascript', label: 'JavaScript' }
	];
</script>

<svelte:head>
	<title>API Documentation - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">API Documentation</h1>
			<p class="text-sm text-gray-500 mt-1">Interactive API documentation for partners and integrations</p>
		</div>
		<div class="flex items-center gap-2">
			<select bind:value={selectedVersion} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
				<option value="v1">API v1</option>
			</select>
			<button onclick={downloadOpenApiSpec} class="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
				<Download class="h-4 w-4" />
				Download OpenAPI Spec
			</button>
		</div>
	</div>

	<!-- API Overview Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 mb-1">Base URL</p>
					<code class="text-sm text-blue-600">{apiBaseUrl()}</code>
				</div>
				<Globe class="h-8 w-8 text-blue-500" />
			</div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 mb-1">Version</p>
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{selectedVersion}</span>
				</div>
				<Tag class="h-8 w-8 text-green-500" />
			</div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 mb-1">Endpoints</p>
					<span class="text-xl font-bold">{endpointCount}</span>
				</div>
				<GitBranch class="h-8 w-8 text-blue-500" />
			</div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 mb-1">Auth Type</p>
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Bearer Token</span>
				</div>
				<ShieldCheck class="h-8 w-8 text-yellow-500" />
			</div>
		</div>
	</div>

	<!-- Quick Start Guide -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
		<div class="border-b border-gray-200 px-6 py-4">
			<h2 class="text-lg font-semibold flex items-center gap-2">
				<Rocket class="h-5 w-5" />
				Quick Start Guide
			</h2>
		</div>
		<div class="p-6">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div class="space-y-4">
					<div>
						<h3 class="text-sm font-semibold text-gray-900">1. Get Your API Key</h3>
						<p class="text-sm text-gray-500 mt-1">Request an API key from your account manager or generate one in the partner portal.</p>
					</div>
					<div>
						<h3 class="text-sm font-semibold text-gray-900">2. Authenticate Your Requests</h3>
						<p class="text-sm text-gray-500 mt-1">Include your API key in the Authorization header:</p>
						<pre class="bg-gray-100 p-3 rounded-lg mt-2 text-sm overflow-x-auto"><code>Authorization: Bearer YOUR_API_KEY</code></pre>
					</div>
					<div>
						<h3 class="text-sm font-semibold text-gray-900">3. Make Your First Request</h3>
						<p class="text-sm text-gray-500 mt-1">Test your connection with a simple GET request:</p>
						<pre class="bg-gray-100 p-3 rounded-lg mt-2 text-sm overflow-x-auto"><code>GET {apiBaseUrl()}/health/live</code></pre>
					</div>
				</div>
				<div>
					<h3 class="text-sm font-semibold text-gray-900 mb-3">Example Code</h3>
					<!-- Tabs -->
					<div class="flex border-b border-gray-200 mb-0">
						{#each tabs as tab}
							<button
								class="px-4 py-2 text-sm {activeTab === tab.id ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}"
								onclick={() => (activeTab = tab.id)}
							>
								{tab.label}
							</button>
						{/each}
					</div>
					<div class="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
						{#if activeTab === 'curl'}
							{@const curlExample = `curl -X POST ${apiBaseUrl()}/messages/send \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\\n    "phone_number": "+5511999999999",\\n    "message": "Hello from API!"\\n  }'`}
							<pre class="text-sm"><code>{curlExample}</code></pre>
						{:else if activeTab === 'python'}
							{@const pyExample = `import requests\\n\\nresponse = requests.post(\\n    "${apiBaseUrl()}/messages/send",\\n    headers={\\n        "Authorization": "Bearer YOUR_API_KEY",\\n        "Content-Type": "application/json"\\n    },\\n    json={\\n        "phone_number": "+5511999999999",\\n        "message": "Hello from API!"\\n    }\\n)\\nprint(response.json())`}
							<pre class="text-sm"><code>{pyExample}</code></pre>
						{:else}
							{@const jsExample = `const response = await fetch('${apiBaseUrl()}/messages/send', {\\n  method: 'POST',\\n  headers: {\\n    'Authorization': 'Bearer YOUR_API_KEY',\\n    'Content-Type': 'application/json'\\n  },\\n  body: JSON.stringify({\\n    phone_number: '+5511999999999',\\n    message: 'Hello from API!'\\n  })\\n});\\nconst data = await response.json();`}
							<pre class="text-sm"><code>{jsExample}</code></pre>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Interactive API Explorer -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200">
		<div class="border-b border-gray-200 px-6 py-4">
			<h2 class="text-lg font-semibold flex items-center gap-2">
				<FileText class="h-5 w-5" />
				Interactive API Explorer
			</h2>
		</div>
		<div class="p-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="text-center p-6 rounded-lg border border-gray-200">
					<FileCode class="h-12 w-12 text-blue-600 mx-auto mb-3" />
					<h3 class="font-semibold mb-1">Swagger UI</h3>
					<p class="text-xs text-gray-500 mb-4">Interactive API documentation with "Try it out" functionality</p>
					<a href={swaggerBaseUrl() + '/docs'} target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
						Open Swagger UI
					</a>
				</div>
				<div class="text-center p-6 rounded-lg border border-gray-200">
					<FileText class="h-12 w-12 text-green-600 mx-auto mb-3" />
					<h3 class="font-semibold mb-1">ReDoc</h3>
					<p class="text-xs text-gray-500 mb-4">Clean, responsive documentation with detailed examples</p>
					<a href={swaggerBaseUrl() + '/redoc'} target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
						Open ReDoc
					</a>
				</div>
				<div class="text-center p-6 rounded-lg border border-gray-200">
					<Code2 class="h-12 w-12 text-blue-500 mx-auto mb-3" />
					<h3 class="font-semibold mb-1">OpenAPI Schema</h3>
					<p class="text-xs text-gray-500 mb-4">Raw OpenAPI JSON specification for code generation</p>
					<a href={swaggerBaseUrl() + '/openapi.json'} target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">
						<Download class="h-4 w-4" />
						View JSON Schema
					</a>
				</div>
			</div>
			<div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
				<strong>Pro Tip:</strong> Use the Swagger UI for interactive testing, ReDoc for comprehensive reading, and download the OpenAPI JSON for code generation tools.
			</div>
		</div>
	</div>
</div>
