<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import {
		Plus, ChevronDown, ChevronRight, Pencil, Trash2, ToggleLeft, ToggleRight,
		Signpost, ArrowLeft
	} from 'lucide-svelte';
	import { toast } from '$stores/toast';
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

	let { data } = $props();

	let journey = $state<Journey>(data.journey as unknown as Journey);
	let questions = $state<JourneyQuestion[]>((data.questions as unknown as JourneyQuestion[]).sort((a, b) => a.step_number - b.step_number));
	let expandedQuestions = $state<Set<number>>(new Set());

	// Modal state
	let showQuestionModal = $state(false);
	let showDeleteModal = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let editingQuestion = $state<JourneyQuestion | null>(null);
	let deleteTarget = $state<{ name: string } | null>(null);

	// Form state
	let questionForm = $state({
		question_text: '',
		question_type: 'text',
		step_number: 1,
		is_required: true,
		is_active: true,
		variable_name: '',
		options: [{ label: '', value: '' }] as JourneyOption[]
	});

	let formError = $state('');

	const showOptionsEditor = $derived(questionForm.question_type === 'choice');
	const activeCount = $derived(questions.filter((q) => q.is_active).length);

	function getQuestionTypeLabel(type: string): string {
		const labels: Record<string, string> = { text: 'Text', number: 'Number', boolean: 'Yes/No', choice: 'Choice' };
		return labels[type] || type;
	}

	function getQuestionTypeBadge(type: string): string {
		const badges: Record<string, string> = {
			text: 'bg-blue-100 text-blue-700',
			number: 'bg-purple-100 text-purple-700',
			boolean: 'bg-green-100 text-green-700',
			choice: 'bg-orange-100 text-orange-700'
		};
		return badges[type] || 'bg-gray-100 text-gray-700';
	}

	function toggleQuestion(id: number) {
		const next = new Set(expandedQuestions);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedQuestions = next;
	}

	function openCreateModal() {
		editingQuestion = null;
		questionForm = {
			question_text: '',
			question_type: 'text',
			step_number: (questions.length || 0) + 1,
			is_required: true,
			is_active: true,
			variable_name: '',
			options: [{ label: '', value: '' }]
		};
		formError = '';
		showQuestionModal = true;
	}

	function openEditModal(question: JourneyQuestion) {
		editingQuestion = question;
		questionForm = {
			question_text: question.question_text,
			question_type: question.question_type,
			step_number: question.step_number,
			is_required: question.is_required,
			is_active: question.is_active,
			variable_name: question.variable_name || '',
			options: question.choice_options?.length ? question.choice_options.map((o) => ({ ...o })) : [{ label: '', value: '' }]
		};
		formError = '';
		showQuestionModal = true;
	}

	function confirmDelete(question: JourneyQuestion) {
		deleteTarget = { name: question.question_text.substring(0, 50) };
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

	function serializeOptions(): string {
		return JSON.stringify(questionForm.options.filter((o) => o.label || o.value));
	}

	// Handle form action results
	$effect(() => {
		const formResult = page.form;
		if (formResult?.success && formResult.action) {
			if (formResult.action === 'createQuestion') toast.success('Question created');
			else if (formResult.action === 'updateQuestion') toast.success('Question updated');
			else if (formResult.action === 'deleteQuestion') toast.success('Question deleted');
			else if (formResult.action === 'toggleQuestion') toast.success('Question status toggled');
		}
		if (formResult?.error) {
			toast.error(formResult.error as string);
		}
	});
</script>

<svelte:head>
	<title>{journey.name} - Journey Detail</title>
</svelte:head>

<div class="p-6">
	<!-- Breadcrumb & Header -->
	<div class="mb-6">
		<a href="/journeys" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
			<ArrowLeft class="h-4 w-4" />
			Back to Journeys
		</a>
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
					<Signpost class="h-7 w-7" />
					{journey.name}
				</h1>
				<div class="flex items-center gap-3 mt-1">
					<span class="text-sm text-gray-400 font-mono">{journey.code}</span>
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {journey.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
						{journey.is_active ? 'Active' : 'Inactive'}
					</span>
					{#if journey.is_mandatory}
						<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Auto-assigned</span>
					{/if}
				</div>
			</div>
			<button onclick={openCreateModal} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
				<Plus class="h-4 w-4" />
				Add Question
			</button>
		</div>
		{#if journey.description}
			<p class="text-sm text-gray-500 mt-2">{journey.description}</p>
		{/if}
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-3 gap-4 mb-6">
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
			<div class="p-2 bg-blue-100 rounded-lg"><Signpost class="h-5 w-5 text-blue-600" /></div>
			<div><p class="text-xl font-bold">{questions.length}</p><p class="text-xs text-gray-500">Questions</p></div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
			<div class="p-2 bg-green-100 rounded-lg"><ToggleRight class="h-5 w-5 text-green-600" /></div>
			<div><p class="text-xl font-bold">{activeCount}</p><p class="text-xs text-gray-500">Active</p></div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
			<div class="p-2 bg-yellow-100 rounded-lg"><Signpost class="h-5 w-5 text-yellow-600" /></div>
			<div><p class="text-xl font-bold">{journey.total_assignments || 0}</p><p class="text-xs text-gray-500">Users</p></div>
		</div>
	</div>

	<!-- Questions List -->
	<div class="space-y-3">
		{#if questions.length === 0}
			<div class="text-center py-12 text-gray-400">
				<Signpost class="h-12 w-12 mx-auto mb-3 text-gray-300" />
				<p>No questions yet. Add your first question to get started.</p>
				<button onclick={openCreateModal} class="mt-3 text-blue-600 hover:underline text-sm">
					Add First Question
				</button>
			</div>
		{:else}
			{#each questions as question (question.id)}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
					<div class="flex items-center justify-between px-4 py-3">
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
									<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium {getQuestionTypeBadge(question.question_type)}">
										{getQuestionTypeLabel(question.question_type)}
									</span>
									{#if question.is_required}
										<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Required</span>
									{/if}
									{#if question.variable_name}
										<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 font-mono">{question.variable_name}</span>
									{/if}
									{#if !question.is_active}
										<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Inactive</span>
									{/if}
								</div>
							</div>
						</div>

						<!-- Toggle via form action -->
						<div class="flex items-center gap-1 shrink-0">
							<form method="POST" action="?/toggleQuestion" use:enhance>
								<input type="hidden" name="question_id" value={question.id} />
								<input type="hidden" name="is_active" value={String(question.is_active)} />
								<input type="hidden" name="question_text" value={question.question_text} />
								<input type="hidden" name="question_type" value={question.question_type} />
								<input type="hidden" name="step_number" value={String(question.step_number)} />
								<input type="hidden" name="is_required" value={String(question.is_required)} />
								<input type="hidden" name="variable_name" value={question.variable_name || ''} />
								<button type="submit" class="p-1 rounded">
									{#if question.is_active}
										<ToggleRight class="h-4 w-4 text-green-600" />
									{:else}
										<ToggleLeft class="h-4 w-4 text-gray-400" />
									{/if}
								</button>
							</form>
							<button onclick={() => openEditModal(question)} class="p-1 text-blue-600 hover:bg-blue-50 rounded">
								<Pencil class="h-3.5 w-3.5" />
							</button>
							<button onclick={() => confirmDelete(question)} class="p-1 text-red-500 hover:bg-red-50 rounded">
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>

					<!-- Expanded: Choice Options -->
					{#if expandedQuestions.has(question.id) && question.choice_options?.length}
						<div class="border-t border-gray-100 bg-gray-50 px-4 py-3">
							<p class="text-xs font-semibold text-gray-500 mb-2">Answer Options:</p>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{#each question.choice_options as option, idx}
									<div class="flex items-center gap-2 bg-white rounded px-3 py-2">
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
		{/if}
	</div>
</div>

<!-- Question Create/Edit Modal -->
<AppModal open={showQuestionModal} title={editingQuestion ? 'Edit Question' : 'Add Question'} onClose={() => (showQuestionModal = false)}>
	<form
		method="POST"
		action={editingQuestion ? '?/updateQuestion' : '?/createQuestion'}
		use:enhance={() => {
			return ({ update }) => {
				update({ reset: false });
				showQuestionModal = false;
			};
		}}
	>
		<div class="space-y-4">
			<p class="text-xs text-gray-400">Journey: {journey.name}</p>
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Question Text *</p>
				<textarea name="question_text" rows="3" placeholder="Enter your question..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={questionForm.question_text}></textarea>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<p class="block text-sm font-medium text-gray-700 mb-1">Type *</p>
					<select name="question_type" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={questionForm.question_type}>
						<option value="text">Text Input</option>
						<option value="number">Number Input</option>
						<option value="boolean">Yes/No</option>
						<option value="choice">Choice</option>
					</select>
				</div>
				<div>
					<p class="block text-sm font-medium text-gray-700 mb-1">Order/Step *</p>
					<input type="number" name="step_number" min="1" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={questionForm.step_number} />
				</div>
			</div>

			{#if showOptionsEditor}
				<div>
					<p class="block text-sm font-medium text-gray-700 mb-1">Answer Options * <span class="text-xs text-gray-400 font-normal">(Users will select from these)</span></p>
					<div class="space-y-2">
						{#each questionForm.options as option, idx}
							<div class="flex items-center gap-2">
								<span class="text-xs text-gray-400 w-5 text-center">{idx + 1}</span>
								<input type="text" value={option.label} oninput={(e) => { questionForm.options[idx].label = (e.target as HTMLInputElement).value; }} placeholder="Display text" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
								<input type="text" value={option.value} oninput={(e) => { questionForm.options[idx].value = (e.target as HTMLInputElement).value; }} placeholder="Value" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
								<button type="button" onclick={() => removeOption(idx)} disabled={questionForm.options.length <= 1} class="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-30"><Trash2 class="h-3.5 w-3.5" /></button>
							</div>
						{/each}
					</div>
					<button type="button" onclick={addOption} class="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline"><Plus class="h-3.5 w-3.5" /> Add Option</button>
				</div>
			{/if}

			<div class="flex items-center gap-6">
				<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="is_required" checked={questionForm.is_required} class="rounded" /> Required</label>
				<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" checked={questionForm.is_active} class="rounded" /> Active</label>
			</div>

			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Variable Name</p>
				<input type="text" name="variable_name" placeholder="USER_NAME" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" value={questionForm.variable_name} />
				{#if questionForm.variable_name}
					<p class="text-xs text-gray-400 mt-1">Will be available as &lt;&lt;{questionForm.variable_name}&gt;&gt;</p>
				{/if}
			</div>

			{#if editingQuestion}
				<input type="hidden" name="question_id" value={editingQuestion.id} />
			{/if}
			<input type="hidden" name="options" value={serializeOptions()} />

			<div class="flex justify-end gap-2 pt-2">
				<button type="button" onclick={() => (showQuestionModal = false)} class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
				<button type="submit" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
					{editingQuestion ? 'Update' : 'Create'} Question
				</button>
			</div>
		</div>
	</form>
</AppModal>

<!-- Delete Confirmation Modal -->
<AppModal open={showDeleteModal} title="Confirm Delete" onClose={() => (showDeleteModal = false)}>
	<form
		method="POST"
		action="?/deleteQuestion"
		use:enhance={() => {
			return ({ update }) => {
				update({ reset: false });
				showDeleteModal = false;
			};
		}}
	>
		<div class="space-y-3">
			<p class="text-sm text-gray-600">Are you sure you want to delete this question?</p>
			<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
				<p class="text-sm font-semibold text-yellow-800">{deleteTarget?.name}</p>
			</div>
			<p class="text-sm text-red-600">This action cannot be undone.</p>
			{#if editingQuestion}
				<input type="hidden" name="question_id" value={editingQuestion.id} />
			{/if}
			<div class="flex justify-end gap-2 pt-2">
				<button type="button" onclick={() => (showDeleteModal = false)} class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
				<button type="submit" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete</button>
			</div>
		</div>
	</form>
</AppModal>
