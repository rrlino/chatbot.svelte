<script lang="ts">
	import { SparklesIcon, SendIcon, PlayIcon, RefreshCwIcon } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import { endpoints } from '$config/endpoints';

	interface AIConfig {
		model?: string;
		temperature?: number;
		max_tokens?: number;
		system_prompt?: string;
		[key: string]: unknown;
	}

	let activeTab = $state('test');
	let loading = $state(false);

	// Test Response tab
	let testChatbotId = $state('');
	let testUserId = $state('');
	let testMessage = $state('');
	let testResponse = $state('');
	let testLoading = $state(false);

	// Batch Parsing tab
	let batchJourneyId = $state('');
	let batchPayload = $state('[]');
	let batchResponse = $state('');
	let batchLoading = $state(false);

	// Config tab
	let aiConfig = $state<AIConfig | null>(null);
	let configLoading = $state(false);

	// Health
	let aiHealth = $state<string | null>(null);

	async function testAIResponse() {
		if (!testMessage) { toast.error('Message is required'); return; }
		testLoading = true; testResponse = '';
		try {
			const response = await apiFetch<{ data: { response?: string; reply?: string; message?: string } }>(endpoints.ai.chatbotResponse, {
				method: 'POST',
				body: JSON.stringify({
					chatbot_id: testChatbotId ? Number(testChatbotId) : undefined,
					user_id: testUserId ? Number(testUserId) : undefined,
					message: testMessage
				})
			});
			const data = response.data ?? response;
			testResponse = data.response || data.reply || data.message || JSON.stringify(data, null, 2);
		} catch (err: unknown) {
			testResponse = err instanceof Error ? err.message : 'AI response failed';
		} finally {
			testLoading = false;
		}
	}

	async function testBatchParsing() {
		batchLoading = true; batchResponse = '';
		try {
			let payload;
			try { payload = JSON.parse(batchPayload); } catch { toast.error('Invalid JSON payload'); batchLoading = false; return; }

			const response = await apiFetch(endpoints.ai.parseJourneyBatch, {
				method: 'POST',
				body: JSON.stringify({ journey_id: batchJourneyId ? Number(batchJourneyId) : undefined, responses: payload })
			});
			batchResponse = JSON.stringify(response, null, 2);
			toast.success('Batch parsing completed');
		} catch (err: unknown) {
			batchResponse = err instanceof Error ? err.message : 'Batch parsing failed';
		} finally {
			batchLoading = false;
		}
	}

	async function fetchAIConfig() {
		configLoading = true;
		try {
			const response = await apiFetch<{ data: AIConfig }>(endpoints.ai.validateConfig);
			aiConfig = response.data ?? response;
		} catch { aiConfig = null; } finally { configLoading = false; }
	}

	async function fetchAIHealth() {
		try {
			const response = await apiFetch<{ status: string }>(endpoints.ai.health);
			const data = response.data ?? response;
			const s = (data as Record<string, unknown>).status as string ?? 'unknown';
			aiHealth = s === 'ok' ? 'healthy' : s;
		} catch { aiHealth = 'unavailable'; }
	}

	$effect(() => { fetchAIHealth(); });

	const tabs = [
		{ key: 'test', label: 'Test Response' },
		{ key: 'batch', label: 'Batch Parsing' },
		{ key: 'config', label: 'AI Config' }
	];
</script>

<svelte:head>
	<title>AI Training - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">AI Training</h1>
			<p class="text-sm text-gray-500 mt-1">Test AI responses and manage training configuration</p>
		</div>
		<div class="flex items-center gap-2">
			{#if aiHealth}
				<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {aiHealth === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
					AI: {aiHealth}
				</span>
			{/if}
			<button onclick={fetchAIHealth} class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
				<RefreshCwIcon class="h-3.5 w-3.5" />
			</button>
		</div>
	</div>

	<!-- Tabs -->
	<div class="flex border-b border-gray-200 mb-6">
		{#each tabs as tab}
			<button onclick={() => activeTab = tab.key} class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Test Response Tab -->
	{#if activeTab === 'test'}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
				<SparklesIcon class="h-5 w-5" />Test AI Response
			</h2>
			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Chatbot ID (optional)</label>
						<input type="number" bind:value={testChatbotId} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">User ID (optional)</label>
						<input type="number" bind:value={testUserId} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Message *</label>
					<textarea bind:value={testMessage} rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type a test message..."></textarea>
				</div>
				<button onclick={testAIResponse} disabled={testLoading} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
					<SendIcon class="h-4 w-4" />
					{testLoading ? 'Generating...' : 'Send Test Message'}
				</button>
				{#if testResponse}
					<div class="mt-4">
						<label class="block text-xs font-medium text-gray-500 uppercase mb-1">AI Response</label>
						<div class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">{testResponse}</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Batch Parsing Tab -->
	{#if activeTab === 'batch'}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
				<PlayIcon class="h-5 w-5" />Batch Journey Parsing
			</h2>
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Journey ID (optional)</label>
					<input type="number" bind:value={batchJourneyId} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Responses Payload (JSON array)</label>
					<textarea bind:value={batchPayload} rows="8" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500">{`[
  { "question_tag": "q1", "answer": "Yes" },
  { "question_tag": "q2", "answer": "30 minutes" }
]`}</textarea>
				</div>
				<button onclick={testBatchParsing} disabled={batchLoading} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
					<PlayIcon class="h-4 w-4" />
					{batchLoading ? 'Parsing...' : 'Run Batch Parsing'}
				</button>
				{#if batchResponse}
					<div class="mt-4">
						<label class="block text-xs font-medium text-gray-500 uppercase mb-1">Result</label>
						<pre class="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto max-h-64">{batchResponse}</pre>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Config Tab -->
	{#if activeTab === 'config'}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">AI Configuration</h2>
			{#if configLoading}
				<div class="flex items-center justify-center py-8">
					<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
				</div>
			{:else if aiConfig}
				<div class="space-y-3">
					{#each Object.entries(aiConfig) as [key, value]}
						<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
							<span class="text-sm font-medium text-gray-700 font-mono">{key}</span>
							<span class="text-sm text-gray-600">{typeof value === 'string' ? value.slice(0, 100) : JSON.stringify(value)}</span>
						</div>
					{/each}
				</div>
				<div class="flex gap-3 mt-4">
					<button onclick={fetchAIConfig} class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
						<RefreshCwIcon class="h-4 w-4" />Refresh
					</button>
					<button onclick={async () => { try { await apiFetch(endpoints.ai.clearCache, { method: 'POST' }); toast.success('AI cache cleared'); fetchAIConfig(); } catch { toast.error('Failed to clear cache'); } }} class="px-4 py-2 bg-orange-50 text-orange-600 text-sm rounded-lg hover:bg-orange-100">
						Clear AI Cache
					</button>
				</div>
			{:else}
				<p class="text-gray-500">Could not load AI configuration.</p>
			{/if}
		</div>
	{/if}
</div>
