<script lang="ts">
	import { page } from '$app/state';
	import { ArrowUpIcon, ArrowDownIcon, XCircleIcon } from 'lucide-svelte';
	import { endpoints } from '$config/endpoints';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';

	interface ConversationMessage {
		id: number;
		direction: string;
		content: string;
		status: string;
		created_at: string;
		sent_at?: string;
		[key: string]: unknown;
	}

	interface Conversation {
		id: number;
		user_id: number;
		chatbot_id: number;
		channel_id: number;
		status: string;
		started_at?: string;
		last_message_at?: string;
		closed_at?: string;
		created_at: string;
		[key: string]: unknown;
	}

	let conversationId = $derived(page.url.searchParams.get('id') || '');
	let conversation = $state<Conversation | null>(null);
	let messages = $state<ConversationMessage[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function fetchConversation() {
		if (!conversationId) { loading = false; return; }
		loading = true; error = '';
		try {
			const [convRes, msgRes] = await Promise.all([
				apiFetch<{ data: Conversation }>(endpoints.conversations.get(conversationId)),
				apiFetch<{ data: ConversationMessage[] }>(`${endpoints.conversations.messages(conversationId)}?limit=100`)
			]);
			conversation = convRes.data ?? convRes;
			const msgData = msgRes.data ?? msgRes;
			messages = Array.isArray(msgData) ? msgData : [];
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load conversation';
		} finally {
			loading = false;
		}
	}

	$effect(() => { fetchConversation(); });

	async function closeConversation() {
		if (!conversationId) return;
		try {
			await apiFetch(endpoints.conversations.close(conversationId), { method: 'PUT' });
			toast.success('Conversation closed');
			if (conversation) conversation.status = 'closed';
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Failed to close conversation');
		}
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-700',
		closed: 'bg-gray-100 text-gray-600',
		expired: 'bg-yellow-100 text-yellow-700',
		paused: 'bg-blue-100 text-blue-700'
	};
</script>

<svelte:head>
	<title>Conversation - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if !conversationId}
		<div class="text-center py-12">
			<p class="text-gray-500">No conversation selected. Go to Messages and click a conversation to view it here.</p>
		</div>
	{:else if error}
		<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
	{:else if conversation}
		<!-- Header -->
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Conversation #{conversation.id}</h1>
				<div class="flex items-center gap-3 mt-1 text-sm text-gray-500">
					<span>User #{conversation.user_id}</span>
					<span>Chatbot #{conversation.chatbot_id}</span>
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusColors[conversation.status] || 'bg-gray-100 text-gray-600'}">{conversation.status}</span>
				</div>
			</div>
			{#if conversation.status !== 'closed'}
				<button onclick={closeConversation} class="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors">
					<XCircleIcon class="h-4 w-4" />Close Conversation
				</button>
			{/if}
		</div>

		<!-- Conversation Info -->
		<div class="grid grid-cols-4 gap-4 mb-6">
			<div class="bg-gray-50 rounded-lg p-3">
				<p class="text-xs font-medium text-gray-500 uppercase">Started</p>
				<p class="text-sm text-gray-900 mt-0.5">{formatDate(conversation.started_at as string) || '—'}</p>
			</div>
			<div class="bg-gray-50 rounded-lg p-3">
				<p class="text-xs font-medium text-gray-500 uppercase">Last Message</p>
				<p class="text-sm text-gray-900 mt-0.5">{formatDate(conversation.last_message_at as string) || '—'}</p>
			</div>
			<div class="bg-gray-50 rounded-lg p-3">
				<p class="text-xs font-medium text-gray-500 uppercase">Messages</p>
				<p class="text-sm text-gray-900 mt-0.5">{messages.length}</p>
			</div>
			<div class="bg-gray-50 rounded-lg p-3">
				<p class="text-xs font-medium text-gray-500 uppercase">Closed</p>
				<p class="text-sm text-gray-900 mt-0.5">{conversation.closed_at ? formatDate(conversation.closed_at) : 'Active'}</p>
			</div>
		</div>

		<!-- Message Thread -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			<div class="px-4 py-3 border-b border-gray-200">
				<h3 class="text-sm font-medium text-gray-700">Messages</h3>
			</div>
			<div class="p-4 space-y-4 max-h-[500px] overflow-y-auto">
				{#if messages.length === 0}
					<p class="text-sm text-gray-500 text-center py-8">No messages in this conversation.</p>
				{:else}
					{#each messages as msg}
						<div class="flex gap-3 {msg.direction === 'inbound' ? '' : 'flex-row-reverse'}">
							<div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 {msg.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}">
								{#if msg.direction === 'inbound'}
									<ArrowDownIcon class="h-4 w-4" />
								{:else}
									<ArrowUpIcon class="h-4 w-4" />
								{/if}
							</div>
							<div class="max-w-[70%]">
								<div class="px-3 py-2 rounded-lg text-sm {msg.direction === 'inbound' ? 'bg-gray-100 text-gray-800' : 'bg-blue-600 text-white'}">
									{msg.content}
								</div>
								<div class="flex items-center gap-2 mt-1 {msg.direction === 'inbound' ? '' : 'justify-end'}">
									<span class="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
									<span class="text-xs text-gray-400">#{msg.id}</span>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
