<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, ChevronRight, ChevronDown, Pencil, Trash2, ToggleLeft, ToggleRight, X, Signpost } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { toast } from '$stores/toast';
	import { endpoints } from '$config/endpoints';
	import { AppModal } from '$components/core';

	interface JourneyOption {
		label: string;
		value: string;
	}

	interface JourneyQuestion {
		id: number;
		question_text: string;
		question_type: string;
		step_number: number;
		is_required: boolean;
		is_active: boolean;
		variable_name?: string;
		choice_options?: JourneyOption[];
	}

	interface Journey {
		id: number;
		code: string;
		name: string;
		description: string;
		is_active: boolean;
		is_mandatory: boolean;
		question_count?: number;
		total_assignments?: number;
	}

	let loading = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let journeys = $state<Journey[]>([]);
	let expandedJourneys = $state<Set<number>>(new Set());
	let expandedQuestions = $state<Set<number>>(new Set());
	let questionsCache = $state<Record<number, JourneyQuestion[]>>({});
	let loadingQuestions = $state<Record<number, boolean>>({});

	// Modals
	let showJourneyModal = $state(false);
	let showQuestionModal = $state(false);
	let showDeleteModal = $state(false);

	// Forms
	let journeyForm = $state({ id: null as number | null, code: '', name: '', description: '', is_active: true, is_mandatory: false });
	let questionForm = $state({ question_text: '', question_type: 'text', step_number: 1, is_required: true, is_active: true, auto_create_variable: false, variable_name: '', options: [{ label: '', value: '' }] });

	// Selections
	let editingJourney = $state<Journey | null>(null);
	let editingQuestion = $state<JourneyQuestion | null>(null);
	let selectedJourney = $state<Journey | null>(null);
	let deleteTarget = $state<{ name: string } | null>(null);

	const totalQuestions = $derived(Object.values(questionsCache).reduce((sum, qs) => sum + qs.length, 0));
	const activeJourneys = $derived(journeys.filter((j) => j.is_active).length);
	const totalUsers = $derived(journeys.reduce((sum, j) => sum + (j.total_assignments || 0), 0));
	const showOptionsEditor = $derived(questionForm.question_type === 'choice');

	function toggleJourney(id: number) {
		const next = new Set(expandedJourneys);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
			loadQuestions(id);
		}
		expandedJourneys = next;
	}

	function toggleQuestion(id: number) {
		const next = new Set(expandedQuestions);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedQuestions = next;
	}

	async function loadJourneys() {
		loading = true;
		try {
			const response = await apiFetch<{ data: Journey[] } | Journey[]>(endpoints.journeys.list);
			const data = Array.isArray(response) ? response : response.data ?? [];
			journeys = data;
		} catch {
			toast.error('Failed to load journeys');
		} finally {
			loading = false;
		}
	}

	async function loadQuestions(journeyId: number) {
		if (questionsCache[journeyId]) return;
		loadingQuestions[journeyId] = true;
		loadingQuestions = { ...loadingQuestions };
		try {
			const response = await apiFetch<{ data: JourneyQuestion[] } | JourneyQuestion[]>(endpoints.journeys.questions(journeyId.toString()));
			const data = Array.isArray(response) ? response : response.data ?? [];
			questionsCache[journeyId] = data;
			questionsCache = { ...questionsCache };
		} catch {
			questionsCache[journeyId] = [];
			questionsCache = { ...questionsCache };
		} finally {
			loadingQuestions[journeyId] = false;
			loadingQuestions = { ...loadingQuestions };
		}
	}

	function getQuestions(journeyId: number): JourneyQuestion[] {
		return [...(questionsCache[journeyId] || [])].sort((a, b) => a.step_number - b.step_number);
	}

	function getQuestionTypeLabel(type: string): string {
		const labels: Record<string, string> = { text: 'Text', number: 'Number', boolean: 'Yes/No', choice: 'Choice' };
		return labels[type] || type;
	}

	function getQuestionTypeBadge(type: string): string {
		const badges: Record<string, string> = { text: 'bg-blue-100 text-blue-700', number: 'bg-purple-100 text-purple-700', boolean: 'bg-green-100 text-green-700', choice: 'bg-orange-100 text-orange-700' };
		return badges[type] || 'bg-gray-100 text-gray-700';
	}

	// Journey CRUD
	function openCreateJourneyModal() {
		editingJourney = null;
		journeyForm = { id: null, code: '', name: '', description: '', is_active: true, is_mandatory: false };
		showJourneyModal = true;
	}

	function openEditJourneyModal(journey: Journey) {
		editingJourney = journey;
		journeyForm = { id: journey.id, code: journey.code, name: journey.name, description: journey.description, is_active: journey.is_active, is_mandatory: journey.is_mandatory };
		showJourneyModal = true;
	}

	async function saveJourney() {
		saving = true;
		try {
			if (editingJourney) {
				await apiFetch(endpoints.journeys.update(editingJourney.id.toString()), { method: 'PUT', body: JSON.stringify(journeyForm) });
				toast.success('Journey updated');
			} else {
				await apiFetch(endpoints.journeys.create, { method: 'POST', body: JSON.stringify(journeyForm) });
				toast.success('Journey created');
			}
			showJourneyModal = false;
			await loadJourneys();
		} catch {
			toast.error('Failed to save journey');
		} finally {
			saving = false;
		}
	}

	async function toggleJourneyStatus(journey: Journey) {
		try {
			await apiFetch(endpoints.journeys.update(journey.id.toString()), { method: 'PUT', body: JSON.stringify({ ...journey, is_active: !journey.is_active }) });
			journey.is_active = !journey.is_active;
			journeys = [...journeys];
			toast.success(journey.is_active ? 'Journey activated' : 'Journey deactivated');
		} catch {
			toast.error('Failed to toggle journey status');
		}
	}

	function confirmDeleteJourney(journey: Journey) {
		deleteTarget = { name: journey.name };
		showDeleteModal = true;
		selectedJourney = journey;
	}

	async function confirmDelete() {
		deleting = true;
		try {
			if (editingQuestion && selectedJourney) {
				// Delete question
				await apiFetch(endpoints.journeys.question(selectedJourney.id.toString(), editingQuestion.id.toString()), { method: 'DELETE' });
				questionsCache[selectedJourney.id] = getQuestions(selectedJourney.id).filter(q => q.id !== editingQuestion.id);
				questionsCache = { ...questionsCache };
				toast.success('Question deleted');
			} else if (selectedJourney) {
				// Delete journey
				await apiFetch(endpoints.journeys.delete(selectedJourney.id.toString()), { method: 'DELETE' });
				journeys = journeys.filter((j) => j.id !== selectedJourney.id);
				toast.success('Journey deleted');
			}
			showDeleteModal = false;
		} catch {
			toast.error(editingQuestion ? 'Failed to delete question' : 'Failed to delete journey');
		} finally {
			deleting = false;
		}
	}

	// Question CRUD
	function openAddQuestionModal(journey: Journey) {
		selectedJourney = journey;
		editingQuestion = null;
		questionForm = { question_text: '', question_type: 'text', step_number: (getQuestions(journey.id).length || 0) + 1, is_required: true, is_active: true, auto_create_variable: false, variable_name: '', options: [{ label: '', value: '' }] };
		showQuestionModal = true;
	}

	function openEditQuestionModal(journey: Journey, question: JourneyQuestion) {
		selectedJourney = journey;
		editingQuestion = question;
		questionForm = { question_text: question.question_text, question_type: question.question_type, step_number: question.step_number, is_required: question.is_required, is_active: question.is_active, auto_create_variable: !!question.variable_name, variable_name: question.variable_name || '', options: question.choice_options?.length ? question.choice_options.map((o) => ({ ...o })) : [{ label: '', value: '' }] };
		showQuestionModal = true;
	}

	async function saveQuestion() {
		saving = true;
		try {
			const payload = { ...questionForm, journey_id: selectedJourney?.id };
			if (editingQuestion) {
				await apiFetch(endpoints.journeys.question(selectedJourney!.id.toString(), editingQuestion.id.toString()), { method: 'PUT', body: JSON.stringify(payload) });
				toast.success('Question updated');
			} else {
				await apiFetch(endpoints.journeys.questions(selectedJourney!.id.toString()), { method: 'POST', body: JSON.stringify(payload) });
				toast.success('Question created');
			}
			showQuestionModal = false;
			if (selectedJourney) {
				questionsCache[selectedJourney.id] = [];
				questionsCache = { ...questionsCache };
				await loadQuestions(selectedJourney.id);
			}
		} catch {
			toast.error('Failed to save question');
		} finally {
			saving = false;
		}
	}

	async function toggleQuestionStatus(journey: Journey, question: JourneyQuestion) {
		try {
			await apiFetch(endpoints.journeys.question(journey.id.toString(), question.id.toString()), { method: 'PUT', body: JSON.stringify({ ...question, is_active: !question.is_active }) });
			question.is_active = !question.is_active;
			questionsCache[journey.id] = [...getQuestions(journey.id)];
			questionsCache = { ...questionsCache };
		} catch {
			toast.error('Failed to toggle question');
		}
	}

	function confirmDeleteQuestion(journey: Journey, question: JourneyQuestion) {
		deleteTarget = { name: question.question_text.substring(0, 50) };
		selectedJourney = journey;
		editingQuestion = question;
		showDeleteModal = true;
	}

	function addOption() {
		questionForm.options = [...questionForm.options, { label: '', value: '' }];
	}

	function removeOption(idx: number) {
		if (questionForm.options.length <= 1) return;
		questionForm.options = questionForm.options.filter((_, i) => i !== idx);
	}

	onMount(() => {
		loadJourneys();
	});
</script>

<svelte:head>
	<title>Journey Management - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
				<Signpost class="h-7 w-7" />
				Journey Management
			</h1>
			<p class="text-sm text-gray-500 mt-1">Manage journeys and their questions in one unified view</p>
		</div>
		<button onclick={openCreateJourneyModal} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
			<Plus class="h-4 w-4" />
			New Journey
		</button>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
			<div class="p-2 bg-blue-100 rounded-lg"><Signpost class="h-5 w-5 text-blue-600" /></div>
			<div><p class="text-xl font-bold">{journeys.length}</p><p class="text-xs text-gray-500">Journeys</p></div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
			<div class="p-2 bg-green-100 rounded-lg"><Plus class="h-5 w-5 text-green-600" /></div>
			<div><p class="text-xl font-bold">{totalQuestions}</p><p class="text-xs text-gray-500">Questions</p></div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
			<div class="p-2 bg-blue-100 rounded-lg"><ToggleRight class="h-5 w-5 text-blue-600" /></div>
			<div><p class="text-xl font-bold">{activeJourneys}</p><p class="text-xs text-gray-500">Active</p></div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
			<div class="p-2 bg-yellow-100 rounded-lg"><Signpost class="h-5 w-5 text-yellow-600" /></div>
			<div><p class="text-xl font-bold">{totalUsers}</p><p class="text-xs text-gray-500">Users</p></div>
		</div>
	</div>

	<!-- Journeys List -->
	{#if loading}
		<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
	{:else}
		<div class="space-y-3">
			{#each journeys as journey (journey.id)}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden {expandedJourneys.has(journey.id) ? 'ring-1 ring-blue-200' : ''}">
					<!-- Journey Header -->
					<div class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer" onclick={() => toggleJourney(journey.id)}>
						<div class="flex items-center gap-3">
							{#if expandedJourneys.has(journey.id)}
								<ChevronDown class="h-4 w-4 text-gray-400" />
							{:else}
								<ChevronRight class="h-4 w-4 text-gray-400" />
							{/if}
							<span class="text-xs text-gray-400 font-mono">#{journey.id}</span>
							<h3 class="text-sm font-semibold text-gray-900">{journey.name}</h3>
							<span class="text-xs text-gray-400 font-mono">{journey.code}</span>
							<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
								{questionsCache[journey.id]?.length ?? journey.question_count ?? 0} questions
							</span>
							{#if !journey.is_active}
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Inactive</span>
							{/if}
						</div>
						<div class="flex items-center gap-1" onclick={(e) => e.stopPropagation()}>
							<button onclick={() => openAddQuestionModal(journey)} class="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="Add Question">
								<Plus class="h-4 w-4" />
							</button>
							<button onclick={() => openEditJourneyModal(journey)} class="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
								<Pencil class="h-4 w-4" />
							</button>
							<button onclick={() => toggleJourneyStatus(journey)} class="p-1.5 rounded transition-colors" title="Toggle Active">
								{#if journey.is_active}
									<ToggleRight class="h-4 w-4 text-green-600" />
								{:else}
									<ToggleLeft class="h-4 w-4 text-gray-400" />
								{/if}
							</button>
							<button onclick={() => confirmDeleteJourney(journey)} disabled={journey.is_active} class="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30" title="Delete">
								<Trash2 class="h-4 w-4" />
							</button>
						</div>
					</div>

					<!-- Questions -->
					{#if expandedJourneys.has(journey.id)}
						<div class="border-t border-gray-100 bg-gray-50 p-4">
							{#if loadingQuestions[journey.id]}
								<div class="flex items-center gap-2 text-sm text-gray-500"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div> Loading questions...</div>
							{:else if getQuestions(journey.id).length === 0}
								<div class="text-center py-4 text-sm text-gray-400">
									<p>No questions yet</p>
									<button onclick={() => openAddQuestionModal(journey)} class="mt-2 text-blue-600 hover:underline text-sm">Add First Question</button>
								</div>
							{:else}
								<div class="space-y-2">
									{#each getQuestions(journey.id) as question (question.id)}
										<div class="bg-white rounded-lg border border-gray-200 p-3">
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-2 flex-1 min-w-0">
													<button onclick={() => toggleQuestion(question.id)} class="shrink-0 text-gray-400 hover:text-gray-600">
														{#if expandedQuestions.has(question.id)}
															<ChevronDown class="h-4 w-4" />
														{:else}
															<ChevronRight class="h-4 w-4" />
														{/if}
													</button>
													<span class="text-xs font-mono text-gray-400 w-6 text-center">{question.step_number}</span>
													<div class="min-w-0 flex-1">
														<p class="text-sm text-gray-900 truncate">{question.question_text}</p>
														<div class="flex items-center gap-1.5 mt-1 flex-wrap">
															<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium {getQuestionTypeBadge(question.question_type)}">{getQuestionTypeLabel(question.question_type)}</span>
															{#if question.is_required}
																<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Required</span>
															{/if}
															{#if question.variable_name}
																<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 font-mono">{question.variable_name}</span>
															{/if}
														</div>
													</div>
												</div>
												<div class="flex items-center gap-1 shrink-0">
													<button onclick={() => toggleQuestionStatus(journey, question)} class="p-1 rounded">
														{#if question.is_active}
															<ToggleRight class="h-4 w-4 text-green-600" />
														{:else}
															<ToggleLeft class="h-4 w-4 text-gray-400" />
														{/if}
													</button>
													<button onclick={() => openEditQuestionModal(journey, question)} class="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil class="h-3.5 w-3.5" /></button>
													<button onclick={() => confirmDeleteQuestion(journey, question)} class="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 class="h-3.5 w-3.5" /></button>
												</div>
											</div>
											{#if expandedQuestions.has(question.id) && question.choice_options?.length}
												<div class="mt-3 pt-3 border-t border-gray-100">
													<p class="text-xs font-semibold text-gray-500 mb-2">Answer Options:</p>
													<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
														{#each question.choice_options as option, idx}
															<div class="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
																<span class="text-xs font-medium text-gray-400">{idx + 1}</span>
																<div>
																	<p class="text-sm text-gray-700">{option.label}</p>
																	<p class="text-xs font-mono text-gray-400">{option.value}</p>
																</div>
															</div>
														{/each}
													</div>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
			{#if journeys.length === 0}
				<div class="text-center py-12 text-gray-400">
					<p>No journeys yet. Create your first journey to get started.</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Journey Modal -->
<AppModal open={showJourneyModal} title={editingJourney ? 'Edit Journey' : 'Create New Journey'} onClose={() => (showJourneyModal = false)}>
	<div class="space-y-4">
		<div>
			<p class="block text-sm font-medium text-gray-700 mb-1">Journey Code *</p>
			<input type="text" bind:value={journeyForm.code} disabled={!!editingJourney} placeholder="onboarding" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
			<p class="text-xs text-gray-400 mt-1">{editingJourney ? 'Cannot be changed' : 'Lowercase, no spaces'}</p>
		</div>
		<div>
			<p class="block text-sm font-medium text-gray-700 mb-1">Journey Name *</p>
			<input type="text" bind:value={journeyForm.name} placeholder="Onboarding Journey" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
		</div>
		<div>
			<p class="block text-sm font-medium text-gray-700 mb-1">Description</p>
			<textarea bind:value={journeyForm.description} rows="3" placeholder="Describe this journey..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
		</div>
		<div class="flex items-center gap-6">
			<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={journeyForm.is_active} class="rounded" /> Active</label>
			<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={journeyForm.is_mandatory} class="rounded" /> Auto-assign to users</label>
		</div>
		<div class="flex justify-end gap-2 pt-2">
			<button onclick={() => (showJourneyModal = false)} class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
			<button onclick={saveJourney} disabled={saving} class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
				{saving ? 'Saving...' : editingJourney ? 'Update' : 'Create'} Journey
			</button>
		</div>
	</div>
</AppModal>

<!-- Question Modal -->
<AppModal open={showQuestionModal} title={editingQuestion ? 'Edit Question' : 'Add Question'} onClose={() => (showQuestionModal = false)}>
	<div class="space-y-4">
		<p class="text-xs text-gray-400">Journey: {selectedJourney?.name}</p>
		<div>
			<p class="block text-sm font-medium text-gray-700 mb-1">Question Text *</p>
			<textarea bind:value={questionForm.question_text} rows="3" placeholder="Enter your question..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
		</div>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Type *</p>
				<select bind:value={questionForm.question_type} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
					<option value="text">Text Input</option>
					<option value="number">Number Input</option>
					<option value="boolean">Yes/No</option>
					<option value="choice">Choice</option>
				</select>
			</div>
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Order/Step *</p>
				<input type="number" bind:value={questionForm.step_number} min="1" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
			</div>
		</div>

		{#if showOptionsEditor}
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Answer Options * <span class="text-xs text-gray-400 font-normal">(Users will select from these)</span></p>
				<div class="space-y-2">
					{#each questionForm.options as option, idx}
						<div class="flex items-center gap-2">
							<span class="text-xs text-gray-400 w-5 text-center">{idx + 1}</span>
							<input type="text" bind:value={option.label} placeholder="Display text" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
							<input type="text" bind:value={option.value} placeholder="Value" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
							<button onclick={() => removeOption(idx)} disabled={questionForm.options.length <= 1} class="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-30"><Trash2 class="h-3.5 w-3.5" /></button>
						</div>
					{/each}
				</div>
				<button onclick={addOption} class="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline"><Plus class="h-3.5 w-3.5" /> Add Option</button>
			</div>
		{/if}

		<div class="flex items-center gap-6">
			<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={questionForm.is_required} class="rounded" /> Required</label>
			<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={questionForm.is_active} class="rounded" /> Active</label>
			<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={questionForm.auto_create_variable} class="rounded" /> Create Variable</label>
		</div>

		{#if questionForm.auto_create_variable}
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Variable Name *</p>
				<input type="text" bind:value={questionForm.variable_name} placeholder="USER_NAME" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
				<p class="text-xs text-gray-400 mt-1">Will be available as &lt;&lt;{questionForm.variable_name || 'VAR'}&gt;&gt;</p>
			</div>
		{/if}

		<div class="flex justify-end gap-2 pt-2">
			<button onclick={() => (showQuestionModal = false)} class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
			<button onclick={saveQuestion} disabled={saving} class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
				{saving ? 'Saving...' : editingQuestion ? 'Update' : 'Create'} Question
			</button>
		</div>
	</div>
</AppModal>

<!-- Delete Confirmation Modal -->
<AppModal open={showDeleteModal} title="Confirm Delete" onClose={() => (showDeleteModal = false)}>
	<div class="space-y-3">
		<p class="text-sm text-gray-600">Are you sure you want to delete this item?</p>
		<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
			<p class="text-sm font-semibold text-yellow-800">{deleteTarget?.name}</p>
		</div>
		<p class="text-sm text-red-600">This action cannot be undone.</p>
		<div class="flex justify-end gap-2 pt-2">
			<button onclick={() => (showDeleteModal = false)} class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
			<button onclick={confirmDelete} disabled={deleting} class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
				{deleting ? 'Deleting...' : 'Delete'}
			</button>
		</div>
	</div>
</AppModal>
