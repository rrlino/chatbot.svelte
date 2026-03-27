<script lang="ts">
	import { get } from 'svelte/store';
	import { RefreshCwIcon, MessageSquareIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { endpoints } from '$config/endpoints';
	import { apiFetch } from '$utils/api';
	import type { Column } from '$components/core/AppTable.svelte';

	interface JourneyResponse {
		id: number;
		user_id: number;
		journey_assignment_id: number;
		question_tag: string;
		answer?: unknown;
		answer_text?: string;
		message_id?: number;
		responded_at: string;
		created_at: string;
		[key: string]: unknown;
	}

	const table = useTable({ initialSortKey: 'responded_at', initialSortDirection: 'desc' });

	let responses = $state<JourneyResponse[]>([]);
	let error = $state('');
	let filterQuestionTag = $state('');

	const columns: Column[] = [
		{ key: 'id', label: 'ID', sortable: true },
		{ key: 'user_id', label: 'User ID', sortable: true },
		{ key: 'journey_assignment_id', label: 'Assignment', sortable: true },
		{ key: 'question_tag', label: 'Question', sortable: true },
		{ key: 'answer_text', label: 'Answer' },
		{ key: 'responded_at', label: 'Responded', sortable: true }
	];

	async function fetchResponses(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set('limit', String(params.per_page));
			qs.set('offset', String((params.page - 1) * params.per_page));
			if (params.search) qs.set('search', params.search);
			if (filterQuestionTag) qs.set('question_tag', filterQuestionTag);

			const response = await apiFetch<Record<string, unknown>>(
				`${endpoints.journeyAssignments.list}?${qs.toString()}`
			);

			let list = (response as Record<string, unknown>).items ?? response.data ?? response;
			list = Array.isArray(list) ? list : [];

			responses = list as JourneyResponse[];
			table.setTotalItems((response as Record<string, unknown>).count as number ?? (response as Record<string, unknown>).total as number ?? list.length);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load journey responses';
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => { fetchResponses(get(table.fetchParams)); });
	function handleSort(key: string) { table.toggleSort(key); }

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function formatAnswer(answer: unknown): string {
		if (answer === null || answer === undefined) return '—';
		if (typeof answer === 'string') return answer.length > 80 ? answer.slice(0, 80) + '...' : answer;
		return JSON.stringify(answer);
	}
</script>

<svelte:head>
	<title>Journey Responses - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Journey Responses</h1>
			<p class="text-sm text-gray-500 mt-1">View user responses to journey questions</p>
		</div>
		<button onclick={() => fetchResponses(get(table.fetchParams))} class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
			<RefreshCwIcon class="h-4 w-4" />Refresh
		</button>
	</div>

	{#if error}<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>{/if}

	<AppFilters bind:search={$table.search} bind:perPage={$table.perPage} searchPlaceholder="Search responses..." onSearchChange={(q) => table.setSearch(q)} onPerPageChange={(pp) => table.setPerPage(pp)} loading={$table.loading}>
		<input type="text" bind:value={filterQuestionTag} placeholder="Filter by question tag..." onchange={() => table.setPage(1)} disabled={$table.loading} class="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
	</AppFilters>

	<AppTable columns={columns} rows={responses} loading={$table.loading} sortKey={$table.sortKey} sortDirection={$table.sortDirection} onSort={handleSort}>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'question_tag'}
				<span class="font-mono text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{row.question_tag as string}</span>
			{:else if col.key === 'answer_text'}
				<span class="text-gray-700 text-sm">{formatAnswer(row.answer_text ?? row.answer)}</span>
			{:else if col.key === 'responded_at'}
				<span class="text-gray-500 text-sm">{formatDate(row.responded_at as string)}</span>
			{:else}
				{row[col.key] as unknown as string ?? ''}
			{/if}
		{/snippet}
		{#snippet children()}
			<AppPagination current={$table.page} total={$table.totalPages} totalItems={$table.totalItems} perPage={$table.perPage} onPageChange={(p) => table.setPage(p)} />
		{/snippet}
	</AppTable>
</div>
