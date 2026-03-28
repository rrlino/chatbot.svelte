<script lang="ts">
	import { onMount } from 'svelte';
	import { RefreshCw, Users, CheckCircle, Hourglass, Signpost, Search, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, UserCircle, Eye, Inbox } from 'lucide-svelte';
	import { apiFetch } from '$utils/api';
	import { toast } from '$stores/toast';
	import { endpoints } from '$config/endpoints';
	import { AppModal } from '$components/core';

	interface Journey {
		id: number;
		journey_name: string;
		title: string;
		is_active: boolean;
		question_count?: number;
	}

	interface User {
		id: number;
		name: string;
		full_name?: string;
		username?: string;
		phone?: string;
		phone_number?: string;
	}

	interface UserProgress {
		user_id: number;
		user_name: string;
		user_phone?: string;
		journey_id: number;
		journey_name: string;
		journey_title: string;
		total_questions: number;
		answered_questions: number;
		completion_percentage: number;
		status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
		last_activity: string;
		assignment_id?: number;
	}

	interface UserAnswer {
		question_text: string;
		step_number: number;
		variable_name?: string;
		answer?: string;
	}

	let loading = $state(false);
	let loadingDetails = $state(false);
	let journeys = $state<Journey[]>([]);
	let users = $state<User[]>([]);
	let userProgress = $state<UserProgress[]>([]);
	let selectedJourneyType = $state('');
	let searchQuery = $state('');
	let statusFilter = $state('');
	let currentPage = $state(1);
	const itemsPerPage = 20;
	let showDetailsModal = $state(false);
	let selectedUser = $state<UserProgress | null>(null);
	let userAnswers = $state<UserAnswer[]>([]);

	// Computed
	const totalUsers = $derived(users.length);
	const completedCount = $derived(userProgress.filter((p) => p.status === 'COMPLETED').length);
	const inProgressCount = $derived(userProgress.filter((p) => p.status === 'IN_PROGRESS').length);
	const activeJourneysCount = $derived(journeys.filter((j) => j.is_active).length);

	const filteredUserProgress = $derived(
		(() => {
			let filtered = userProgress;

			if (selectedJourneyType) {
				filtered = filtered.filter((p) => p.journey_name === selectedJourneyType);
			}

			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				filtered = filtered.filter(
					(p) =>
						(p.user_name && p.user_name.toLowerCase().includes(query)) ||
						(p.user_phone && p.user_phone.includes(query))
				);
			}

			if (statusFilter) {
				const status = statusFilter.toUpperCase();
				filtered = filtered.filter((p) => p.status === status);
			}

			return filtered;
		})()
	);

	const paginatedProgress = $derived(
		(() => {
			const start = (currentPage - 1) * itemsPerPage;
			const end = start + itemsPerPage;
			return filteredUserProgress.slice(start, end);
		})()
	);

	const totalPages = $derived(Math.ceil(filteredUserProgress.length / itemsPerPage));

	const visiblePages = $derived(
		(() => {
			const pages: number[] = [];
			const start = Math.max(1, currentPage - 2);
			const end = Math.min(totalPages, currentPage + 2);

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			return pages;
		})()
	);

	// Methods
	async function loadData() {
		loading = true;
		try {
			await Promise.all([loadJourneys(), loadUsers(), loadUserProgress()]);
			toast.success('Data loaded successfully');
		} catch {
			toast.error('Failed to load data');
		} finally {
			loading = false;
		}
	}

	async function loadJourneys() {
		try {
			const response = await apiFetch<Journey[] | { data: Journey[] }>(endpoints.journeys.list);
			const data = Array.isArray(response) ? response : response.data ?? [];
			journeys = data.map((j) => ({
				id: j.id,
				journey_name: j.journey_name || '',
				title: j.title || j.journey_name || '',
				is_active: j.is_active ?? true,
				question_count: j.question_count ?? 0
			}));
		} catch {
			journeys = [];
		}
	}

	async function loadUsers() {
		try {
			const response = await apiFetch<{ users: User[] } | User[]>('/users?limit=100');
			const data = 'users' in response ? response.users : Array.isArray(response) ? response : [];
			users = data.map((u) => ({
				id: u.id,
				name: u.name || u.full_name || u.username || 'Unknown',
				phone: u.phone_number || u.phone || '-'
			}));
		} catch {
			users = [];
		}
	}

	async function loadUserProgress() {
		try {
			// Load all assignments
			const response = await apiFetch<{ items: any[]; count?: number } | any[]>(
				`${endpoints.journeyAssignments.list}?limit=1000`
			);
			const assignments = Array.isArray(response) ? response : response.items ?? [];

			// Enrich with user and journey information
			const enriched: UserProgress[] = await Promise.all(
				assignments.map(async (assignment: any) => {
					const user = users.find((u) => u.id === assignment.user_id);
					const journey = journeys.find((j) => j.id === assignment.journey_metadata_id);
					const totalSteps = assignment.total_steps || 0;
					const currentStep = assignment.current_step || 0;
					const status = (assignment.status || 'not_started')
						.toUpperCase()
						.replace(/-/g, '_') as 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
					const percentage = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

					return {
						user_id: assignment.user_id,
						user_name: user?.name || 'Unknown',
						user_phone: user?.phone || '-',
						journey_id: assignment.journey_metadata_id,
						journey_name: journey?.journey_name || '',
						journey_title: journey?.title || journey?.journey_name || '',
						total_questions: totalSteps,
						answered_questions: status === 'COMPLETED' ? totalSteps : currentStep,
						completion_percentage: status === 'COMPLETED' ? 100 : percentage,
						status: status === 'IN_PROGRESS' ? 'IN_PROGRESS' : status === 'COMPLETED' ? 'COMPLETED' : 'NOT_STARTED',
						last_activity: assignment.completed_at || assignment.started_at || new Date().toISOString(),
						assignment_id: assignment.id
					};
				})
			);

			userProgress = enriched;
		} catch {
			userProgress = [];
		}
	}

	async function viewUserDetails(progress: UserProgress) {
		selectedUser = progress;
		showDetailsModal = true;
		loadingDetails = true;

		try {
			// Get questions for the journey
			const questionsResponse = await apiFetch<any[] | { data: any[] }>(
				endpoints.journeys.questions(progress.journey_id.toString())
			);
			const questions = Array.isArray(questionsResponse)
				? questionsResponse
				: questionsResponse.data ?? [];

			userAnswers = questions
				.filter((q) => q.is_active ?? q.is_active ?? true)
				.sort((a, b) => (a.display_order || a.order || 0) - (b.display_order || b.order || 0))
				.map((q) => ({
					question_text: q.question_text,
					step_number: q.display_order || q.order || 0,
					variable_name: q.variable_tag || q.variable_name || '',
					answer: undefined // Per-user answers would need a separate API call
				}));
		} catch {
			toast.error('Failed to load details');
		} finally {
			loadingDetails = false;
		}
	}

	function closeDetailsModal() {
		showDetailsModal = false;
		selectedUser = null;
		userAnswers = [];
	}

	function formatDate(dateString: string): string {
		if (!dateString) return '-';
		try {
			const date = new Date(dateString);
			return new Intl.DateTimeFormat('default', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			}).format(date);
		} catch {
			return '-';
		}
	}

	$effect(() => {
		if (searchQuery || selectedJourneyType || statusFilter) {
			currentPage = 1;
		}
	});

	onMount(() => {
		loadData();
	});
</script>

<svelte:head>
	<title>Journey Responses - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
				<Signpost class="h-6 w-6 text-blue-600" />
				Journey Responses
			</h1>
			<p class="text-sm text-gray-500 mt-1">View and monitor user responses to journey questions</p>
		</div>
		<button onclick={loadData} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
			<RefreshCw class="h-4 w-4" />
			Refresh
		</button>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
			<div class="p-2 bg-blue-100 rounded-lg">
				<Users class="h-5 w-5 text-blue-600" />
			</div>
			<div>
				<p class="text-sm text-gray-500">Total Users</p>
				<p class="text-xl font-bold">{totalUsers}</p>
			</div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
			<div class="p-2 bg-green-100 rounded-lg">
				<CheckCircle class="h-5 w-5 text-green-600" />
			</div>
			<div>
				<p class="text-sm text-gray-500">Completed</p>
				<p class="text-xl font-bold">{completedCount}</p>
			</div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
			<div class="p-2 bg-blue-100 rounded-lg">
				<Hourglass class="h-5 w-5 text-blue-600" />
			</div>
			<div>
				<p class="text-sm text-gray-500">In Progress</p>
				<p class="text-xl font-bold">{inProgressCount}</p>
			</div>
		</div>
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3">
			<div class="p-2 bg-yellow-100 rounded-lg">
				<Signpost class="h-5 w-5 text-yellow-600" />
			</div>
			<div>
				<p class="text-sm text-gray-500">Active Journeys</p>
				<p class="text-xl font-bold">{activeJourneysCount}</p>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Journey Type</p>
				<select bind:value={selectedJourneyType} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
					<option value="">All Journeys</option>
					{#each journeys as journey}
						<option value={journey.journey_name}>{journey.title || journey.journey_name}</option>
					{/each}
				</select>
			</div>
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Search User</p>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search by name or phone..."
					class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Status</p>
				<select bind:value={statusFilter} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
					<option value="">All</option>
					<option value="completed">Completed</option>
					<option value="in_progress">In Progress</option>
					<option value="not_started">Not Started</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<p class="text-gray-500 mt-3">Loading journey responses...</p>
		</div>
	{:else}
		<!-- User Progress Table -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200">
			<div class="px-4 py-3 border-b border-gray-200 bg-white rounded-t-lg">
				<h5 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
					<Users class="h-4 w-4" />
					User Progress
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
						{filteredUserProgress.length}
					</span>
				</h5>
			</div>

			<!-- Empty State -->
			{#if filteredUserProgress.length === 0}
				<div class="text-center py-12">
					<Inbox class="h-12 w-12 text-gray-300 mx-auto mb-3" />
					<p class="text-gray-500">
						{searchQuery || selectedJourneyType || statusFilter
							? 'No users match your filters'
							: 'No user data available'}
					</p>
				</div>
			{:else}
				<!-- Desktop Table -->
				<div class="overflow-x-auto hidden md:block">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Journey</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
								<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each paginatedProgress as progress (progress.user_id + '-' + progress.journey_id)}
								<tr class="hover:bg-gray-50">
									<td class="px-4 py-3 whitespace-nowrap">
										<div class="flex items-center">
											<UserCircle class="h-8 w-8 text-gray-400 mr-2" />
											<div>
												<div class="text-sm font-medium text-gray-900">{progress.user_name || 'Unknown'}</div>
												<div class="text-xs text-gray-500">{progress.user_phone || '-'}</div>
											</div>
										</div>
									</td>
									<td class="px-4 py-3 whitespace-nowrap">
										<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
											{progress.journey_title || progress.journey_name}
										</span>
									</td>
									<td class="px-4 py-3 whitespace-nowrap">
										<div class="w-full">
											<div class="flex items-center justify-between mb-1">
												<span class="text-xs text-gray-500">
													{progress.answered_questions}/{progress.total_questions} questions
												</span>
												<span class="text-xs font-medium">{progress.completion_percentage}%</span>
											</div>
											<div class="w-full bg-gray-200 rounded-full h-1.5">
												<div
													class="h-1.5 rounded-full {progress.completion_percentage === 100
														? 'bg-green-500'
														: progress.completion_percentage > 0
															? 'bg-blue-500'
															: 'bg-gray-400'}"
													style="width: {progress.completion_percentage}%"
												></div>
											</div>
										</div>
									</td>
									<td class="px-4 py-3 whitespace-nowrap">
										<span
											class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full {progress.status === 'COMPLETED'
												? 'bg-green-100 text-green-700'
												: progress.status === 'IN_PROGRESS'
													? 'bg-blue-100 text-blue-700'
													: 'bg-gray-100 text-gray-700'}"
										>
											{progress.status}
										</span>
									</td>
									<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
										{formatDate(progress.last_activity)}
									</td>
									<td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
										<button
											onclick={() => viewUserDetails(progress)}
											class="text-blue-600 hover:text-blue-900"
											title="View Details"
										>
											<Eye class="h-4 w-4" />
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Mobile Cards -->
				<div class="p-3 md:hidden space-y-3">
					{#each paginatedProgress as progress (progress.user_id + '-' + progress.journey_id)}
						<div class="border border-gray-200 rounded-lg p-3">
							<div class="flex items-start justify-between mb-2">
								<div>
									<div class="text-sm font-medium text-gray-900">{progress.user_name || 'Unknown'}</div>
									<div class="text-xs text-gray-500">{progress.user_phone || '-'}</div>
								</div>
								<span
									class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full {progress.status === 'COMPLETED'
										? 'bg-green-100 text-green-700'
										: progress.status === 'IN_PROGRESS'
											? 'bg-blue-100 text-blue-700'
											: 'bg-gray-100 text-gray-700'}"
								>
									{progress.status}
								</span>
							</div>

							<div class="mb-2">
								<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
									{progress.journey_title || progress.journey_name}
								</span>
							</div>

							<div class="mb-3">
								<div class="flex items-center justify-between mb-1">
									<span class="text-xs text-gray-500">
										{progress.answered_questions}/{progress.total_questions} questions
									</span>
									<span class="text-xs font-medium">{progress.completion_percentage}%</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-1.5">
									<div
										class="h-1.5 rounded-full {progress.completion_percentage === 100
											? 'bg-green-500'
											: progress.completion_percentage > 0
												? 'bg-blue-500'
												: 'bg-gray-400'}"
										style="width: {progress.completion_percentage}%"
									></div>
								</div>
							</div>

							<div class="flex items-center justify-between">
								<span class="text-xs text-gray-500">{formatDate(progress.last_activity)}</span>
								<button
									onclick={() => viewUserDetails(progress)}
									class="inline-flex items-center px-2 py-1 border border-blue-300 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
								>
									<Eye class="h-3 w-3 mr-1" />
									View
								</button>
							</div>
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				{#if totalPages > 1}
					<div class="px-4 py-3 border-t border-gray-200 bg-white rounded-b-lg">
						<nav class="flex items-center justify-between">
							<div class="flex-1 flex justify-between sm:hidden">
								<button
									onclick={() => (currentPage = Math.max(1, currentPage - 1))}
									disabled={currentPage === 1}
									class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
								>
									Previous
								</button>
								<button
									onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
									disabled={currentPage === totalPages}
									class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
								>
									Next
								</button>
							</div>
							<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
								<div>
									<p class="text-sm text-gray-700">
										Showing
										<span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
										to
										<span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredUserProgress.length)}</span>
										of
										<span class="font-medium">{filteredUserProgress.length}</span>
										results
									</p>
								</div>
								<div>
									<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
										<button
											onclick={() => (currentPage = 1)}
											disabled={currentPage === 1}
											class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
										>
											<ChevronFirst class="h-4 w-4" />
										</button>
										<button
											onclick={() => (currentPage = Math.max(1, currentPage - 1))}
											disabled={currentPage === 1}
											class="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
										>
											<ChevronLeft class="h-4 w-4" />
										</button>
										{#each visiblePages as page}
											<button
												onclick={() => (currentPage = page)}
												class="relative inline-flex items-center px-4 py-2 border text-sm font-medium {page === currentPage
													? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
													: 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}"
											>
												{page}
											</button>
										{/each}
										<button
											onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
											disabled={currentPage === totalPages}
											class="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
										>
											<ChevronRight class="h-4 w-4" />
										</button>
										<button
											onclick={() => (currentPage = totalPages)}
											disabled={currentPage === totalPages}
											class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
										>
											<ChevronLast class="h-4 w-4" />
										</button>
									</nav>
								</div>
							</div>
						</nav>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<!-- User Details Modal -->
<AppModal open={showDetailsModal} title="User Details" onClose={closeDetailsModal}>
	{#if selectedUser}
		<div class="space-y-4">
			{#if loadingDetails}
				<div class="flex flex-col items-center justify-center py-8">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="text-gray-500 mt-3">Loading...</p>
				</div>
			{:else}
				<!-- User Info -->
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-xs text-gray-500">User</p>
							<p class="text-sm font-semibold">{selectedUser.user_name}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500">Phone</p>
							<p class="text-sm">{selectedUser.user_phone || '-'}</p>
						</div>
					</div>
				</div>

				<!-- Journey Progress -->
				<div>
					<h6 class="text-sm font-semibold text-gray-900 mb-2">
						{selectedUser.journey_title || selectedUser.journey_name}
					</h6>
					<div class="mb-3">
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs text-gray-500">Overall Progress</span>
							<span class="text-xs font-medium">
								{selectedUser.answered_questions}/{selectedUser.total_questions} ({selectedUser.completion_percentage}%)
							</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div
								class="bg-green-500 h-2 rounded-full"
								style="width: {selectedUser.completion_percentage}%"
							></div>
						</div>
					</div>
				</div>

				<!-- Questions and Answers -->
				{#if userAnswers.length > 0}
					<div>
						<h6 class="text-sm font-semibold text-gray-900 mb-2">Questions & Answers</h6>
						<div class="space-y-2">
							{#each userAnswers as answer}
								<div class="border border-gray-200 rounded-lg p-3">
									<div class="flex items-start justify-between mb-2">
										<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
											Q{answer.step_number}
										</span>
										<span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full {answer.answer
											? 'bg-green-100 text-green-700'
											: 'bg-gray-100 text-gray-700'}">
											{answer.answer ? 'Answered' : 'Pending'}
										</span>
									</div>
									<div class="mb-2">
										<p class="text-sm font-medium text-gray-900">{answer.question_text}</p>
										{#if answer.answer}
											<div class="mt-2 bg-green-50 border border-green-200 rounded p-2">
												<p class="text-sm text-green-800">
													<UserCircle class="h-3 w-3 inline mr-1" />
													<strong>{answer.answer}</strong>
												</p>
											</div>
										{:else}
											<p class="text-sm text-gray-400 italic">Not answered yet</p>
										{/if}
									</div>
									{#if answer.variable_name}
										<p class="text-xs text-gray-500">
											<Signpost class="h-3 w-3 inline mr-1" />
											{answer.variable_name}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
						<p class="text-sm text-yellow-800">
							⚠️ No answers recorded yet
						</p>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</AppModal>
