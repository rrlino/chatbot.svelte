<script lang="ts">
	import type { PageData } from './$types';
	import {
		Globe, Tag, GitBranch, ShieldCheck, Rocket, FileCode, FileText, Code2,
		Download, Users, Gauge, Activity, AlertCircle, CheckCircle2, ExternalLink
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'curl' | 'python' | 'javascript'>('curl');

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function statusBadge(status: string): string {
		if (status === 'active') return 'bg-green-100 text-green-700';
		if (status === 'inactive') return 'bg-gray-100 text-gray-600';
		if (status === 'suspended') return 'bg-red-100 text-red-700';
		return 'bg-yellow-100 text-yellow-700';
	}

	function usageColor(pct: number): string {
		if (pct >= 90) return 'text-red-600';
		if (pct >= 70) return 'text-yellow-600';
		return 'text-green-600';
	}

	function downloadOpenApiSpec() {
		const blob = new Blob([JSON.stringify({ info: { title: 'TrueLocal API', version: 'v1' }, openapi: '3.0.0' }, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'truelocal-api-v1.json';
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>API Management - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
				<Globe class="h-7 w-7" />
				API Management
			</h1>
			<p class="text-sm text-gray-500 mt-1">Monitor partners, rate limits, and API documentation</p>
		</div>
		<button onclick={downloadOpenApiSpec} class="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
			<Download class="h-4 w-4" />
			Download OpenAPI Spec
		</button>
	</div>

	<!-- Overview Stats -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 mb-1">API Endpoints</p>
					<span class="text-xl font-bold">{data.endpointCount}</span>
				</div>
				<GitBranch class="h-8 w-8 text-blue-500" />
			</div>
			<p class="text-xs text-gray-400 mt-1 font-mono truncate">{data.apiBaseUrl}</p>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 mb-1">Active Partners</p>
					<span class="text-xl font-bold">{data.activePartners}</span>
				</div>
				<Users class="h-8 w-8 text-green-500" />
			</div>
			<p class="text-xs text-gray-400 mt-1">{data.partners.length} total partners</p>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 mb-1">Monthly Requests</p>
					<span class="text-xl font-bold">{data.totalMonthlyRequests.toLocaleString()}</span>
				</div>
				<Gauge class="h-8 w-8 text-purple-500" />
			</div>
			<p class="text-xs text-gray-400 mt-1">Current billing period</p>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 mb-1">Auth / Version</p>
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Bearer Token</span>
				</div>
				<ShieldCheck class="h-8 w-8 text-yellow-500" />
			</div>
			<p class="text-xs text-gray-400 mt-1">API v1 &middot; OAuth2 Bearer</p>
		</div>
	</div>

	<!-- Partners Table -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
		<div class="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold flex items-center gap-2">
				<Users class="h-5 w-5" />
				API Partners
			</h2>
			<span class="text-xs text-gray-400">{data.partners.length} registered</span>
		</div>
		{#if data.partners.length === 0}
			<div class="p-8 text-center text-gray-400">
				<Users class="h-10 w-10 mx-auto mb-2 text-gray-300" />
				<p class="text-sm">No partners registered yet</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-gray-50 text-xs text-gray-500 uppercase">
						<tr>
							<th class="px-4 py-3 text-left">Partner</th>
							<th class="px-4 py-3 text-left">Plan</th>
							<th class="px-4 py-3 text-left">Status</th>
							<th class="px-4 py-3 text-right">Usage</th>
							<th class="px-4 py-3 text-left">Integration</th>
							<th class="px-4 py-3 text-left">Last Activity</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each data.partners as partner (partner.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3">
									<p class="font-medium text-gray-900">{partner.company_name}</p>
									<p class="text-xs text-gray-400">{partner.contact_name} &middot; {partner.contact_email}</p>
									{#if partner.domain}
										<p class="text-xs text-gray-400 font-mono">{partner.domain}</p>
									{/if}
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 capitalize">{partner.plan}</span>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusBadge(partner.status)} capitalize">{partner.status}</span>
								</td>
								<td class="px-4 py-3 text-right">
									<span class="{usageColor(partner.usage_percentage)}">{partner.current_usage.toLocaleString()}</span>
									<span class="text-gray-400"> / {partner.usage_limit.toLocaleString()}</span>
									<div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
										<div class="h-1.5 rounded-full {partner.usage_percentage >= 90 ? 'bg-red-500' : partner.usage_percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'}" style="width: {Math.min(partner.usage_percentage, 100)}%"></div>
									</div>
								</td>
								<td class="px-4 py-3">
									<span class="text-xs text-gray-500 capitalize">{partner.integration_status.replace(/_/g, ' ')}</span>
								</td>
								<td class="px-4 py-3 text-xs text-gray-400">{formatDate(partner.last_activity_at)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Rate Limit Rules + Webhook Status (side by side) -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
		<!-- Rate Limit Rules -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			<div class="border-b border-gray-200 px-6 py-4">
				<h2 class="text-lg font-semibold flex items-center gap-2">
					<Gauge class="h-5 w-5" />
					Rate Limiting
				</h2>
			</div>
			{#if data.rateLimitRules.length === 0}
				<div class="p-6 text-center text-gray-400">
					<p class="text-sm">No rate-limit rules configured</p>
				</div>
			{:else}
				<div class="divide-y divide-gray-100">
					{#each data.rateLimitRules as rule (rule.id)}
						<div class="px-6 py-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-gray-900">{rule.name}</p>
									<p class="text-xs text-gray-400">{rule.type} &middot; {rule.target} &middot; {rule.time_window}</p>
								</div>
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {rule.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">{rule.status}</span>
							</div>
							<div class="flex items-center gap-3 mt-2">
								<div class="flex-1 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full {rule.usage_percentage >= 90 ? 'bg-red-500' : rule.usage_percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'}" style="width: {Math.min(rule.usage_percentage, 100)}%"></div>
								</div>
								<span class="text-xs text-gray-500">{rule.current_usage} / {rule.request_limit}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Webhook Status -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			<div class="border-b border-gray-200 px-6 py-4">
				<h2 class="text-lg font-semibold flex items-center gap-2">
					<Activity class="h-5 w-5" />
					Webhook Status
				</h2>
			</div>
			{#if data.webhookStatus}
				{@const ws = data.webhookStatus}
				<div class="p-6 space-y-4">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-500">Status</span>
						<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium {ws.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
							{#if ws.status === 'healthy'}<CheckCircle2 class="h-3.5 w-3.5" />{:else}<AlertCircle class="h-3.5 w-3.5" />{/if}
							{ws.status}
						</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-500">Total Events</span>
						<span class="text-sm font-medium">{ws.total_events.toLocaleString()}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-500">Unprocessed</span>
						<span class="text-sm font-medium {ws.unprocessed_events > 0 ? 'text-yellow-600' : 'text-green-600'}">{ws.unprocessed_events}</span>
					</div>
					{#if ws.providers.length > 0}
						<div>
							<span class="text-sm text-gray-500 block mb-2">Active Providers</span>
							<div class="flex flex-wrap gap-2">
								{#each ws.providers as provider}
									<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">{provider}</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="p-6 text-center text-gray-400">
					<Activity class="h-10 w-10 mx-auto mb-2 text-gray-300" />
					<p class="text-sm">Webhook status unavailable</p>
				</div>
			{/if}
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
						<pre class="bg-gray-100 p-3 rounded-lg mt-2 text-sm overflow-x-auto"><code>GET {data.apiBaseUrl}/health/live</code></pre>
					</div>
				</div>
				<div>
					<h3 class="text-sm font-semibold text-gray-900 mb-3">Example Code</h3>
					<div class="flex border-b border-gray-200 mb-0">
						{#each [['curl', 'cURL'], ['python', 'Python'], ['javascript', 'JavaScript']] as [id, label]}
							<button
								class="px-4 py-2 text-sm {activeTab === id ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}"
								onclick={() => (activeTab = id as typeof activeTab)}
							>
								{label}
							</button>
						{/each}
					</div>
					<div class="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
						{#if activeTab === 'curl'}
							<pre class="text-sm"><code>{@html `curl -X POST ${data.apiBaseUrl}/messages/send \\<br>  -H "Authorization: Bearer YOUR_API_KEY" \\<br>  -H "Content-Type: application/json" \\<br>  -d '{<br>    "phone_number": "+5511999999999",<br>    "message": "Hello from API!"<br>  }'`}</code></pre>
						{:else if activeTab === 'python'}
							<pre class="text-sm"><code>{@html `import requests<br><br>response = requests.post(<br>    "${data.apiBaseUrl}/messages/send",<br>    headers={<br>        "Authorization": "Bearer YOUR_API_KEY",<br>        "Content-Type": "application/json"<br>    },<br>    json={<br>        "phone_number": "+5511999999999",<br>        "message": "Hello from API!"<br>    }<br>)<br>print(response.json())`}</code></pre>
						{:else}
							<pre class="text-sm"><code>{@html `const response = await fetch('${data.apiBaseUrl}/messages/send', {<br>  method: 'POST',<br>  headers: {<br>    'Authorization': 'Bearer YOUR_API_KEY',<br>    'Content-Type': 'application/json'<br>  },<br>  body: JSON.stringify({<br>    phone_number: '+5511999999999',<br>    message: 'Hello from API!'<br>  })<br>});<br>const data = await response.json();`}</code></pre>
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
					<a href="{data.swaggerBaseUrl}/docs" target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
						Open Swagger UI
						<ExternalLink class="h-3.5 w-3.5" />
					</a>
				</div>
				<div class="text-center p-6 rounded-lg border border-gray-200">
					<FileText class="h-12 w-12 text-green-600 mx-auto mb-3" />
					<h3 class="font-semibold mb-1">ReDoc</h3>
					<p class="text-xs text-gray-500 mb-4">Clean, responsive documentation with detailed examples</p>
					<a href="{data.swaggerBaseUrl}/redoc" target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
						Open ReDoc
						<ExternalLink class="h-3.5 w-3.5" />
					</a>
				</div>
				<div class="text-center p-6 rounded-lg border border-gray-200">
					<Code2 class="h-12 w-12 text-blue-500 mx-auto mb-3" />
					<h3 class="font-semibold mb-1">OpenAPI Schema</h3>
					<p class="text-xs text-gray-500 mb-4">Raw OpenAPI JSON specification for code generation</p>
					<a href="{data.swaggerBaseUrl}/openapi.json" target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">
						<Download class="h-4 w-4" />
						View JSON Schema
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
