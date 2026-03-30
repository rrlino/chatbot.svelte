<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { CalendarCheckIcon, PlusIcon, PencilIcon, TrashIcon } from 'lucide-svelte';
	import { AppModal } from '$components/core';
	import { toast } from '$lib/stores/toast';

	interface TrainingAssignment {
		id: number;
		client_id: number;
		client_name: string;
		training_set_id: number;
		training_set_name: string;
		status: string;
		progress_percentage: number;
		completed_sessions: number;
		total_sessions: number;
		start_date?: string;
		end_date?: string;
		notes?: string;
		created_at: string;
	}

	interface AssignmentForm {
		client_id: number;
		training_set_id: number;
		status: string;
		start_date: string;
		end_date: string;
		notes: string;
	}

	const emptyForm: AssignmentForm = {
		client_id: 0, training_set_id: 0, status: 'active', start_date: '', end_date: '', notes: ''
	};

	let { data } = $props();

	let assignments = $state<TrainingAssignment[]>((data.assignments as unknown as TrainingAssignment[]) ?? []);
	let modalOpen = $state(false);
	let deleteModalOpen = $state(false);
	let editingAssignment = $state<TrainingAssignment | null>(null);
	let deleteTarget = $state<TrainingAssignment | null>(null);
	let form = $state<AssignmentForm>({ ...emptyForm });

	const STATUSES = ['active', 'paused', 'completed', 'overdue'];

	const statusColors: Record<string, string> = {
		active: 'bg-blue-100 text-blue-700',
		paused: 'bg-yellow-100 text-yellow-700',
		completed: 'bg-green-100 text-green-700',
		overdue: 'bg-red-100 text-red-700'
	};

	function progressColor(pct: number): string {
		if (pct >= 90) return 'bg-green-500';
		if (pct >= 70) return 'bg-blue-500';
		if (pct >= 50) return 'bg-yellow-500';
		return 'bg-red-500';
	}

	// Handle form action results
	$effect(() => {
		const formResult = page.form;
		if (formResult?.success && formResult.action) {
			const messages: Record<string, string> = {
				create: 'Training assignment created',
				update: 'Training assignment updated',
				delete: 'Training assignment deleted'
			};
			toast.success(messages[formResult.action as string] || 'Done');
			invalidateAll();
		}
		if (formResult?.error) {
			toast.error(formResult.error as string);
		}
	});

	// Refresh data on invalidation
	$effect(() => {
		assignments = (data.assignments as unknown as TrainingAssignment[]) ?? [];
	});

	function openCreate() {
		editingAssignment = null;
		form = { ...emptyForm };
		modalOpen = true;
	}

	function openEdit(a: TrainingAssignment) {
		editingAssignment = a;
		form = {
			client_id: a.client_id,
			training_set_id: a.training_set_id,
			status: a.status,
			start_date: a.start_date?.split('T')[0] || '',
			end_date: a.end_date?.split('T')[0] || '',
			notes: a.notes || ''
		};
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
		editingAssignment = null;
	}

	function openDelete(a: TrainingAssignment) {
		deleteTarget = a;
		deleteModalOpen = true;
	}

	function closeDelete() {
		deleteModalOpen = false;
		deleteTarget = null;
	}

	function formatDate(dateStr?: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Training Assignments - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
				<CalendarCheckIcon class="h-7 w-7 text-blue-600" />
				Training Assignments
			</h1>
			<p class="text-sm text-gray-500 mt-1">Track client progress and manage training assignments</p>
		</div>
		<button
			onclick={openCreate}
			class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
		>
			<PlusIcon class="h-4 w-4" />
			Create Assignment
		</button>
	</div>

	{#if assignments.length === 0}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
			<CalendarCheckIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
			<p class="text-gray-500">No training assignments found.</p>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Training Set</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each assignments as a (a.id)}
						<tr class="hover:bg-gray-50">
							<td class="px-4 py-3">
								<div class="text-sm font-medium text-gray-900">{a.client_name || `Client #${a.client_id}`}</div>
							</td>
							<td class="px-4 py-3">
								<div class="text-sm text-gray-700">{a.training_set_name || `Set #${a.training_set_id}`}</div>
								<div class="text-xs text-gray-400">{a.total_sessions} sessions</div>
							</td>
							<td class="px-4 py-3">
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusColors[a.status] || 'bg-gray-100 text-gray-600'}">
									{a.status}
								</span>
							</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-2">
									<div class="w-24 bg-gray-200 rounded-full h-2">
										<div class="h-2 rounded-full {progressColor(a.progress_percentage)}" style="width: {a.progress_percentage}%"></div>
									</div>
									<span class="text-xs text-gray-500">{a.completed_sessions}/{a.total_sessions}</span>
									<span class="text-xs font-medium text-gray-700">{a.progress_percentage}%</span>
								</div>
							</td>
							<td class="px-4 py-3 text-sm text-gray-500">{formatDate(a.start_date)}</td>
							<td class="px-4 py-3 text-sm text-gray-500">{formatDate(a.end_date)}</td>
							<td class="px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-1">
									<button
										onclick={() => openEdit(a)}
										class="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
										title="Edit"
									>
										<PencilIcon class="h-4 w-4" />
									</button>
									<button
										onclick={() => openDelete(a)}
										class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
										title="Delete"
									>
										<TrashIcon class="h-4 w-4" />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Create/Edit Modal -->
<AppModal open={modalOpen} title={editingAssignment ? 'Edit Assignment' : 'Create Assignment'} onClose={closeModal}>
	<form
		method="POST"
		action={editingAssignment ? '?/update' : '?/create'}
		use:enhance={() => {
			return ({ update }) => {
				update({ reset: false });
				closeModal();
			};
		}}
	>
		<div class="space-y-4">
			{#if editingAssignment}
				<input type="hidden" name="id" value={editingAssignment.id} />
			{/if}

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="ta_client" class="block text-sm font-medium text-gray-700 mb-1">Client ID *</label>
					<input
						id="ta_client"
						type="number"
						name="client_id"
						value={form.client_id || ''}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Client ID"
						required
					/>
				</div>
				<div>
					<label for="ta_set" class="block text-sm font-medium text-gray-700 mb-1">Training Set ID *</label>
					<input
						id="ta_set"
						type="number"
						name="training_set_id"
						value={form.training_set_id || ''}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Training Set ID"
						required
					/>
				</div>
			</div>

			<div class="grid grid-cols-3 gap-4">
				<div>
					<label for="ta_status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
					<select
						id="ta_status"
						name="status"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{#each STATUSES as s}
							<option value={s} selected={form.status === s}>{s}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="ta_start" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
					<input
						id="ta_start"
						type="date"
						name="start_date"
						value={form.start_date}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label for="ta_end" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
					<input
						id="ta_end"
						type="date"
						name="end_date"
						value={form.end_date}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
			</div>

			<div>
				<label for="ta_notes" class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
				<textarea
					id="ta_notes"
					name="notes"
					rows="2"
					class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Optional notes"
				>{form.notes}</textarea>
			</div>

			<div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
				<button
					type="button"
					onclick={closeModal}
					class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
				>Cancel</button>
				<button
					type="submit"
					class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
				>
					{editingAssignment ? 'Update' : 'Create'}
				</button>
			</div>
		</div>
	</form>
</AppModal>

<!-- Delete Confirmation Modal -->
<AppModal open={deleteModalOpen} title="Confirm Delete" onClose={closeDelete}>
	{#if deleteTarget}
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				return ({ update }) => {
					update({ reset: false });
					closeDelete();
				};
			}}
		>
			<div class="space-y-4">
				<input type="hidden" name="id" value={deleteTarget.id} />
				<p class="text-sm text-gray-600">Are you sure you want to delete this training assignment?</p>
				<div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
					<h4 class="font-medium text-sm text-gray-900">{deleteTarget.client_name || `Client #${deleteTarget.client_id}`}</h4>
					<p class="text-xs text-gray-500 mt-1">{deleteTarget.training_set_name || `Set #${deleteTarget.training_set_id}`}</p>
					<p class="text-xs text-gray-400 mt-1">{deleteTarget.completed_sessions}/{deleteTarget.total_sessions} sessions completed</p>
				</div>
				<p class="text-xs text-red-600">This action cannot be undone.</p>
				<div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
					<button
						type="button"
						onclick={closeDelete}
						class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
					>Cancel</button>
					<button
						type="submit"
						class="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
					>
						<TrashIcon class="h-4 w-4 inline -mt-0.5 mr-1" />
						Delete
					</button>
				</div>
			</div>
		</form>
	{/if}
</AppModal>
