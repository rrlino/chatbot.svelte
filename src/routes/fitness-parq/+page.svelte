<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Download, RefreshCw, Search, ClipboardList, Users, AlertTriangle, AlertCircle, Clock, BarChart3, Pencil, Trash2, ToggleRight, ToggleLeft } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { toast } from '$stores/toast';
	import { endpoints } from '$config/endpoints';
	import { AppModal } from '$components/core';

	interface ParqQuestion {
		id: number;
		question_text: string;
		category: string;
		risk_level: string;
		is_enabled: boolean;
		order_number: number;
	}

	interface ParqAnswer {
		id: number;
		user_name: string;
		question_text: string;
		answer: string;
		risk_level: string;
		created_at: string;
	}

	let loading = $state(false);
	let activeTab = $state('questions');
	let questions = $state<ParqQuestion[]>([]);
	let answers = $state<ParqAnswer[]>([]);

	let stats = $state({ total_questions: 0, total_responses: 0, high_risk_count: 0, medium_risk_count: 0, pending_review: 0, completion_rate: 0 });

	// Question filters
	let questionSearch = $state('');
	let questionCategory = $state('');
	let questionStatus = $state('');

	// Answer filters
	let answerSearch = $state('');
	let answerRisk = $state('');

	let showModal = $state(false);
	let editingQuestion = $state<ParqQuestion | null>(null);
	let form = $state({ question_text: '', category: 'general', risk_level: 'low', order_number: 1, is_enabled: true });

	const categories = ['cardiovascular', 'musculoskeletal', 'neurological', 'demographic', 'general'];
	const riskLevels = ['low', 'medium', 'high'];

	function filteredQuestions(): ParqQuestion[] {
		return questions.filter((q) => {
			if (questionSearch && !q.question_text.toLowerCase().includes(questionSearch.toLowerCase())) return false;
			if (questionCategory && q.category !== questionCategory) return false;
			if (questionStatus === 'enabled' && !q.is_enabled) return false;
			if (questionStatus === 'disabled' && q.is_enabled) return false;
			return true;
		});
	}

	function highRiskAnswers(): ParqAnswer[] {
		return answers.filter((a) => a.risk_level === 'high');
	}

	function filteredAnswers(): ParqAnswer[] {
		return answers.filter((a) => {
			if (answerSearch && !a.user_name.toLowerCase().includes(answerSearch.toLowerCase()) && !a.question_text.toLowerCase().includes(answerSearch.toLowerCase())) return false;
			if (answerRisk && a.risk_level !== answerRisk) return false;
			return true;
		});
	}

	function getRiskBadge(level: string): string {
		const badges: Record<string, string> = { low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' };
		return badges[level] || 'bg-gray-100 text-gray-700';
	}

	async function loadData() {
		loading = true;
		try {
			const [qRes, aRes] = await Promise.all([
				apiFetch<{ data: ParqQuestion[] } | ParqQuestion[]>(endpoints.journeys.questions),
				apiFetch<{ data: ParqAnswer[] } | ParqAnswer[]>(endpoints.journeys.responses)
			]);
			questions = Array.isArray(qRes) ? qRes : qRes.data ?? [];
			answers = Array.isArray(aRes) ? aRes : aRes.data ?? [];
			stats.total_questions = questions.length;
			stats.total_responses = answers.length;
			stats.high_risk_count = answers.filter((a) => a.risk_level === 'high').length;
			stats.medium_risk_count = answers.filter((a) => a.risk_level === 'medium').length;
			stats.pending_review = answers.filter((a) => a.risk_level === 'high' || a.risk_level === 'medium').length;
			stats.completion_rate = questions.length > 0 ? Math.round((answers.length / (questions.length * 10)) * 100) : 0;
		} catch {
			toast.error('Failed to load PAR-Q data');
		} finally {
			loading = false;
		}
	}

	function openCreateModal() {
		editingQuestion = null;
		form = { question_text: '', category: 'general', risk_level: 'low', order_number: questions.length + 1, is_enabled: true };
		showModal = true;
	}

	function openEditModal(q: ParqQuestion) {
		editingQuestion = q;
		form = { question_text: q.question_text, category: q.category, risk_level: q.risk_level, order_number: q.order_number, is_enabled: q.is_enabled };
		showModal = true;
	}

	async function saveQuestion() {
		try {
			if (editingQuestion) {
				await apiFetch(endpoints.journeys.questions, { method: 'PUT', body: JSON.stringify({ ...form, id: editingQuestion.id }) });
				toast.success('Question updated');
			} else {
				await apiFetch(endpoints.journeys.questions, { method: 'POST', body: JSON.stringify(form) });
				toast.success('Question created');
			}
			showModal = false;
			await loadData();
		} catch {
			toast.error('Failed to save question');
		}
	}

	async function deleteQuestion(q: ParqQuestion) {
		try {
			await apiFetch(endpoints.journeys.questions, { method: 'DELETE' });
			questions = questions.filter((item) => item.id !== q.id);
			toast.success('Question deleted');
		} catch {
			toast.error('Failed to delete');
		}
	}

	function exportData() {
		const blob = new Blob([JSON.stringify({ questions, answers }, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `parq-data-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success('Data exported');
	}

	onMount(() => {
		loadData();
	});
</script>

<svelte:head>
	<title>PAR-Q Management - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="bg-blue-600 text-white rounded-lg p-6 mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-xl font-bold flex items-center gap-2">
					<ClipboardList class="h-6 w-6" />
					PAR-Q Management
				</h1>
				<p class="text-sm opacity-75 mt-1">Physical Activity Readiness Questionnaire - Health Screening & Risk Assessment</p>
			</div>
			<div class="flex items-center gap-2">
				<button onclick={exportData} class="flex items-center gap-2 px-3 py-2 border border-white/30 text-sm rounded-lg hover:bg-white/10 transition-colors">
					<Download class="h-4 w-4" /> Export
				</button>
				<button onclick={openCreateModal} class="flex items-center gap-2 px-3 py-2 bg-white text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors">
					<Plus class="h-4 w-4" /> New Question
				</button>
			</div>
		</div>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
		{#each [
			{ icon: ClipboardList, value: stats.total_questions, label: 'Questions', color: 'text-blue-600' },
			{ icon: Users, value: stats.total_responses, label: 'Responses', color: 'text-green-600' },
			{ icon: AlertTriangle, value: stats.high_risk_count, label: 'High Risk', color: 'text-red-600' },
			{ icon: AlertCircle, value: stats.medium_risk_count, label: 'Medium Risk', color: 'text-yellow-600' },
			{ icon: Clock, value: stats.pending_review, label: 'Pending Review', color: 'text-blue-600' },
			{ icon: BarChart3, value: stats.completion_rate + '%', label: 'Completion', color: 'text-gray-600' }
		] as stat}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
				<stat.icon class="h-6 w-6 {stat.color} mx-auto mb-1" />
				<h3 class="text-lg font-bold">{stat.value}</h3>
				<p class="text-xs text-gray-500">{stat.label}</p>
			</div>
		{/each}
	</div>

	<!-- Tabs -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
		<div class="flex border-b border-gray-200">
			<button onclick={() => (activeTab = 'questions')} class="flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'questions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
				<ClipboardList class="h-4 w-4" />
				Questions Management
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{questions.length}</span>
			</button>
			<button onclick={() => (activeTab = 'answers')} class="flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'answers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
				<Users class="h-4 w-4" />
				Customer Responses
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{answers.length}</span>
			</button>
			<button onclick={() => (activeTab = 'alerts')} class="flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'alerts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
				<AlertTriangle class="h-4 w-4" />
				Risk Alerts
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{highRiskAnswers().length}</span>
			</button>
		</div>

		<div class="p-6">
			{#if loading}
				<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

			{:else if activeTab === 'questions'}
				<!-- Questions Filters -->
				<div class="flex flex-wrap items-center gap-3 mb-4">
					<div class="relative flex-1 min-w-[200px]">
						<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input type="text" bind:value={questionSearch} placeholder="Search questions..." class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
					<select bind:value={questionCategory} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="">All Categories</option>
						{#each categories as cat}
							<option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
						{/each}
					</select>
					<select bind:value={questionStatus} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="">All Status</option>
						<option value="enabled">Enabled</option>
						<option value="disabled">Disabled</option>
					</select>
					<button onclick={loadData} class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><RefreshCw class="h-4 w-4" /></button>
				</div>

				<!-- Questions Table -->
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
								<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each filteredQuestions() as q (q.id)}
								<tr class="hover:bg-gray-50 transition-colors">
									<td class="px-4 py-3 text-sm text-gray-400">{q.order_number}</td>
									<td class="px-4 py-3 text-sm text-gray-900 max-w-sm truncate">{q.question_text}</td>
									<td class="px-4 py-3 text-sm text-gray-500">{q.category}</td>
									<td class="px-4 py-3"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {getRiskBadge(q.risk_level)}">{q.risk_level}</span></td>
									<td class="px-4 py-3">
										<button onclick={() => { q.is_enabled = !q.is_enabled; questions = [...questions]; }} class="p-1 rounded">
											{#if q.is_enabled}
												<ToggleRight class="h-5 w-5 text-green-600" />
											{:else}
												<ToggleLeft class="h-5 w-5 text-gray-400" />
											{/if}
										</button>
									</td>
									<td class="px-4 py-3 text-right">
										<button onclick={() => openEditModal(q)} class="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil class="h-3.5 w-3.5" /></button>
										<button onclick={() => deleteQuestion(q)} class="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 class="h-3.5 w-3.5" /></button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

			{:else if activeTab === 'answers'}
				<!-- Answers Filters -->
				<div class="flex flex-wrap items-center gap-3 mb-4">
					<div class="relative flex-1 min-w-[200px]">
						<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input type="text" bind:value={answerSearch} placeholder="Search by user or question..." class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
					</div>
					<select bind:value={answerRisk} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="">All Risk Levels</option>
						{#each riskLevels as level}
							<option value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
						{/each}
					</select>
				</div>

				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Answer</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each filteredAnswers() as a (a.id)}
								<tr class="hover:bg-gray-50 transition-colors">
									<td class="px-4 py-3 text-sm font-medium text-gray-900">{a.user_name}</td>
									<td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{a.question_text}</td>
									<td class="px-4 py-3 text-sm text-gray-900">{a.answer}</td>
									<td class="px-4 py-3"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {getRiskBadge(a.risk_level)}">{a.risk_level}</span></td>
									<td class="px-4 py-3 text-sm text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

			{:else}
				<!-- Risk Alerts -->
				<div class="space-y-3">
					{#each highRiskAnswers() as alert (alert.id)}
						<div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
							<AlertTriangle class="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-gray-900">{alert.user_name}</p>
								<p class="text-sm text-gray-600 truncate">{alert.question_text}: <strong>{alert.answer}</strong></p>
								<p class="text-xs text-gray-400 mt-1">{alert.created_at ? new Date(alert.created_at).toLocaleString() : ''}</p>
							</div>
							<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 shrink-0">High Risk</span>
						</div>
					{/each}
					{#if highRiskAnswers().length === 0}
						<div class="text-center py-12 text-gray-400"><p>No high-risk alerts</p></div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Question Modal -->
<AppModal open={showModal} title={editingQuestion ? 'Edit Question' : 'New Question'} onClose={() => (showModal = false)}>
	<div class="space-y-4">
		<div>
			<p class="block text-sm font-medium text-gray-700 mb-1">Question Text *</p>
			<textarea bind:value={form.question_text} rows="3" placeholder="Enter question..." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
		</div>
		<div class="grid grid-cols-3 gap-4">
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Category</p>
				<select bind:value={form.category} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
					{#each categories as cat}
						<option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
					{/each}
				</select>
			</div>
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Risk Level</p>
				<select bind:value={form.risk_level} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
					{#each riskLevels as level}
						<option value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
					{/each}
				</select>
			</div>
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Order</p>
				<input type="number" bind:value={form.order_number} min="1" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
			</div>
		</div>
		<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={form.is_enabled} class="rounded" /> Enabled</label>
		<div class="flex justify-end gap-2 pt-2">
			<button onclick={() => (showModal = false)} class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
			<button onclick={saveQuestion} class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
				{editingQuestion ? 'Update' : 'Create'} Question
			</button>
		</div>
	</div>
</AppModal>
