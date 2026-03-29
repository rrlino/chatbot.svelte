<script lang="ts">
	import { get } from 'svelte/store';
	import { PlusIcon, Trash2Icon, ShieldIcon } from 'lucide-svelte';
	import { AppTable, AppPagination, AppFilters, AppModal } from '$components/core';
	import { useTable } from '$lib/composables/useTable';
	import type { FetchParams } from '$lib/composables/useTable';
	import { endpoints } from '$config/endpoints';
	import { apiFetch } from '$utils/api';
	import { toast } from '$lib/stores/toast';
	import type { Column } from '$components/core/AppTable.svelte';

	interface AdminUser {
		id: number;
		username: string;
		email: string;
		role: string;
		is_active: boolean;
		last_login_at?: string;
		failed_login_attempts: number;
		phone_number?: string;
		created_at: string;
		updated_at: string;
		[key: string]: unknown;
	}

	interface AdminUserForm {
		username: string;
		email: string;
		password: string;
		role: string;
		is_active: boolean;
		phone_number: string;
	}

	const emptyForm: AdminUserForm = {
		username: '',
		email: '',
		password: '',
		role: 'admin',
		is_active: true,
		phone_number: ''
	};

	const table = useTable({ initialSortKey: 'username', initialSortDirection: 'asc' });

	let users = $state<AdminUser[]>([]);
	let error = $state('');
	let modalOpen = $state(false);
	let editingUser = $state<AdminUser | null>(null);
	let form = $state<AdminUserForm>({ ...emptyForm });
	let formError = $state('');
	let saving = $state(false);
	let deleteConfirmId = $state<number | null>(null);

	// Client-side filters
	let filterRole = $state('');
	let filterStatus = $state('');

	const columns: Column[] = [
		{ key: 'username', label: 'Username', sortable: true },
		{ key: 'email', label: 'Email', sortable: true },
		{ key: 'role', label: 'Role', sortable: true },
		{ key: 'is_active', label: 'Status', sortable: true },
		{ key: 'last_login_at', label: 'Last Login', sortable: true },
		{ key: 'created_at', label: 'Created', sortable: true }
	];

	const roleColors: Record<string, string> = {
		super_admin: 'bg-red-100 text-red-700',
		admin: 'bg-purple-100 text-purple-700',
		trainer: 'bg-blue-100 text-blue-700',
		supervisor: 'bg-green-100 text-green-700',
		support: 'bg-gray-100 text-gray-600'
	};

	async function fetchUsers(params: FetchParams) {
		error = '';
		table.setLoading(true);
		try {
			const qs = new URLSearchParams();
			qs.set('limit', String(params.per_page));
			qs.set('offset', String((params.page - 1) * params.per_page));
			if (params.sort_by) qs.set('sort_by', params.sort_by);
			if (params.sort_direction) qs.set('sort_direction', params.sort_direction);
			if (params.search) qs.set('search', params.search);

			const response = await apiFetch<{ data: AdminUser[]; total?: number }>(
				`${endpoints.auth.users}?${qs.toString()}`
			);

			const data = response.data ?? response;
			let list = Array.isArray(data) ? data : [];
			// Client-side role/status filtering
			if (filterRole) list = list.filter((u) => u.role === filterRole);
			if (filterStatus === 'active') list = list.filter((u) => u.is_active);
			if (filterStatus === 'inactive') list = list.filter((u) => !u.is_active);

			users = list;
			table.setTotalItems(response.total ?? list.length);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load admin users';
		} finally {
			table.setLoading(false);
		}
	}

	$effect(() => {
		fetchUsers(get(table.fetchParams));
	});

	function handleSort(key: string) {
		table.toggleSort(key);
	}

	function openCreate() {
		editingUser = null;
		form = { ...emptyForm };
		formError = '';
		modalOpen = true;
	}

	function openEdit(user: AdminUser) {
		editingUser = user;
		form = {
			username: user.username,
			email: user.email,
			password: '',
			role: user.role,
			is_active: user.is_active,
			phone_number: user.phone_number || ''
		};
		formError = '';
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
		editingUser = null;
	}

	async function saveUser() {
		if (!form.username || !form.email) {
			formError = 'Username and email are required';
			return;
		}
		if (!editingUser && !form.password) {
			formError = 'Password is required for new users';
			return;
		}

		saving = true;
		formError = '';
		try {
			const body: Record<string, unknown> = {
				username: form.username,
				email: form.email,
				role: form.role,
				is_active: form.is_active,
				phone_number: form.phone_number || null
			};
			if (form.password) body.password = form.password;

			if (editingUser) {
				await apiFetch(endpoints.auth.user(String(editingUser.id)), {
					method: 'PUT',
					body: JSON.stringify(body)
				});
				toast.success('Admin user updated');
			} else {
				await apiFetch(endpoints.auth.users, {
					method: 'POST',
					body: JSON.stringify(body)
				});
				toast.success('Admin user created');
			}
			closeModal();
			fetchUsers(get(table.fetchParams));
		} catch (err: unknown) {
			formError = err instanceof Error ? err.message : 'Failed to save admin user';
		} finally {
			saving = false;
		}
	}

	async function deleteUser(id: number | null) {
		if (id === null) return;
		try {
			await apiFetch(endpoints.auth.user(String(id)), { method: 'DELETE' });
			toast.success('Admin user deleted');
			deleteConfirmId = null;
			fetchUsers(get(table.fetchParams));
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete admin user');
		}
	}

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Admin Users - TrueLocal AI</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Admin Users</h1>
			<p class="text-sm text-gray-500 mt-1">Manage admin accounts and roles</p>
		</div>
		<button
			onclick={openCreate}
			class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
		>
			<PlusIcon class="h-4 w-4" />
			Create Admin User
		</button>
	</div>

	<!-- Error -->
	{#if error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
	{/if}

	<!-- Filters -->
	<AppFilters
		bind:search={$table.search}
		bind:perPage={$table.perPage}
		searchPlaceholder="Search admin users..."
		onSearchChange={(q) => table.setSearch(q)}
		onPerPageChange={(pp) => table.setPerPage(pp)}
		loading={$table.loading}
	>
		<select
			bind:value={filterRole}
			onchange={() => table.setPage(1)}
			disabled={$table.loading}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			<option value="">All Roles</option>
			{#each ['super_admin', 'admin', 'trainer', 'supervisor', 'support'] as r}
				<option value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
			{/each}
		</select>
		<select
			bind:value={filterStatus}
			onchange={() => table.setPage(1)}
			disabled={$table.loading}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
		>
			<option value="">All Statuses</option>
			<option value="active">Active</option>
			<option value="inactive">Inactive</option>
		</select>
	</AppFilters>

	<!-- Table -->
	<AppTable
		columns={columns}
		rows={users}
		loading={$table.loading}
		sortKey={$table.sortKey}
		sortDirection={$table.sortDirection}
		onSort={handleSort}
		onRowClick={(row) => openEdit(row as AdminUser)}
	>
		{#snippet cellRenderer(row, col)}
			{#if col.key === 'username'}
				<span class="font-medium text-gray-900">{row.username as string}</span>
			{:else if col.key === 'email'}
				<span class="text-gray-500">{row.email as string}</span>
			{:else if col.key === 'role'}
				<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium {roleColors[row.role as string] || 'bg-gray-100 text-gray-600'}">
					<ShieldIcon class="h-3 w-3" />
					{(row.role as string).replace(/_/g, ' ')}
				</span>
			{:else if col.key === 'is_active'}
				<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {row.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
					{row.is_active ? 'Active' : 'Inactive'}
				</span>
			{:else if col.key === 'last_login_at'}
				<span class="text-gray-500 text-sm">{formatDate(row.last_login_at as string)}</span>
			{:else if col.key === 'created_at'}
				<span class="text-gray-500 text-sm">{formatDate(row.created_at as string)}</span>
			{:else}
				{row[col.key] as unknown as string ?? ''}
			{/if}
		{/snippet}

		<AppPagination
			current={$table.page}
			total={$table.totalPages}
			totalItems={$table.totalItems}
			perPage={$table.perPage}
			onPageChange={(p) => table.setPage(p)}
		/>
	</AppTable>

	<!-- Create/Edit Modal -->
	<AppModal open={modalOpen} title={editingUser ? 'Edit Admin User' : 'Create Admin User'} onClose={closeModal}>
		<div class="space-y-4">
			{#if formError}
				<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
			{/if}

			<div>
				<label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
				<input id="username" type="text" bind:value={form.username} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="admin_username" />
			</div>

			<div>
				<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
				<input id="email" type="email" bind:value={form.email} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="admin@example.com" />
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
					Password {#if editingUser}<span class="text-gray-400 font-normal">(leave blank to keep current)</span>{/if}
				</label>
				<input id="password" type="password" bind:value={form.password} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="role" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
					<select id="role" bind:value={form.role} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="super_admin">Super Admin</option>
						<option value="admin">Admin</option>
						<option value="trainer">Trainer</option>
						<option value="supervisor">Supervisor</option>
						<option value="support">Support</option>
					</select>
				</div>
				<div>
					<label for="phone" class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
					<input id="phone" type="text" bind:value={form.phone_number} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>
			</div>

			<div class="flex items-center gap-2">
				<input id="is_active" type="checkbox" bind:checked={form.is_active} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
				<label for="is_active" class="text-sm text-gray-700">Active</label>
			</div>

			<div class="flex justify-end gap-3 pt-2">
				<button onclick={closeModal} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
				<button onclick={saveUser} disabled={saving} class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
					{saving ? 'Saving...' : editingUser ? 'Update' : 'Create'}
				</button>
			</div>
		</div>
	</AppModal>

	<!-- Delete Confirmation -->
	{#if deleteConfirmId !== null}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => deleteConfirmId = null}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6" onclick={(e) => e.stopPropagation()}>
				<div class="flex items-center gap-3 mb-4">
					<div class="p-2 bg-red-100 rounded-full">
						<Trash2Icon class="h-5 w-5 text-red-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900">Delete Admin User</h3>
				</div>
				<p class="text-sm text-gray-600 mb-6">Are you sure you want to delete this admin user? This action cannot be undone.</p>
				<div class="flex justify-end gap-3">
					<button onclick={() => deleteConfirmId = null} class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
					<button onclick={() => deleteUser(deleteConfirmId)} class="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
				</div>
			</div>
		</div>
	{/if}
</div>
