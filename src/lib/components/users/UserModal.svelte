<script lang="ts">
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import UserBasicInfoForm from './UserBasicInfoForm.svelte';
	import UserFitnessForm from './UserFitnessForm.svelte';
	import UserJourneysTab from './UserJourneysTab.svelte';
	import UserMessagesTab from './UserMessagesTab.svelte';
	import UserVariablesTab from './UserVariablesTab.svelte';

	let {
		open = $bindable(false),
		mode = 'edit',
		user = null,
		onSave,
		onClose
	}: {
		open?: boolean;
		mode?: 'create' | 'edit';
		user?: Record<string, unknown> | null;
		onSave?: () => void;
		onClose?: () => void;
	} = $props();

	let activeTab = $state('basic');
	let saving = $state(false);
	let error = $state('');

	const tabs = [
		{ key: 'basic', label: 'Basic Info' },
		{ key: 'fitness', label: 'Fitness (PARQ)' },
		{ key: 'journeys', label: 'Journeys' },
		{ key: 'messages', label: 'Messages' },
		{ key: 'variables', label: 'Variables' }
	];

	function handleClose() {
		error = '';
		onClose?.();
		open = false;
	}

	async function handleSave() {
		if (!user?.name) {
			error = 'Name is required';
			return;
		}

		saving = true;
		error = '';
		try {
			if (mode === 'edit' && user?.id) {
				const originalStatus = user._originalStatus as string | undefined;
				const currentStatus = user.status as string;

				// Update profile data
				await apiFetch(`/users/${user.id}`, {
					method: 'PUT',
					body: JSON.stringify({
						name: user.name,
						phone_number: user.phone_number || null,
						email: user.email || null,
						chatbot_paused: !!user.chatbot_paused
					})
				});

				// Update status separately if changed
				if (originalStatus && originalStatus !== currentStatus) {
					await apiFetch(`/users/${user.id}/status`, {
						method: 'PUT',
						body: JSON.stringify({ status: currentStatus })
					});
				}

				toast.success('User updated');
			} else {
				await apiFetch('/users', {
					method: 'POST',
					body: JSON.stringify({
						external_id: (user.email as string) || (user.phone_number as string) || `admin_${Date.now()}`,
						channel: 'admin',
						username: user.name,
						profile_data: {
							email: user.email || null,
							phone_number: user.phone_number || null,
							name: user.name,
							language: user.language || 'pt-BR'
						}
					})
				});
				toast.success('User created');
			}
			onSave?.();
			handleClose();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to save user';
			toast.error(error);
		} finally {
			saving = false;
		}
	}

	function openModal() {
		// Store original status for change detection
		if (user && mode === 'edit') {
			user._originalStatus = user.status;
		}
	}
</script>

{#if open}
	{#key open}
		{@const _ = openModal()}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={handleClose}
		role="dialog"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
				<h3 class="text-lg font-semibold text-gray-900">
					{mode === 'create' ? 'Create User' : `Edit User #${user?.id ?? ''}`}
				</h3>
				<button
					onclick={handleClose}
					class="text-gray-400 hover:text-gray-600 text-xl"
					aria-label="Close"
				>
					&times;
				</button>
			</div>

			<!-- Tabs (only in edit mode) -->
			{#if mode === 'edit' && user?.id}
				<div class="flex border-b border-gray-200 px-4 shrink-0 overflow-x-auto">
					{#each tabs as tab}
						<button
							onclick={() => (activeTab = tab.key)}
							class="px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeTab === tab.key
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700'}"
						>
							{tab.label}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Error -->
			{#if error}
				<div class="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
					{error}
				</div>
			{/if}

			<!-- Content -->
			<div class="p-4 overflow-y-auto flex-1">
				{#if activeTab === 'basic' || mode === 'create'}
					<UserBasicInfoForm bind:user />
				{:else if activeTab === 'fitness'}
					<UserFitnessForm userId={String(user?.id)} />
				{:else if activeTab === 'journeys'}
					<UserJourneysTab userId={String(user?.id)} />
				{:else if activeTab === 'messages'}
					<UserMessagesTab userId={String(user?.id)} />
				{:else if activeTab === 'variables'}
					<UserVariablesTab userId={String(user?.id)} />
				{/if}
			</div>

			<!-- Footer (only for basic info tab or create mode) -->
			{#if activeTab === 'basic' || mode === 'create'}
				<div class="flex justify-end gap-3 p-4 border-t border-gray-200 shrink-0">
					<button
						onclick={handleClose}
						class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={handleSave}
						disabled={saving}
						class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
					>
						{#if saving}
							<span class="flex items-center gap-2">
								<span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
								Saving...
							</span>
						{:else}
							{mode === 'create' ? 'Create' : 'Save'}
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</div>
	{/key}
{/if}
