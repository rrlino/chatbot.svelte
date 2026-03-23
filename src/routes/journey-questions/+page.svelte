<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Pencil, Trash2, ToggleRight, ToggleLeft, Search, Filter, X } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { toast } from '$stores/toast';
	import { endpoints } from '$config/endpoints';
	import { AppModal } from '$components/core';

	interface JourneyQuestion {
		id: number;
		question_text: string;
		question_type: string;
		step_number: number;
		is_required: boolean;
		is_active: boolean;
		variable_name?: string;
		journey_id?: number;
		journey_name?: string;
		choice_options?: { label: string; value: string }[];
	}

	let loading = $state(false);
	let saving = $state(false);
	let questions = $state<JourneyQuestion[]>([]);
	let filteredQuestions = $state<JourneyQuestion[]>([]);
	let searchTerm = $state('');
	let filterType = $state('');
	let filterJourney = $state('');

	let showModal = $state(false);
	let editingQuestion = $state<JourneyQuestion | null>(null);
	let form = $state({
		question_text: '',
		question_type: 'text',
		step_number: 1,
		is_required: true,
		is_active: true,
		journey_id: 0,
		variable_name: '',
		options: [{ label: '', value: '' }]
	});

	const showOptionsEditor = $derived(form.question_type === 'choice');
	const questionTypes = ['text', 'number', 'boolean', 'choice'];

	function getTypeLabel(type: string): string {
		const labels: Record<string, string> = { text: 'Text', number: 'Number', boolean: 'Yes/No', choice: 'Choice' };
		return labels[type] || type;
	}

	function getTypeBadge(type: string): string {
		const badges: Record<string, string> = { text: 'bg-blue-100 text-blue-700', number: 'bg-purple-100 text-purple-700', boolean: 'bg-green-100 text-green-700', choice: 'bg-orange-100 text-orange-700' };
		return badges[type] || 'bg-gray-100 text-gray-700';
	}

	function applyFilters() {
		filteredQuestions = questions.filter((q) => {
			if (searchTerm && !q.question_text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
			if (filterType && q.question_type !== filterType) return false;
			if (filterJourney && q.journey_name !== filterJourney) return false;
			return true;
		});
	}

	function clearFilters() {
		searchTerm = '';
		filterType = '';
		filterJourney = '';
		filteredQuestions = [...questions];
	}

	async function loadQuestions() {
		loading = true;
		try {
			const response = await apiFetch<{ data: JourneyQuestion[] } | JourneyQuestion[]>(endpoints.journeys.questions);
			const data = Array.isArray(response) ? response : response.data ?? [];
			questions = data;
			filteredQuestions = [...data];
		} catch {
			toast.error('Failed to load questions');
		} finally {
			loading = false;
		}
	}

	function openCreateModal() {
		editingQuestion = null;
		form = { question_text: '', question_type: 'text', step_number: (questions.length || 0) + 1, is_required: true, is_active: true, journey_id: 0, variable_name: '', options: [{ label: '', value: '' }] };
		showModal = true;
	}

	function openEditModal(question: JourneyQuestion) {
		editingQuestion = question;
		form = {
			question_text: question.question_text,
			question_type: question.question_type,
			step_number: question.step_number,
			is_required: question.is_required,
			is_active: question.is_active,
			journey_id: question.journey_id || 0,
			variable_name: question.variable_name || '',
			options: question.choice_options?.length ? question.choice_options.map((o) => ({ ...o })) : [{ label: '', value: '' }]
		};
		showModal = true;
	}

	async function saveQuestion() {
		saving = true;
		try {
			const payload = { ...form };
			if (editingQuestion) {
				await apiFetch(endpoints.journeys.questions, { method: 'PUT', body: JSON.stringify({ ...payload, id: editingQuestion.id }) });
				toast.success('Question updated');
			} else {
				await apiFetch(endpoints.journeys.questions, { method: 'POST', body: JSON.stringify(payload) });
				toast.success('Question created');
			}
			showModal = false;
			await loadQuestions();
		} catch {
			toast.error('Failed to save question');
		} finally {
			saving = false;
		}
	}

	async function deleteQuestion(question: JourneyQuestion) {
		try {
			await apiFetch(endpoints.journeys.questions, { method: 'DELETE' });
			questions = questions.filter((q) => q.id !== question.id);
			applyFilters();
			toast.success('Question deleted');
		} catch {
			toast.error('Failed to delete question');
		}
	}

	function addOption() {
		form.options = [...form.options, { label: '', value: '' }];
	}

	function removeOption(idx: number) {
		if (form.options.length <= 1) return;
		form.options = form.options.filter((_, i) => i !== idx);
	}

	onMount(() => {
		loadQuestions();
	});
</script>

<svelte:head>
	<title>Journey Questions - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Journey Questions</h1>
			<p class="text-sm text-gray-500 mt-1">Manage questions across all journeys</p>
		</div>
		<button onclick={openCreateModal} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
			<Plus class="h-4 w-4" />
			New Question
		</button>
	</div>

	<!-- Filters -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
		<div class="flex flex-wrap items-center gap-3">
			<div class="relative flex-1 min-w-[200px]">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
				<input type="text" bind:value={searchTerm} oninput={applyFilters} placeholder="Search questions..." class="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
				{#if searchTerm}
					<button onclick={() => { searchTerm = ''; applyFilters(); }} class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
						<X class="h-4 w-4" />
					</button>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<Filter class="h-4 w-4 text-gray-400" />
				<select bind:value={filterType} onchange={applyFilters} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
					<option value="">All Types</option>
					{#each questionTypes as type}
						<option value={type}>{getTypeLabel(type)}</option>
					{/each}
				</select>
				<button onclick={clearFilters} class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Clear</button>
			</div>
		</div>
	</div>

	<!-- Questions Table -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
		{#if loading}
			<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
		{:else if filteredQuestions.length === 0}
			<div class="text-center py-12 text-gray-400">
				<p>No questions found</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Journey</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variable</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each filteredQuestions as question (question.id)}
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="px-4 py-3 text-sm text-gray-400 font-mono">{question.step_number}</td>
								<td class="px-4 py-3">
									<p class="text-sm text-gray-900 max-w-xs truncate">{question.question_text}</p>
									{#if question.is_required}
										<span class="text-xs text-yellow-600">Required</span>
									{/if}
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {getTypeBadge(question.question_type)}">{getTypeLabel(question.question_type)}</span>
								</td>
								<td class="px-4 py-3 text-sm text-gray-500">{question.journey_name || '-'}</td>
								<td class="px-4 py-3 text-sm font-mono text-gray-500">{question.variable_name || '-'}</td>
								<td class="px-4 py-3">
									<button onclick={() => { question.is_active = !question.is_active; questions = [...questions]; }} class="p-1 rounded">
										{#if question.is_active}
											<ToggleRight class="h-5 w-5 text-green-600" />
										{:else}
											<ToggleLeft class="h-5 w-5 text-gray-400" />
										{/if}
									</button>
								</td>
								<td class="px-4 py-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<button onclick={() => openEditModal(question)} class="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Pencil class="h-3.5 w-3.5" /></button>
										<button onclick={() => deleteQuestion(question)} class="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 class="h-3.5 w-3.5" /></button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
				Showing {filteredQuestions.length} of {questions.length} questions
			</div>
		{/if}
	</div>
</div>

<!-- Question Modal -->
<AppModal open={showModal} title={editingQuestion ? 'Edit Question' : 'New Question'} onClose={() => (showModal = false)}>
	<div class="space-y-4">
		<div>
			<p class="block text-sm font-medium text-gray-700 mb-1">Question Text *</p>
			<textarea bind:value={form.question_text} rows="3" placeholder="Enter your question..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
		</div>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Type *</p>
				<select bind:value={form.question_type} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
					{#each questionTypes as type}
						<option value={type}>{getTypeLabel(type)}</option>
					{/each}
				</select>
			</div>
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Order/Step *</p>
				<input type="number" bind:value={form.step_number} min="1" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
			</div>
		</div>

		{#if showOptionsEditor}
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Answer Options</p>
				<div class="space-y-2">
					{#each form.options as option, idx}
						<div class="flex items-center gap-2">
							<span class="text-xs text-gray-400 w-5 text-center">{idx + 1}</span>
							<input type="text" bind:value={option.label} placeholder="Display text" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
							<input type="text" bind:value={option.value} placeholder="Value" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
							<button onclick={() => removeOption(idx)} disabled={form.options.length <= 1} class="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-30"><Trash2 class="h-3.5 w-3.5" /></button>
						</div>
					{/each}
				</div>
				<button onclick={addOption} class="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline"><Plus class="h-3.5 w-3.5" /> Add Option</button>
			</div>
		{/if}

		<div class="flex items-center gap-6">
			<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={form.is_required} class="rounded" /> Required</label>
			<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={form.is_active} class="rounded" /> Active</label>
		</div>

		<div>
			<p class="block text-sm font-medium text-gray-700 mb-1">Variable Name</p>
			<input type="text" bind:value={form.variable_name} placeholder="USER_NAME" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
		</div>

		<div class="flex justify-end gap-2 pt-2">
			<button onclick={() => (showModal = false)} class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
			<button onclick={saveQuestion} disabled={saving} class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
				{saving ? 'Saving...' : editingQuestion ? 'Update' : 'Create'} Question
			</button>
		</div>
	</div>
</AppModal>
