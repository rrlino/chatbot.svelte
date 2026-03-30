<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { GaugeIcon, PlusIcon, PencilIcon, TrashIcon } from 'lucide-svelte';
	import { AppModal } from '$components/core';
	import { toast } from '$lib/stores/toast';

	interface RateLimitRule {
		id: number;
		name: string;
		path: string;
		method: string;
		limit: number;
		window: number;
		is_active: boolean;
		description?: string;
		created_at: string;
	}

	interface RateLimitForm {
		name: string;
		path: string;
		method: string;
		limit: number;
		window: number;
		is_active: boolean;
		description: string;
	}

	const emptyForm: RateLimitForm = {
		name: '', path: '', method: '*', limit: 100, window: 60, is_active: true, description: ''
	};

	let { data } = $props();

	let rules = $state<RateLimitRule[]>((data.rules as unknown as RateLimitRule[]) ?? []);
	let modalOpen = $state(false);
	let deleteModalOpen = $state(false);
	let editingRule = $state<RateLimitRule | null>(null);
	let deleteTarget = $state<RateLimitRule | null>(null);
	let form = $state<RateLimitForm>({ ...emptyForm });

	const METHODS = ['*', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

	const methodColors: Record<string, string> = {
		GET: 'bg-green-100 text-green-700',
		POST: 'bg-blue-100 text-blue-700',
		PUT: 'bg-amber-100 text-amber-700',
		PATCH: 'bg-amber-100 text-amber-700',
		DELETE: 'bg-red-100 text-red-700',
		'*': 'bg-gray-100 text-gray-600'
	};

	// Handle form action results
	$effect(() => {
		const formResult = page.form;
		if (formResult?.success && formResult.action) {
			const messages: Record<string, string> = {
				create: 'Rate limit rule created',
				update: 'Rate limit rule updated',
				delete: 'Rate limit rule deleted'
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
		rules = (data.rules as unknown as RateLimitRule[]) ?? [];
	});

	function openCreate() {
		editingRule = null;
		form = { ...emptyForm };
		modalOpen = true;
	}

	function openEdit(rule: RateLimitRule) {
		editingRule = rule;
		form = {
			name: rule.name,
			path: rule.path,
			method: rule.method || '*',
			limit: rule.limit,
			window: rule.window,
			is_active: rule.is_active,
			description: rule.description || ''
		};
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
		editingRule = null;
	}

	function openDelete(rule: RateLimitRule) {
		deleteTarget = rule;
		deleteModalOpen = true;
	}

	function closeDelete() {
		deleteModalOpen = false;
		deleteTarget = null;
	}

	function formatWindow(seconds: number): string {
		if (seconds >= 3600) return `${seconds / 3600}h`;
		if (seconds >= 60) return `${seconds / 60}m`;
		return `${seconds}s`;
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Rate Limiting - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
				<GaugeIcon class="h-7 w-7 text-blue-600" />
				Rate Limiting
			</h1>
			<p class="text-sm text-gray-500 mt-1">Configure API rate limit rules per endpoint</p>
		</div>
		<button
			onclick={openCreate}
			class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
		>
			<PlusIcon class="h-4 w-4" />
			Add Rule
		</button>
	</div>

	{#if rules.length === 0}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
			<GaugeIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
			<p class="text-gray-500">No rate limit rules configured.</p>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limit</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Window</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each rules as rule (rule.id)}
						<tr class="hover:bg-gray-50">
							<td class="px-4 py-3 text-sm font-medium text-gray-900">{rule.name}</td>
							<td class="px-4 py-3 text-sm font-mono text-gray-600">{rule.path}</td>
							<td class="px-4 py-3">
								<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {methodColors[rule.method] || 'bg-gray-100 text-gray-600'}">
									{rule.method || '*'}
								</span>
							</td>
							<td class="px-4 py-3 text-sm text-gray-700">{rule.limit} req</td>
							<td class="px-4 py-3 text-sm text-gray-700">{formatWindow(rule.window)}</td>
							<td class="px-4 py-3">
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
									{rule.is_active ? 'Active' : 'Inactive'}
								</span>
							</td>
							<td class="px-4 py-3 text-sm text-gray-500">{formatDate(rule.created_at)}</td>
							<td class="px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-1">
									<button
										onclick={() => openEdit(rule)}
										class="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
										title="Edit"
									>
										<PencilIcon class="h-4 w-4" />
									</button>
									<button
										onclick={() => openDelete(rule)}
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
<AppModal open={modalOpen} title={editingRule ? 'Edit Rate Limit Rule' : 'Add Rate Limit Rule'} onClose={closeModal}>
	<form
		method="POST"
		action={editingRule ? '?/update' : '?/create'}
		use:enhance={() => {
			return ({ update }) => {
				update({ reset: false });
				closeModal();
			};
		}}
	>
		<div class="space-y-4">
			{#if editingRule}
				<input type="hidden" name="id" value={editingRule.id} />
			{/if}

			<div>
				<label for="rl_name" class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
				<input
					id="rl_name"
					type="text"
					name="name"
					value={form.name}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Global API limit"
					required
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="rl_path" class="block text-sm font-medium text-gray-700 mb-1">Path *</label>
					<input
						id="rl_path"
						type="text"
						name="path"
						value={form.path}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="/api/v1/messages"
						required
					/>
				</div>
				<div>
					<label for="rl_method" class="block text-sm font-medium text-gray-700 mb-1">Method</label>
					<select
						id="rl_method"
						name="method"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{#each METHODS as m}
							<option value={m} selected={form.method === m}>{m}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="rl_limit" class="block text-sm font-medium text-gray-700 mb-1">Limit (requests)</label>
					<input
						id="rl_limit"
						type="number"
						name="limit"
						value={form.limit}
						min="1"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label for="rl_window" class="block text-sm font-medium text-gray-700 mb-1">Window (seconds)</label>
					<input
						id="rl_window"
						type="number"
						name="window"
						value={form.window}
						min="1"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
			</div>

			<div>
				<label for="rl_desc" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
				<textarea
					id="rl_desc"
					name="description"
					rows="2"
					class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Optional description"
				>{form.description}</textarea>
			</div>

			<label class="flex items-center gap-2">
				<input type="checkbox" name="is_active" checked={form.is_active} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
				<span class="text-sm text-gray-700">Active</span>
			</label>

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
					{editingRule ? 'Update' : 'Create'}
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
				<p class="text-sm text-gray-600">Are you sure you want to delete this rate limit rule?</p>
				<div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
					<h4 class="font-medium text-sm text-gray-900">{deleteTarget.name}</h4>
					<p class="text-xs font-mono text-gray-500 mt-1">{deleteTarget.method} {deleteTarget.path}</p>
					<p class="text-xs text-gray-400 mt-1">{deleteTarget.limit} requests per {formatWindow(deleteTarget.window)}</p>
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
