<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { PlusIcon, BotIcon, ToggleLeftIcon, ToggleRightIcon, StarIcon, CopyIcon, TrashIcon, SendIcon, RefreshCwIcon, XIcon, DownloadIcon } from 'lucide-svelte';
	import { ChatbotModal } from '$components/chatbots';
	import { apiFetch } from '$utils/api';
	import { endpoints } from '$config/endpoints';
	import { toast } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let chatbots = $state(data.chatbots);
	let modalOpen = $state(false);
	let editingChatbot = $state<Record<string, unknown> | null>(null);
	let modalMode = $state<'create' | 'edit'>('create');
	let testChatOpen = $state(false);
	let testChatbotId = $state<number | null>(null);
	let testChatbotName = $state('');
	let testMessage = $state('');
	let testMessages = $state<{ role: string; content: string }[]>([]);
	let testSending = $state(false);
	let loading = $state(false);
	let activeDropdown = $state<number | null>(null);

	function formatDate(d: string | null): string {
		if (!d) return 'Never';
		return new Date(d).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function refreshData() {
		loading = true;
		await invalidateAll();
		loading = false;
	}

	// --- CRUD ---

	function handleCreate() {
		editingChatbot = null;
		modalMode = 'create';
		modalOpen = true;
	}

	function handleEdit(chatbot: Record<string, unknown>) {
		editingChatbot = chatbot;
		modalMode = 'edit';
		modalOpen = true;
		activeDropdown = null;
	}

	function handleModalSave() {
		modalOpen = false;
		refreshData();
	}

	function handleModalClose() {
		modalOpen = false;
		editingChatbot = null;
	}

	async function toggleStatus(chatbot: Record<string, unknown>) {
		const id = chatbot.id as number;
		const newStatus = !(chatbot.is_active as boolean);
		try {
			await apiFetch(endpoints.chatbots.update(String(id)), {
				method: 'PUT',
				body: JSON.stringify({ is_active: newStatus })
			});
			toast.success(`${chatbot.name} ${newStatus ? 'activated' : 'deactivated'}`);
			await refreshData();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to toggle status');
		}
		activeDropdown = null;
	}

	async function duplicateChatbot(chatbot: Record<string, unknown>) {
		if (!confirm(`Duplicate "${chatbot.name}"?`)) return;
		try {
			await apiFetch(endpoints.chatbots.create, {
				method: 'POST',
				body: JSON.stringify({
					name: `${chatbot.name} (Copy)`,
					description: chatbot.description,
					system_prompt: chatbot.system_prompt || '',
					is_active: false,
					is_default: false,
					model_config: { include_thinking: (chatbot as Record<string, unknown>).include_thinking || false }
				})
			});
			toast.success(`Duplicated "${chatbot.name}"`);
			await refreshData();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to duplicate');
		}
		activeDropdown = null;
	}

	async function deleteChatbot(chatbot: Record<string, unknown>) {
		if (chatbot.is_default) {
			toast.warning('Cannot delete the default chatbot. Set another as default first.');
			return;
		}
		if (!confirm(`Delete "${chatbot.name}"? This cannot be undone.`)) return;
		try {
			await apiFetch(endpoints.chatbots.delete(String(chatbot.id)), { method: 'DELETE' });
			toast.success(`Deleted "${chatbot.name}"`);
			await refreshData();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete');
		}
		activeDropdown = null;
	}

	async function setAsDefault(chatbot: Record<string, unknown>) {
		if (!confirm(`Set "${chatbot.name}" as default? This will remove default from others.`)) return;
		try {
			await apiFetch(endpoints.chatbots.update(String(chatbot.id)), {
				method: 'PUT',
				body: JSON.stringify({ is_default: true })
			});
			toast.success(`"${chatbot.name}" is now the default chatbot`);
			await refreshData();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to set default');
		}
		activeDropdown = null;
	}

	// --- Export ---

	function exportChatbots() {
		const exportData = {
			timestamp: new Date().toISOString(),
			chatbots: chatbots.map((cb: Record<string, unknown>) => ({
				id: cb.id,
				name: cb.name,
				description: cb.description,
				is_active: cb.is_active,
				is_default: cb.is_default,
				created_at: cb.created_at
			}))
		};
		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `chatbots-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		toast.info('Chatbots exported');
	}

	// --- Test Chat ---

	function openTestChat(chatbot: Record<string, unknown>) {
		testChatbotId = chatbot.id as number;
		testChatbotName = chatbot.name as string;
		testMessages = [];
		testMessage = '';
		testChatOpen = true;
		activeDropdown = null;
	}

	async function sendTestMessage() {
		if (!testMessage.trim() || !testChatbotId) return;
		const userMsg = testMessage.trim();
		testMessages = [...testMessages, { role: 'user', content: userMsg }];
		testMessage = '';
		testSending = true;

		try {
			const response = await apiFetch<{ response?: string; message?: string }>(
				endpoints.chatbots.respond,
				{
					method: 'POST',
					body: JSON.stringify({
						chatbot_id: testChatbotId,
						message: userMsg
					})
				}
			);
			const reply = response.response || response.message || 'No response';
			testMessages = [...testMessages, { role: 'assistant', content: reply }];
		} catch (err) {
			testMessages = [...testMessages, {
				role: 'assistant',
				content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}`
			}];
		} finally {
			testSending = false;
		}
	}

	function closeTestChat() {
		testChatOpen = false;
		testChatbotId = null;
		testChatbotName = '';
		testMessages = [];
		testMessage = '';
	}

	function toggleDropdown(id: number) {
		activeDropdown = activeDropdown === id ? null : id;
	}

	function handleClickOutside() {
		activeDropdown = null;
	}
</script>

<svelte:head>
	<title>Chatbots - TrueLocal AI</title>
</svelte:head>

<svelte:window onclick={handleClickOutside} />

<div class="p-6">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
					<BotIcon class="h-7 w-7 text-blue-600" />
					Chatbot Management
				</h1>
				<p class="text-sm text-gray-500 mt-1">
					Manage multi-chatbot system configuration and assignments
					{#if data.stats}
						<span class="ml-2 text-gray-400">
							&middot; {data.stats.active} active / {data.stats.total} total
						</span>
					{/if}
				</p>
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={exportChatbots}
					class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					<DownloadIcon class="h-4 w-4" />
					Export
				</button>
				<button
					onclick={refreshData}
					disabled={loading}
					class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
				>
					<RefreshCwIcon class="h-4 w-4 {loading ? 'animate-spin' : ''}" />
				</button>
				<button
					onclick={handleCreate}
					class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
				>
					<PlusIcon class="h-4 w-4" />
					Create Chatbot
				</button>
			</div>
		</div>

		<!-- Stats bar -->
		{#if data.stats}
			<div class="mt-4 grid grid-cols-3 gap-4">
				<div class="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
						<BotIcon class="h-5 w-5 text-blue-600" />
					</div>
					<div>
						<p class="text-xs text-gray-500">Total</p>
						<p class="text-lg font-semibold text-gray-900">{data.stats.total}</p>
					</div>
				</div>
				<div class="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
						<ToggleRightIcon class="h-5 w-5 text-green-600" />
					</div>
					<div>
						<p class="text-xs text-gray-500">Active</p>
						<p class="text-lg font-semibold text-gray-900">{data.stats.active}</p>
					</div>
				</div>
				<div class="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
						<ToggleLeftIcon class="h-5 w-5 text-gray-400" />
					</div>
					<div>
						<p class="text-xs text-gray-500">Inactive</p>
						<p class="text-lg font-semibold text-gray-900">{data.stats.inactive}</p>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Chatbot Grid -->
	{#if chatbots.length === 0 && !loading}
		<div class="bg-white rounded-lg border border-gray-200 p-12">
			<div class="flex flex-col items-center text-gray-500">
				<BotIcon class="h-12 w-12 mb-3 text-gray-300" />
				<h3 class="text-lg font-medium text-gray-700 mb-1">No chatbots found</h3>
				<p class="text-sm mb-4">Create your first chatbot to get started.</p>
				<button
					onclick={handleCreate}
					class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
				>
					<PlusIcon class="h-4 w-4" />
					Create Chatbot
				</button>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			{#each chatbots as chatbot (chatbot.id)}
				{@const isActive = chatbot.is_active}
				{@const isDefault = chatbot.is_default}
				<div
					class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow relative
						{isActive ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'}
						{isDefault ? 'border-t-2 border-t-amber-400' : ''}"
				>
					<!-- Card header -->
					<div class="flex items-start justify-between mb-2">
						<div class="flex-1 min-w-0">
							<h3 class="text-sm font-semibold text-gray-900 truncate">{chatbot.name}</h3>
							<p class="text-xs text-gray-500 mt-0.5 line-clamp-2">{chatbot.description || 'No description'}</p>
						</div>
						<div class="flex items-center gap-1.5 ml-2 shrink-0">
							{#if isDefault}
								<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
									<StarIcon class="h-3 w-3" />Default
								</span>
							{/if}
							<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium
								{isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
								{isActive ? 'Active' : 'Inactive'}
							</span>
						</div>
					</div>

					<!-- Info row -->
					<div class="grid grid-cols-2 gap-2 mb-3">
						<div class="bg-gray-50 rounded px-2 py-1.5 border-l-2 border-blue-400">
							<p class="text-[10px] text-gray-500">Created</p>
							<p class="text-xs font-medium text-gray-700">{formatDate(chatbot.created_at)}</p>
						</div>
						<div class="bg-gray-50 rounded px-2 py-1.5 border-l-2 border-blue-400">
							<p class="text-[10px] text-gray-500">Category</p>
							<p class="text-xs font-medium text-gray-700">{chatbot.category || 'Uncategorized'}</p>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex items-center gap-1.5 flex-wrap">
						<button
							onclick={() => handleEdit(chatbot)}
							class="px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
						>
							Edit
						</button>
						<button
							onclick={() => toggleStatus(chatbot)}
							class="px-2.5 py-1 text-xs font-medium rounded border transition-colors
								{isActive
									? 'text-amber-600 border-amber-200 hover:bg-amber-50'
									: 'text-green-600 border-green-200 hover:bg-green-50'}"
						>
							{isActive ? 'Deactivate' : 'Activate'}
						</button>
						{#if !isDefault}
							<button
								onclick={() => setAsDefault(chatbot)}
								class="px-2.5 py-1 text-xs font-medium text-purple-600 border border-purple-200 rounded hover:bg-purple-50 transition-colors"
							>
								Set Default
							</button>
						{/if}

						<!-- More menu -->
						<div class="relative ml-auto">
							<button
								onclick|stopPropagation={() => toggleDropdown(chatbot.id)}
								class="px-1.5 py-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
							>
								&hellip;
							</button>
							{#if activeDropdown === chatbot.id}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="absolute right-0 bottom-full mb-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1"
									onclick|stopPropagation
								>
									<button
										onclick={() => openTestChat(chatbot)}
										class="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
									>
										<SendIcon class="h-3 w-3" />Test Chat
									</button>
									<button
										onclick={() => duplicateChatbot(chatbot)}
										class="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
									>
										<CopyIcon class="h-3 w-3" />Duplicate
									</button>
									{#if !isDefault}
										<hr class="my-1 border-gray-100" />
										<button
											onclick={() => deleteChatbot(chatbot)}
											class="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
										>
											<TrashIcon class="h-3 w-3" />Delete
										</button>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}

			<!-- Create New Card -->
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div
				class="bg-white rounded-lg border-2 border-dashed border-gray-300 p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors min-h-[200px]"
				onclick={handleCreate}
			>
				<PlusIcon class="h-10 w-10 text-gray-300 mb-2" />
				<h5 class="text-sm text-gray-500 font-medium">Create New Chatbot</h5>
				<p class="text-xs text-gray-400">Add a new chatbot to the system</p>
			</div>
		</div>
	{/if}
</div>

<!-- Create/Edit Modal -->
<ChatbotModal
	bind:open={modalOpen}
	mode={modalMode}
	chatbot={editingChatbot}
	onSave={handleModalSave}
	onClose={handleModalClose}
/>

<!-- Test Chat Panel -->
{#if testChatOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={closeTestChat}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<div>
					<h3 class="text-sm font-semibold text-gray-900">Test Chat</h3>
					<p class="text-xs text-gray-500">{testChatbotName}</p>
				</div>
				<button onclick={closeTestChat} class="text-gray-400 hover:text-gray-600">
					<XIcon class="h-4 w-4" />
				</button>
			</div>

			<!-- Messages area -->
			<div class="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
				{#if testMessages.length === 0}
					<p class="text-xs text-gray-400 text-center py-8">Send a message to test this chatbot</p>
				{:else}
					{#each testMessages as msg}
						<div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
							<div
								class="max-w-[80%] px-3 py-2 rounded-lg text-sm
									{msg.role === 'user'
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-800'}"
							>
								{msg.content}
							</div>
						</div>
					{/each}
				{/if}
				{#if testSending}
					<div class="flex justify-start">
						<div class="bg-gray-100 text-gray-500 px-3 py-2 rounded-lg text-sm">
							<div class="flex items-center gap-1.5">
								<div class="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
								Thinking...
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Input -->
			<div class="p-4 border-t border-gray-200">
				<form
					onsubmit={(e) => { e.preventDefault(); sendTestMessage(); }}
					class="flex gap-2"
				>
					<input
						type="text"
						bind:value={testMessage}
						placeholder="Type a test message..."
						disabled={testSending}
						class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
					/>
					<button
						type="submit"
						disabled={testSending || !testMessage.trim()}
						class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
					>
						<SendIcon class="h-4 w-4" />
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
