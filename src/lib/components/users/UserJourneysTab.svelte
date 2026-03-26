<script lang="ts">
	import { apiFetch } from '$utils/api';

	interface JourneyAssignment {
		id: number;
		journey_metadata_id: number;
		status: string;
		current_step: number;
		total_steps: number;
		started_at?: string;
		completed_at?: string;
		last_interaction_at?: string;
		created_at: string;
		[key: string]: unknown;
	}

	let { userId }: { userId: string } = $props();

	let assignments = $state<JourneyAssignment[]>([]);
	let loading = $state(false);
	let error = $state('');

	const statusColors: Record<string, string> = {
		in_progress: 'bg-blue-100 text-blue-700',
		completed: 'bg-green-100 text-green-700',
		paused: 'bg-yellow-100 text-yellow-700',
		expired: 'bg-gray-100 text-gray-600',
		assigned: 'bg-purple-100 text-purple-700'
	};

	async function fetchJourneys() {
		loading = true;
		error = '';
		try {
			const response = await apiFetch<{ data: JourneyAssignment[] }>(`/journey-assignments/user/${userId}`);
			assignments = (response.data ?? response) as unknown as JourneyAssignment[];
			if (!Array.isArray(assignments)) assignments = [];
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load journeys';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (userId) fetchJourneys();
	});

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="space-y-3">
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<p class="text-sm text-red-600">{error}</p>
	{:else if assignments.length === 0}
		<p class="text-sm text-gray-500">No journey assignments for this user.</p>
	{:else}
		{#each assignments as a}
			<div class="p-3 border border-gray-200 rounded-lg">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm font-medium text-gray-900">Journey #{a.journey_metadata_id}</span>
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusColors[a.status] || 'bg-gray-100 text-gray-600'}">
						{a.status.replace(/_/g, ' ')}
					</span>
				</div>
				<div class="flex items-center gap-4 text-xs text-gray-500">
					<span>Progress: {a.current_step}/{a.total_steps}</span>
					<span>Started: {formatDate(a.started_at as string)}</span>
					{#if a.completed_at}
						<span>Completed: {formatDate(a.completed_at)}</span>
					{/if}
				</div>
				<!-- Progress bar -->
				<div class="mt-2 w-full bg-gray-200 rounded-full h-1.5">
					<div class="bg-blue-600 h-1.5 rounded-full transition-all" style="width: {a.total_steps > 0 ? (a.current_step / a.total_steps) * 100 : 0}%"></div>
				</div>
			</div>
		{/each}
	{/if}
</div>
