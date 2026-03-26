<script lang="ts">
	import { get } from 'svelte/store';
	import { PlusIcon, HandshakeIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters, AppModal } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { endpoints } from '$config/endpoints';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import type { Column } from '$components/core/AppTable.svelte';

	interface Partner {
		id: number;
		name: string;
		provider: string;
		status: string;
		config?: Record<string, unknown>;
		webhook_url?: string;
		created_at: string;
		updated_at: string;
		[key: string]: unknown;
	}

	interface PartnerForm {
		name: string;
		provider: string;
		status: string;
		webhook_url: string;
		config: string;
	}

	const emptyForm: PartnerForm = { name: '', provider: 'meta', status: 'active', webhook_url: '', config: '{}' };

	const table = useTable({ initialSortKey: 'name', initialSortDirection: 'asc' });

	let partners = $state<Partner[]>([]);
	let error = $state('');
	let modalOpen = $state(false);
	let editingPartner = $state<Partner | null>(null);
	let form = $state<PartnerForm>({ ...emptyForm });
	let formError = $state('');
	let saving = $state(false);

	let filterProvider = $state('');
	let filterStatus = $state('');

	const columns: Column[] = [
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'provider', label: 'Provider', sortable: true },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'webhook_url', label: 'Webhook URL' },
		{ key: 'created_at', label: 'Created', sortable: true }
	];

	const providerColors: Record<string, string> = {
		meta: 'bg-green-100 text-green-700',
		telegram: 'bg-blue-100 text-blue-700',
		twilio: 'bg-red-100 text-red-700',
		sendgrid: 'bg-purple-100 text-purple-700',
		custom: 'bg-gray-100 text-gray-600'
	};

	async function fetchPartners(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set('limit', String(params.per_page));
			qs.set('offset', String((params.page - 1) * params.per_page));
			if (params.search) qs.set('search', params.search);

			const response = await apiFetch<{ data: Partner[]; total?: number }>(
				`${endpoints.channels.list}?${qs.toString()}`
			);

			let data = response.data ?? response;
			let list = Array.isArray(data) ? data : [];
			if (filterProvider) list = list.filter((p) => p.provider === filterProvider);
			if (filterStatus) list = list.filter((p) => p.status === filterStatus);

			partners = list;
			table.setTotalItems(response.total ?? list.length);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load partners';
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => { fetchPartners(get(table.fetchParams)); });
	function handleSort(key: string) { table.toggleSort(key); }

	function openCreate() { editingPartner = null; form = { ...emptyForm }; formError = ''; modalOpen = true; }
	function openEdit(partner: Partner) {
		editingPartner = partner;
		form = {
			name: partner.name, provider: partner.provider || 'custom',
			status: partner.status || 'active', webhook_url: partner.webhook_url || '',
			config: partner.config ? JSON.stringify(partner.config, null, 2) : '{}'
		};
		formError = ''; modalOpen = true;
	}
	function closeModal() { modalOpen = false; editingPartner = null; }

	async function savePartner() {
		if (!form.name) { formError = 'Name is required'; return; }
		saving = true; formError = '';
		try {
			let config: unknown = {};
			try { config = JSON.parse(form.config); } catch { formError = 'Invalid JSON config'; saving = false; return; }

			const body = { name: form.name, provider: form.provider, status: form.status, webhook_url: form.webhook_url || null, config };

			if (editingPartner) {
				await apiFetch(endpoints.channels.config(String(editingPartner.id)), { method: 'PUT', body: JSON.stringify(body) });
				toast.success('Partner updated');
			} else {
				await apiFetch(endpoints.channels.create, { method: 'POST', body: JSON.stringify(body) });
				toast.success('Partner created');
			}
			closeModal(); fetchPartners(get(table.fetchParams));
		} catch (err: unknown) { formError = err instanceof Error ? err.message : 'Failed to save partner'; } finally { saving = false; }
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Partner Management - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Partner Management</h1>
			<p class="text-sm text-gray-500 mt-1">Manage channel partners and integrations</p>
		</div>
		<button onclick={openCreate} class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
			<PlusIcon class="h-4 w-4" />Add Partner
		</button>
	</div>

	{#if error}<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>{/if}

	<AppFilters bind:search={$table.search} bind:perPage={$table.perPage} searchPlaceholder="Search partners..." onSearchChange={(q) => table.setSearch(q)} onPerPageChange={(pp) => table.setPerPage(pp)} loading={$table.loading}>
		<select bind:value={filterProvider} onchange={() => table.setPage(1)} disabled={$table.loading} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
			<option value="">All Providers</option>
			{#each ['meta', 'telegram', 'twilio', 'sendgrid', 'custom'] as p}
				<option value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
			{/each}
		</select>
		<select bind:value={filterStatus} onchange={() => table.setPage(1)} disabled={$table.loading} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
			<option value="">All Statuses</option>
			<option value="active">Active</option>
			<option value="inactive">Inactive</option>
		</select>
	</AppFilters>

	<AppTable columns={columns} rows={partners} loading={$table.loading} sortKey={$table.sortKey} sortDirection={$table.sortDirection} onSort={handleSort} onRowClick={(row) => openEdit(row as Partner)}>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'name'}
				<div class="flex items-center gap-2">
					<HandshakeIcon class="h-4 w-4 text-gray-400" />
					<span class="font-medium text-gray-900">{row.name as string}</span>
				</div>
			{:else if col.key === 'provider'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {providerColors[row.provider as string] || 'bg-gray-100 text-gray-600'}">{(row.provider as string) || 'custom'}</span>
			{:else if col.key === 'status'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">{(row.status as string) || 'active'}</span>
			{:else if col.key === 'webhook_url'}
				<span class="text-gray-500 text-sm truncate max-w-xs block">{(row.webhook_url as string) || '—'}</span>
			{:else if col.key === 'created_at'}
				<span class="text-gray-500 text-sm">{formatDate(row.created_at as string)}</span>
			{:else}
				{row[col.key] as unknown as string ?? ''}
			{/if}
		{/snippet}
		{#snippet children()}
			<AppPagination current={$table.page} total={$table.totalPages} totalItems={$table.totalItems} perPage={$table.perPage} onPageChange={(p) => table.setPage(p)} />
		{/snippet}
	</AppTable>

	<AppModal open={modalOpen} title={editingPartner ? 'Edit Partner' : 'Add Partner'} onClose={closeModal}>
		<div class="space-y-4">
			{#if formError}<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>{/if}
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
				<input type="text" bind:value={form.name} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Provider</label>
					<select bind:value={form.provider} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="meta">Meta (WhatsApp)</option>
						<option value="telegram">Telegram</option>
						<option value="twilio">Twilio</option>
						<option value="sendgrid">SendGrid</option>
						<option value="custom">Custom</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
					<select bind:value={form.status} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
				<input type="text" bind:value={form.webhook_url} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/webhook" />
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">Config (JSON)</label>
				<textarea bind:value={form.config} rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
			</div>
			<div class="flex justify-end gap-3 pt-2">
				<button onclick={closeModal} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
				<button onclick={savePartner} disabled={saving} class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingPartner ? 'Update' : 'Create'}</button>
			</div>
		</div>
	</AppModal>
</div>
