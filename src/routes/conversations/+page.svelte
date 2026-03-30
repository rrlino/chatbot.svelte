<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		MessageSquareIcon,
		XCircleIcon,
		ArrowUpIcon,
		ArrowDownIcon,
		ChevronRightIcon,
		XIcon
	} from 'lucide-svelte';
	import AppFilters from '$lib/components/core/AppFilters.svelte';
	import AppPagination from '$lib/components/core/AppPagination.svelte';
	import type { PageData } from './$types';

	interface ConversationMessage {
		id: number;
		conversation_id: number;
		direction: string;
		content: string;
		status: string;
		sent_at: string | null;
		created_at: string;
	}

	let { data }: { data: PageData } = $props();

	let search = $state(data.search);
	let perPage = $state(data.perPage);
	let statusFilter = $state(data.statusFilter);
	let chatbotId = $state(data.chatbotId);
	let loading = $state(false);

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
		return `/conversations${qs ? `?${qs}` : ''}`;
	}

	async function navigate(params: Record<string, string | number | boolean>) {
		loading = true;
		await goto(buildUrl(params));
		loading = false;
	}

	function handleSearchChange(query: string) {
		search = query;
		navigate({ page: 1, perPage, search: query, status: statusFilter, chatbotId });
	}

	function handlePerPageChange(newPerPage: number) {
		perPage = newPerPage;
		navigate({ page: 1, perPage: newPerPage, search, status: statusFilter, chatbotId });
	}

	function handlePageChange(pageNum: number) {
		navigate({ page: pageNum, perPage, search, status: statusFilter, chatbotId });
	}

	function handleStatusChange(e: Event) {
		statusFilter = (e.target as HTMLSelectElement).value;
		navigate({ page: 1, perPage, search, status: statusFilter, chatbotId });
	}

	function handleChatbotChange(e: Event) {
		chatbotId = (e.target as HTMLInputElement).value;
		navigate({ page: 1, perPage, search, status: statusFilter, chatbotId });
	}

	function selectConversation(id: number) {
		navigate({ page: data.page, perPage, search, status: statusFilter, chatbotId, id: String(id) });
	}

	function clearSelection() {
		navigate({ page: data.page, perPage, search, status: statusFilter, chatbotId });
	}

	function getStatusLabel(status: string): string {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

<svelte:head>
	<title>Conversations - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Conversations</h1>
			<p class="text-sm text-gray-500 mt-1">
				View and manage chatbot conversations
				<span class="ml-2 text-gray-400">{data.total} total</span>
			</p>
		</div>
		{#if data.stats}
			<div class="flex items-center gap-4 text-sm">
				<span class="flex items-center gap-1.5">
					<span class="w-2 h-2 rounded-full bg-green-500"></span>
					<span class="text-gray-600">{data.stats.active ?? 0} active</span>
				</span>
				<span class="flex items-center gap-1.5">
					<span class="w-2 h-2 rounded-full bg-gray-400"></span>
					<span class="text-gray-600">{data.stats.closed ?? 0} closed</span>
				</span>
				<span class="flex items-center gap-1.5">
					<span class="w-2 h-2 rounded-full bg-yellow-500"></span>
					<span class="text-gray-600">{data.stats.expired ?? 0} expired</span>
				</span>
			</div>
		{/if}
	</div>

	<!-- Filters -->
	<AppFilters
		bind:search
		bind:perPage
		searchPlaceholder="Search by conversation ID..."
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
		<input
			type="number"
			placeholder="Chatbot ID"
			value={chatbotId}
			onchange={handleChatbotChange}
			disabled={loading}
			class="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
		/>
	</AppFilters>

	<!-- Main content: list + detail panel -->
	<div class="flex gap-6">
		<!-- Conversation list -->
		<div class="flex-1 min-w-0">
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				{#if data.conversations.length === 0 && !loading}
					<div class="p-12">
						<div class="flex flex-col items-center text-gray-500">
							<MessageSquareIcon class="h-12 w-12 mb-3 text-gray-300" />
							<h3 class="text-lg font-medium text-gray-700 mb-1">No conversations found</h3>
							<p class="text-sm">
								{search || statusFilter || chatbotId
									? 'Try adjusting your filters.'
									: 'No conversations have been started yet.'}
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
									<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chatbot</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Message</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
									<th class="px-4 py-3"></th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#if loading}
									<tr>
										<td colspan="7" class="px-4 py-12 text-center text-gray-500">
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
											<td class="px-4 py-3 text-sm text-gray-500">
												Bot #{conv.chatbot_id}
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

		<!-- Detail panel -->
		{#if data.selectedConversation}
			<div class="w-[480px] shrink-0">
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
					<div class="p-4 space-y-3 max-h-[500px] overflow-y-auto">
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
										<div class="px-3 py-2 rounded-lg text-sm {msg.direction === 'inbound' ? 'bg-gray-100 text-gray-800' : 'bg-blue-600 text-white'}">
											{msg.content}
										</div>
										<div class="flex items-center gap-2 mt-0.5 {msg.direction === 'inbound' ? '' : 'justify-end'}">
											<span class="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
										</div>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
