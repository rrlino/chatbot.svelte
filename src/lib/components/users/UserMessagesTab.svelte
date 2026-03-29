<script lang="ts">
	import { apiFetch } from '$utils/api';

	interface Message {
		id: number;
		conversation_id: number;
		direction: string;
		content: string;
		status: string;
		created_at: string;
		[key: string]: unknown;
	}

	let { userId }: { userId: string } = $props();

	let messages = $state<Message[]>([]);
	let loading = $state(false);
	let error = $state('');

	async function fetchMessages() {
		loading = true;
		error = '';
		try {
			const response = await apiFetch<{ data: Message[] }>(`/messages?limit=50&user_id=${userId}`);
			const data = response.data ?? response;
			messages = Array.isArray(data) ? data : [];
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load messages';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (userId) fetchMessages();
	});

	function formatDate(dateStr: string): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="space-y-3">
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<p class="text-sm text-red-600">{error}</p>
	{:else if messages.length === 0}
		<p class="text-sm text-gray-500">No messages found for this user.</p>
	{:else}
		{#each messages as msg}
			<div class="flex gap-3 {msg.direction === 'inbound' ? '' : 'flex-row-reverse'}">
				<div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 {msg.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}">
					<span class="text-xs font-bold">{msg.direction === 'inbound' ? 'U' : 'B'}</span>
				</div>
				<div class="max-w-[70%]">
					<div class="px-3 py-2 rounded-lg text-sm {msg.direction === 'inbound' ? 'bg-gray-100 text-gray-800' : 'bg-blue-600 text-white'}">
						{msg.content}
					</div>
					<p class="text-xs text-gray-400 mt-1 {msg.direction === 'inbound' ? 'text-left' : 'text-right'}">{formatDate(msg.created_at)}</p>
				</div>
			</div>
		{/each}
	{/if}
</div>
