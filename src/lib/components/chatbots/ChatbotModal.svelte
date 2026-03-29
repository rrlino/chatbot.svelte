<script lang="ts">
	import { AppModal } from '$components/core';
	import { apiFetch } from '$utils/api';
	import { endpoints } from '$config/endpoints';
	import { toast } from '$lib/stores/toast';

	interface ChatbotForm {
		name: string;
		description: string;
		system_prompt: string;
		is_active: boolean;
		is_default: boolean;
		include_thinking: boolean;
	}

	let {
		open = $bindable(false),
		mode = 'create',
		chatbot = null,
		onSave,
		onClose
	}: {
		open?: boolean;
		mode?: 'create' | 'edit';
		chatbot?: Record<string, unknown> | null;
		onSave?: () => void;
		onClose?: () => void;
	} = $props();

	let form = $state<ChatbotForm>({
		name: '',
		description: '',
		system_prompt: '',
		is_active: true,
		is_default: false,
		include_thinking: false
	});
	let saving = $state(false);
	let errors = $state<Record<string, string>>({});
	let showVariablePicker = $state(false);

	// Variable categories for system prompt
	const userVariables = [
		{ name: 'USER_NAME', description: "User's name" },
		{ name: 'USER_EMAIL', description: 'Email address' },
		{ name: 'PHONE_NUMBER', description: 'Phone number' },
		{ name: 'CLIENT_AGE', description: 'Age (from journey)' },
		{ name: 'CLIENT_HEIGHT', description: 'Height in cm' },
		{ name: 'CURRENT_WEIGHT', description: 'Weight in kg' },
		{ name: 'CLIENT_GENDER', description: 'Gender' }
	];

	const fitnessVariables = [
		{ name: 'FITNESS_LEVEL', description: 'Experience level' },
		{ name: 'FITNESS_GOALS', description: 'Fitness goals' },
		{ name: 'TRAINING_FREQUENCY', description: 'Weekly training frequency' },
		{ name: 'TRAINING_HISTORY', description: 'Training experience' },
		{ name: 'AVAILABLE_EQUIPMENT', description: 'Equipment access' },
		{ name: 'SESSION_DURATION', description: 'Session duration preference' },
		{ name: 'FITNESS_MOTIVATION', description: 'Fitness motivation' },
		{ name: 'FAVORITE_EXERCISES', description: 'Favorite exercises' },
		{ name: 'AVOIDED_EXERCISES', description: 'Exercises to avoid' }
	];

	const healthVariables = [
		{ name: 'PARQ_STATUS', description: 'PARQ completion status' },
		{ name: 'PARQ_CHEST_PAIN', description: 'Chest pain indicator' },
		{ name: 'PARQ_HEART_CONDITIONS', description: 'Heart conditions' },
		{ name: 'MEDICAL_CONDITIONS', description: 'Medical conditions summary' }
	];

	const systemVariables = [
		{ name: 'CURRENT_DATE', description: 'Current date (YYYY-MM-DD)' },
		{ name: 'CURRENT_TIME', description: 'Current time (HH:MM)' },
		{ name: 'CURRENT_DATETIME', description: 'Full datetime' },
		{ name: 'CURRENT_DAY_OF_WEEK', description: 'Day of week' }
	];

	const companyVariables = [
		{ name: 'COMPANY_NAME', description: 'Business name' },
		{ name: 'PLATFORM_NAME', description: 'Platform name' },
		{ name: 'BUSINESS_HOURS', description: 'Business hours' }
	];

	let promptEl: HTMLTextAreaElement | undefined = $state();

	$effect(() => {
		if (open && chatbot && mode === 'edit') {
			form = {
				name: (chatbot.name as string) || '',
				description: (chatbot.description as string) || '',
				system_prompt: (chatbot.system_prompt as string) || '',
				is_active: chatbot.is_active ?? true,
				is_default: chatbot.is_default ?? false,
				include_thinking: (chatbot.include_thinking as boolean) ?? false
			};
		} else if (open && mode === 'create') {
			form = {
				name: '',
				description: '',
				system_prompt: '',
				is_active: true,
				is_default: false,
				include_thinking: false
			};
		}
		errors = {};
	});

	function validate(): boolean {
		errors = {};
		if (!form.name.trim()) {
			errors.name = 'Name is required';
			return false;
		}
		if (form.name.length > 100) {
			errors.name = 'Name must be less than 100 characters';
			return false;
		}
		if (form.description && form.description.length > 200) {
			errors.description = 'Description must be less than 200 characters';
			return false;
		}
		return true;
	}

	async function handleSave() {
		if (!validate()) return;
		saving = true;
		try {
			const payload: Record<string, unknown> = {
				name: form.name,
				description: form.description || null,
				system_prompt: form.system_prompt,
				is_active: form.is_active,
				is_default: form.is_default,
				model_config: { include_thinking: form.include_thinking }
			};

			if (mode === 'edit' && chatbot?.id) {
				await apiFetch(endpoints.chatbots.update(String(chatbot.id)), {
					method: 'PUT',
					body: JSON.stringify(payload)
				});
				toast.success(`Chatbot "${form.name}" updated`);
			} else {
				await apiFetch(endpoints.chatbots.create, {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				toast.success(`Chatbot "${form.name}" created`);
			}
			onSave?.();
			handleClose();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save chatbot');
		} finally {
			saving = false;
		}
	}

	function handleClose() {
		onClose?.();
		open = false;
	}

	function insertVariable(name: string) {
		if (!promptEl) return;
		const variable = `<<${name}>>`;
		const start = promptEl.selectionStart;
		const end = promptEl.selectionEnd;
		const text = form.system_prompt;
		form.system_prompt = text.slice(0, start) + variable + text.slice(end);
		showVariablePicker = false;
		setTimeout(() => {
			if (promptEl) {
				const pos = start + variable.length;
				promptEl.setSelectionRange(pos, pos);
				promptEl.focus();
			}
		}, 50);
	}
</script>

<AppModal open={open} title={mode === 'create' ? 'Create Chatbot' : 'Edit Chatbot'} onClose={handleClose}>
	<div class="space-y-4">
		<!-- Name -->
		<div>
			<label for="cb-name" class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
			<input
				id="cb-name"
				type="text"
				bind:value={form.name}
				placeholder="Enter chatbot name"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			/>
			{#if errors.name}
				<p class="mt-1 text-xs text-red-600">{errors.name}</p>
			{/if}
		</div>

		<!-- Description -->
		<div>
			<label for="cb-desc" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
			<textarea
				id="cb-desc"
				bind:value={form.description}
				placeholder="Describe the chatbot's purpose and functionality"
				rows="2"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			></textarea>
			{#if errors.description}
				<p class="mt-1 text-xs text-red-600">{errors.description}</p>
			{/if}
		</div>

		<!-- System Prompt -->
		<div>
			<div class="flex items-center justify-between mb-1">
				<label for="cb-prompt" class="block text-sm font-medium text-gray-700">System Prompt *</label>
				<button
					type="button"
					onclick={() => (showVariablePicker = true)}
					class="text-xs text-blue-600 hover:text-blue-800 font-medium"
				>
					+ Insert Variable
				</button>
			</div>
			<textarea
				id="cb-prompt"
				bind:this={promptEl}
				bind:value={form.system_prompt}
				placeholder="Enter the system prompt that defines the chatbot's behavior. Use <<VARIABLE_NAME>> for dynamic values."
				rows="6"
				class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			></textarea>
			<p class="mt-1 text-xs text-gray-500">
				Use variables like <code class="bg-gray-100 px-1 rounded">&lt;&lt;USER_NAME&gt;&gt;</code>,
				<code class="bg-gray-100 px-1 rounded">&lt;&lt;CLIENT_AGE&gt;&gt;</code> which are replaced with user data.
			</p>
		</div>

		<!-- Toggles -->
		<div class="flex gap-6">
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="checkbox" bind:checked={form.is_active} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
				<span class="text-sm text-gray-700">Active</span>
			</label>
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="checkbox" bind:checked={form.is_default} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
				<span class="text-sm text-gray-700">Default</span>
			</label>
			<label class="flex items-center gap-2 cursor-pointer">
				<input type="checkbox" bind:checked={form.include_thinking} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
				<span class="text-sm text-gray-700">Include Thinking</span>
			</label>
		</div>

		<!-- Actions -->
		<div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
			<button
				type="button"
				onclick={handleClose}
				class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={handleSave}
				disabled={saving}
				class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
			>
				{#if saving}
					<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
				{/if}
				{mode === 'edit' ? 'Update' : 'Create'}
			</button>
		</div>
	</div>
</AppModal>

<!-- Variable Picker Modal -->
{#if showVariablePicker}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onclick={() => (showVariablePicker = false)}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h3 class="text-lg font-semibold text-gray-900">Insert Variable</h3>
				<button onclick={() => (showVariablePicker = false)} class="text-gray-400 hover:text-gray-600">&times;</button>
			</div>
			<div class="p-4 overflow-y-auto flex-1">
				<p class="text-sm text-gray-500 mb-3">Click a variable to insert it into your system prompt.</p>

				<!-- User Profile -->
				<h4 class="text-sm font-semibold text-blue-600 mb-2">User Profile</h4>
				<div class="grid grid-cols-2 gap-2 mb-4">
					{#each userVariables as v}
						<button
							type="button"
							onclick={() => insertVariable(v.name)}
							class="text-left p-2 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
						>
							<code class="text-xs text-blue-700">&lt;&lt;{v.name}&gt;&gt;</code>
							<p class="text-xs text-gray-500">{v.description}</p>
						</button>
					{/each}
				</div>

				<!-- Fitness -->
				<h4 class="text-sm font-semibold text-green-600 mb-2">Fitness Profile</h4>
				<div class="grid grid-cols-2 gap-2 mb-4">
					{#each fitnessVariables as v}
						<button
							type="button"
							onclick={() => insertVariable(v.name)}
							class="text-left p-2 border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
						>
							<code class="text-xs text-green-700">&lt;&lt;{v.name}&gt;&gt;</code>
							<p class="text-xs text-gray-500">{v.description}</p>
						</button>
					{/each}
				</div>

				<!-- Health -->
				<h4 class="text-sm font-semibold text-red-600 mb-2">Health & PARQ</h4>
				<div class="grid grid-cols-2 gap-2 mb-4">
					{#each healthVariables as v}
						<button
							type="button"
							onclick={() => insertVariable(v.name)}
							class="text-left p-2 border border-gray-200 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors"
						>
							<code class="text-xs text-red-700">&lt;&lt;{v.name}&gt;&gt;</code>
							<p class="text-xs text-gray-500">{v.description}</p>
						</button>
					{/each}
				</div>

				<!-- System -->
				<h4 class="text-sm font-semibold text-purple-600 mb-2">System & Date/Time</h4>
				<div class="grid grid-cols-2 gap-2 mb-4">
					{#each systemVariables as v}
						<button
							type="button"
							onclick={() => insertVariable(v.name)}
							class="text-left p-2 border border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
						>
							<code class="text-xs text-purple-700">&lt;&lt;{v.name}&gt;&gt;</code>
							<p class="text-xs text-gray-500">{v.description}</p>
						</button>
					{/each}
				</div>

				<!-- Company -->
				<h4 class="text-sm font-semibold text-amber-600 mb-2">Company</h4>
				<div class="grid grid-cols-2 gap-2">
					{#each companyVariables as v}
						<button
							type="button"
							onclick={() => insertVariable(v.name)}
							class="text-left p-2 border border-gray-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors"
						>
							<code class="text-xs text-amber-700">&lt;&lt;{v.name}&gt;&gt;</code>
							<p class="text-xs text-gray-500">{v.description}</p>
						</button>
					{/each}
				</div>
			</div>
			<div class="p-4 border-t border-gray-200">
				<button
					type="button"
					onclick={() => (showVariablePicker = false)}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
