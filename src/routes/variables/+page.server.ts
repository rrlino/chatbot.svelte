import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { API_BASE, authHeaders, extractApiError } from '$lib/server/api';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const headers = authHeaders(token);

	const res = await fetch(`${API_BASE}/var-definitions`, { headers });
	if (!res.ok) throw redirect(302, '/login');

	const raw = await res.json();
	const definitions = (Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? [])) as VariableDefinition[];

	// Extract unique categories for filter options
	const categories = [...new Set(definitions.map((d) => d.category).filter(Boolean) as string[])].sort();

	return { definitions, categories };
};

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const payload = {
			tag: (formData.get('tag') as string)?.trim(),
			name: (formData.get('name') as string)?.trim(),
			description: (formData.get('description') as string)?.trim() || null,
			data_type: formData.get('data_type') as string || 'text',
			category: (formData.get('category') as string)?.trim() || null,
			value: formData.get('default_value') ? JSON.stringify(formData.get('default_value')) : null,
			is_active: formData.get('is_active') === 'on'
		};

		if (!payload.tag || !payload.name) {
			return fail(400, { error: 'Tag and name are required' });
		}

		try {
			const res = await fetch(`${API_BASE}/var-definitions`, {
				method: 'POST',
				headers: authHeaders(token),
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to create variable') });
			}

			return { success: true, action: 'create' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	},

	update: async ({ request, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const tag = formData.get('tag') as string;
		const payload = {
			name: (formData.get('name') as string)?.trim(),
			description: (formData.get('description') as string)?.trim() || null,
			data_type: formData.get('data_type') as string || 'text',
			category: (formData.get('category') as string)?.trim() || null,
			value: formData.get('default_value') ? JSON.stringify(formData.get('default_value')) : null,
			is_active: formData.get('is_active') === 'on'
		};

		if (!tag) return fail(400, { error: 'Variable tag is required' });
		if (!payload.name) return fail(400, { error: 'Name is required' });

		try {
			const res = await fetch(`${API_BASE}/var-definitions/${encodeURIComponent(tag)}`, {
				method: 'PUT',
				headers: authHeaders(token),
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to update variable') });
			}

			return { success: true, action: 'update' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	},

	delete: async ({ request, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const tag = formData.get('tag') as string;
		if (!tag) return fail(400, { error: 'Variable tag is required' });

		try {
			const res = await fetch(`${API_BASE}/var-definitions/${encodeURIComponent(tag)}`, {
				method: 'DELETE',
				headers: authHeaders(token)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to delete variable') });
			}

			return { success: true, action: 'delete' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	}
};

interface VariableDefinition {
	id: number;
	tag: string;
	name: string;
	description?: string;
	data_type?: string;
	default_value?: string;
	is_required?: boolean;
	validation_regex?: string;
	choices?: unknown;
	media_url?: string;
	category?: string;
	is_system_variable?: boolean;
	value?: unknown;
	is_active?: boolean;
	created_at: string;
	updated_at: string;
}
