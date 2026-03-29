<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		MessageSquareIcon,
		ArrowUpIcon,
		ArrowDownIcon,
		ChevronRightIcon,
		XIcon,
		SendIcon,
		ImageIcon,
		FileIcon,
		PhoneIcon,
		XCircleIcon,
		RefreshCwIcon
	} from 'lucide-svelte';
	import AppFilters from '$lib/components/core/AppFilters.svelte';
	import AppPagination from '$lib/components/core/AppPagination.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state(data.search);
	let perPage = $state(data.perPage);
	let statusFilter = $state(data.statusFilter);
	let loading = $state(false);

	// Send message form state
	let sendTo = $state('');
	let sendMessage = $state('');
	let sending = $state(false);
	let sendError = $state('');
	let sendSuccess = $state('');

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / perPage)));

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-700',
		closed: 'bg-gray-100 text-gray-600',
		expired: 'bg-yellow-100 text-yellow-700',
		paused: 'bg-blue-100 text-blue-700'
	};

	function formatDate(d: string | null | undefined): string {
		if (!d) return '—';
		return new Date(d).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function buildUrl(params: Record<string, string | number | boolean>): string {
		const sp = new URLSearchParams();
		for (const [k, v] of Object.entries(params)) {
			if (v !== '' && v !== 0 && v !== false) sp.set(k, String(v));
		}
		const qs = sp.toString();
		return `/whatsapp/conversations${qs ? `?${qs}` : ''}`;
	}

	async function navigate(params: Record<string, string | number | boolean>) {
		loading = true;
		await goto(buildUrl(params));
		loading = false;
	}

	function handleSearchChange(query: string) {
		search = query;
		navigate({ page: 1, perPage, search: query, status: statusFilter, id: data.selectedId });
	}

	function handlePerPageChange(newPerPage: number) {
		perPage = newPerPage;
		navigate({ page: 1, perPage: newPerPage, search, status: statusFilter, id: data.selectedId });
	}

	function handlePageChange(pageNum: number) {
		navigate({ page: pageNum, perPage, search, status: statusFilter, id: data.selectedId });
	}

	function handleStatusChange(e: Event) {
		statusFilter = (e.target as HTMLSelectElement).value;
		navigate({ page: 1, perPage, search, status: statusFilter, id: data.selectedId });
	}

	function selectConversation(id: number) {
		navigate({ page: data.page, perPage, search, status: statusFilter, id: String(id) });
	}

	function clearSelection() {
		navigate({ page: data.page, perPage, search, status: statusFilter });
	}

	function getStatusLabel(status: string): string {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}

	// Extract media info from message metadata
	function getMediaInfo(metadata: Record<string, unknown> | null):
		{ type: string; url: string; caption?: string } | null {
		if (!metadata) return null;
		// Check for WhatsApp media format in metadata
		const media = metadata.media as Record<string, unknown> | undefined;
		if (media?.url) {
			return {
				type: (media.type as string) || 'image',
				url: media.url as string,
				caption: media.caption as string | undefined
			};
		}
		// Check for image/audio/video/document fields
		if (metadata.image_url) {
			return { type: 'image', url: metadata.image_url as string };
		}
		if (metadata.audio_url) {
			return { type: 'audio', url: metadata.audio_url as string };
		}
		if (metadata.video_url) {
			return { type: 'video', url: metadata.video_url as string };
		}
		if (metadata.document_url) {
			return { type: 'document', url: metadata.document_url as string };
		}
		return null;
	}

	// Send a WhatsApp message via the API
	async function handleSendMessage() {
		if (!sendTo.trim() || !sendMessage.trim()) {
			sendError = 'Phone number and message are required';
			return;
		}
		sending = true;
		sendError = '';
		sendSuccess = '';

		try {
			const res = await fetch('/api/v1/messages/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ to: sendTo, message: sendMessage })
			});
			if (!res.ok) {
				const errBody = await res.json().catch(() => ({}));
				throw new Error((errBody as Record<string, string>).error || 'Failed to send message');
			}
			sendSuccess = 'Message sent successfully';
			sendMessage = '';
			// Reload to refresh data
			await navigate({ page: data.page, perPage, search, status: statusFilter, id: data.selectedId });
		} catch (err) {
			sendError = err instanceof Error ? err.message : 'Failed to send message';
		} finally {
			sending = false;
		}
	}

	function closeConversation() {
		// Just close the detail panel — actual close requires API call
		clearSelection();
	}

	// Set sendTo when a conversation is selected
	$effect(() => {
		if (data.selectedConversation) {
			// We don't have the user's phone directly, but can set a hint
			sendTo = '';
		}
	});
</script>

<svelte:head>
	<title>WhatsApp Conversations - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">WhatsApp Conversations</h1>
			<p class="text-sm text-gray-500 mt-1">
				Manage WhatsApp conversations
				<span class="ml-2 text-gray-400">{data.total} total</span>
				{#if data.whatsappChannelId}
					<span class="ml-2 text-gray-400">Channel #{data.whatsappChannelId}</span>
				{/if}
			</p>
		</div>
		<div class="flex items-center gap-3">
			{#if data.messageStats}
				<div class="flex items-center gap-3 text-sm">
					<span class="flex items-center gap-1.5">
						<ArrowDownIcon class="h-3.5 w-3.5 text-blue-500" />
						<span class="text-gray-600">{data.messageStats.inbound ?? 0} received</span>
					</span>
					<span class="flex items-center gap-1.5">
						<ArrowUpIcon class="h-3.5 w-3.5 text-green-500" />
						<span class="text-gray-600">{data.messageStats.outbound ?? 0} sent</span>
					</span>
				</div>
			{/if}
			<button
				onclick={() => navigate({ page: data.page, perPage, search, status: statusFilter, id: data.selectedId })}
				disabled={loading}
				class="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
			>
				<RefreshCwIcon class="h-4 w-4" />
				Refresh
			</button>
		</div>
	</div>

	<!-- Filters -->
	<AppFilters
		bind:search
		bind:perPage
		searchPlaceholder="Search conversations..."
		{loading}
		onSearchChange={handleSearchChange}
		onPerPageChange={handlePerPageChange}
	>
		<select
			value={statusFilter}
			onchange={handleStatusChange}
			disabled={loading}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
		>
			<option value="">All Status</option>
			<option value="active">Active</option>
			<option value="closed">Closed</option>
			<option value="expired">Expired</option>
			<option value="paused">Paused</option>
		</select>
	</AppFilters>

	<!-- Main content: list + detail panel -->
	<div class="flex gap-6">
		<!-- Conversation list -->
		<div class="flex-1 min-w-0">
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				{#if !data.whatsappChannelId}
					<div class="p-12">
						<div class="flex flex-col items-center text-gray-500">
							<PhoneIcon class="h-12 w-12 mb-3 text-gray-300" />
							<h3 class="text-lg font-medium text-gray-700 mb-1">No WhatsApp channel found</h3>
							<p class="text-sm">Configure a WhatsApp/Meta channel first in Channels settings.</p>
						</div>
					</div>
				{:else if data.conversations.length === 0 && !loading}
					<div class="p-12">
						<div class="flex flex-col items-center text-gray-500">
							<MessageSquareIcon class="h-12 w-12 mb-3 text-gray-300" />
							<h3 class="text-lg font-medium text-gray-700 mb-1">No WhatsApp conversations found</h3>
							<p class="text-sm">
								{search || statusFilter
									? 'Try adjusting your filters.'
									: 'No WhatsApp conversations have been started yet.'}
							</p>
						</div>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Message</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
									<th class="px-4 py-3"></th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#if loading}
									<tr>
										<td colspan="6" class="px-4 py-12 text-center text-gray-500">
											<div class="flex items-center justify-center gap-2">
												<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
												<span>Loading...</span>
											</div>
										</td>
									</tr>
								{:else}
									{#each data.conversations as conv (conv.id)}
										<tr
											class="hover:bg-gray-50 transition-colors cursor-pointer {data.selectedId === String(conv.id) ? 'bg-blue-50' : ''}"
											onclick={() => selectConversation(conv.id)}
										>
											<td class="px-4 py-3">
												<span class="text-sm font-medium text-gray-900">#{conv.id}</span>
											</td>
											<td class="px-4 py-3 text-sm text-gray-500">
												User #{conv.user_id}
											</td>
											<td class="px-4 py-3">
												<span
													class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusColors[conv.status] || 'bg-gray-100 text-gray-600'}"
												>
													{getStatusLabel(conv.status)}
												</span>
											</td>
											<td class="px-4 py-3 text-sm text-gray-500">
												{formatDate(conv.last_message_at)}
											</td>
											<td class="px-4 py-3 text-sm text-gray-500">
												{formatDate(conv.started_at)}
											</td>
											<td class="px-4 py-3">
												<ChevronRightIcon class="h-4 w-4 text-gray-400" />
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>

					<!-- Pagination -->
					{#if data.total > 0}
						<AppPagination
							current={data.page}
							total={totalPages}
							totalItems={data.total}
							{perPage}
							onPageChange={handlePageChange}
						/>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Detail panel: Message thread + Send form -->
		<div class="w-[520px] shrink-0 space-y-4">
			{#if data.selectedConversation}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-6">
					<!-- Detail header -->
					<div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
						<h3 class="text-sm font-medium text-gray-700">
							Conversation #{data.selectedConversation.id}
						</h3>
						<button
							onclick={clearSelection}
							class="text-gray-400 hover:text-gray-600 transition-colors"
						>
							<XIcon class="h-4 w-4" />
						</button>
					</div>

					<!-- Conversation meta -->
					<div class="px-4 py-3 border-b border-gray-200">
						<div class="flex items-center gap-3 mb-3">
							<span class="text-sm text-gray-500">User #{data.selectedConversation.user_id}</span>
							<span class="text-sm text-gray-400">|</span>
							<span class="text-sm text-gray-500">Bot #{data.selectedConversation.chatbot_id}</span>
							<span
								class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusColors[data.selectedConversation.status] || 'bg-gray-100 text-gray-600'}"
							>
								{getStatusLabel(data.selectedConversation.status)}
							</span>
						</div>
						<div class="grid grid-cols-3 gap-2 text-xs">
							<div class="bg-gray-50 rounded p-2">
								<p class="text-gray-500 uppercase">Started</p>
								<p class="text-gray-900 mt-0.5">{formatDate(data.selectedConversation.started_at) || '—'}</p>
							</div>
							<div class="bg-gray-50 rounded p-2">
								<p class="text-gray-500 uppercase">Last Msg</p>
								<p class="text-gray-900 mt-0.5">{formatDate(data.selectedConversation.last_message_at) || '—'}</p>
							</div>
							<div class="bg-gray-50 rounded p-2">
								<p class="text-gray-500 uppercase">Messages</p>
								<p class="text-gray-900 mt-0.5">{data.messages.length}</p>
							</div>
						</div>
					</div>

					<!-- Message thread -->
					<div class="p-4 space-y-3 max-h-[420px] overflow-y-auto">
						{#if data.messages.length === 0}
							<p class="text-sm text-gray-500 text-center py-8">No messages in this conversation.</p>
						{:else}
							{#each data.messages as msg (msg.id)}
								<div class="flex gap-2 {msg.direction === 'inbound' ? '' : 'flex-row-reverse'}">
									<div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 {msg.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}">
										{#if msg.direction === 'inbound'}
											<ArrowDownIcon class="h-3.5 w-3.5" />
										{:else}
											<ArrowUpIcon class="h-3.5 w-3.5" />
										{/if}
									</div>
									<div class="max-w-[80%]">
										<div class="px-3 py-2 rounded-lg text-sm {msg.direction === 'inbound' ? 'bg-gray-100 text-gray-800' : 'bg-green-600 text-white'}">
											<!-- Media message display -->
											{#if getMediaInfo(msg.metadata)}
												{@const media = getMediaInfo(msg.metadata)}
												{#if media?.type === 'image'}
													<div class="mb-1">
														<img
															src={media.url}
															alt={media.caption || 'Image'}
															class="rounded max-w-full max-h-48 object-cover"
															onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
														/>
													</div>
												{:else if media?.type === 'audio'}
													<div class="mb-1">
														<audio controls class="w-full max-w-[240px]" src={media.url}>
															Audio not supported
														</audio>
													</div>
												{:else if media?.type === 'video'}
													<div class="mb-1">
														<video controls class="rounded max-w-full max-h-48" src={media.url}>
															Video not supported
														</video>
													</div>
												{:else if media?.type === 'document'}
													<div class="mb-1">
														<a
															href={media.url}
															target="_blank"
															rel="noopener noreferrer"
															class="flex items-center gap-1.5 underline text-xs"
														>
															<FileIcon class="h-3.5 w-3.5" />
															{media.caption || 'Download file'}
														</a>
													</div>
												{/if}
											{:else if msg.message_type === 'image' || msg.message_type === 'sticker'}
												<div class="flex items-center gap-1.5 text-xs opacity-70 mb-1">
													<ImageIcon class="h-3.5 w-3.5" />
													<span>Media message</span>
												</div>
											{:else if msg.message_type === 'audio' || msg.message_type === 'voice'}
												<div class="flex items-center gap-1.5 text-xs opacity-70 mb-1">
													<FileIcon class="h-3.5 w-3.5" />
													<span>Voice message</span>
												</div>
											{:else if msg.message_type === 'document' || msg.message_type === 'file'}
												<div class="flex items-center gap-1.5 text-xs opacity-70 mb-1">
													<FileIcon class="h-3.5 w-3.5" />
													<span>Document</span>
												</div>
											{/if}
											<!-- Text content -->
											{#if msg.content && msg.content !== `[Template: ${msg.content}]`}
												{msg.content}
											{/if}
										</div>
										<div class="flex items-center gap-2 mt-0.5 {msg.direction === 'inbound' ? '' : 'justify-end'}">
											<span class="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
											{#if msg.status === 'failed'}
												<span class="text-xs text-red-400">failed</span>
											{:else if msg.status === 'sent' || msg.status === 'delivered'}
												<span class="text-xs text-gray-400">{msg.status}</span>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{:else}
				<!-- No conversation selected — show send message form -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200">
					<div class="px-4 py-3 border-b border-gray-200">
						<h3 class="text-sm font-medium text-gray-700 flex items-center gap-2">
							<SendIcon class="h-4 w-4 text-green-600" />
							Send WhatsApp Message
						</h3>
					</div>
					<div class="p-4 space-y-3">
						<div>
							<label for="send-to" class="block text-xs font-medium text-gray-500 uppercase mb-1">Phone Number</label>
							<div class="relative">
								<PhoneIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
								<input
									id="send-to"
									type="text"
									bind:value={sendTo}
									placeholder="+5511999999999"
									disabled={sending}
									class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
								/>
							</div>
						</div>
						<div>
							<label for="send-message" class="block text-xs font-medium text-gray-500 uppercase mb-1">Message</label>
							<textarea
								id="send-message"
								bind:value={sendMessage}
								placeholder="Type your message..."
								rows={4}
								disabled={sending}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 resize-none"
							></textarea>
						</div>
						{#if sendError}
							<p class="text-xs text-red-600">{sendError}</p>
						{/if}
						{#if sendSuccess}
							<p class="text-xs text-green-600">{sendSuccess}</p>
						{/if}
						<button
							onclick={handleSendMessage}
							disabled={sending || !sendTo.trim() || !sendMessage.trim()}
							class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{#if sending}
								<div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
								Sending...
							{:else}
								<SendIcon class="h-4 w-4" />
								Send Message
							{/if}
						</button>
					</div>
				</div>

				<!-- Quick stats -->
				{#if data.stats}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
						<h3 class="text-sm font-medium text-gray-700 mb-3">Conversation Stats</h3>
						<div class="grid grid-cols-2 gap-3">
							<div class="bg-green-50 rounded-lg p-3">
								<p class="text-xs text-gray-500 uppercase">Active</p>
								<p class="text-lg font-bold text-green-700 mt-0.5">{data.stats.active ?? 0}</p>
							</div>
							<div class="bg-gray-50 rounded-lg p-3">
								<p class="text-xs text-gray-500 uppercase">Closed</p>
								<p class="text-lg font-bold text-gray-700 mt-0.5">{data.stats.closed ?? 0}</p>
							</div>
							<div class="bg-yellow-50 rounded-lg p-3">
								<p class="text-xs text-gray-500 uppercase">Expired</p>
								<p class="text-lg font-bold text-yellow-700 mt-0.5">{data.stats.expired ?? 0}</p>
							</div>
							<div class="bg-blue-50 rounded-lg p-3">
								<p class="text-xs text-gray-500 uppercase">Total</p>
								<p class="text-lg font-bold text-blue-700 mt-0.5">{data.stats.total ?? 0}</p>
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
