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

	const tabs = [
		{ key: 'basic', label: 'Basic Info' },
		{ key: 'fitness', label: 'Fitness (PARQ)' },
		{ key: 'journeys', label: 'Journeys' },
		{ key: 'messages', label: 'Messages' },
		{ key: 'variables', label: 'Variables' }
	];

	function handleClose() {
		onClose?.();
		open = false;
	}

	async function handleSave() {
		saving = true;
		try {
			const body: Record<string, unknown> = {
				email: user?.email || null,
				phone_number: user?.phone_number || null,
				language: user?.language || 'pt-BR',
				name: user?.name || null
			};

			if (mode === 'edit' && user?.id) {
				await apiFetch(`/users/${user.id}`, {
					method: 'PUT',
					body: JSON.stringify(body)
				});
				toast.success('User updated');
			} else {
				await apiFetch('/users', {
					method: 'POST',
					body: JSON.stringify(body)
				});
				toast.success('User created');
			}
			onSave?.();
			handleClose();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Failed to save user');
		} finally {
			saving = false;
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={handleClose} role="dialog" tabindex="-1">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col" onclick={(e) => e.stopPropagation()}>
		<div class="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
			<h3 class="text-lg font-semibold text-gray-900">
				{mode === 'create' ? 'Create User' : `User #${user?.id ?? ''}`}
			</h3>
			<button onclick={handleClose} class="text-gray-400 hover:text-gray-600 text-xl" aria-label="Close">&times;</button>
		</div>

		{#if mode === 'edit' && user?.id}
			<!-- Tabs -->
			<div class="flex border-b border-gray-200 px-4 shrink-0">
				{#each tabs as tab}
					<button
						onclick={() => activeTab = tab.key}
						class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === tab.key
							? 'border-blue-600 text-blue-600'
							: 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						{tab.label}
					</button>
				{/each}
			</div>
		{/if}

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

		{#if activeTab === 'basic' || mode === 'create'}
			<div class="flex justify-end gap-3 p-4 border-t border-gray-200 shrink-0">
				<button onclick={handleClose} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
				<button onclick={handleSave} disabled={saving} class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
					{saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
				</button>
			</div>
		{/if}
	</div>
</div>
