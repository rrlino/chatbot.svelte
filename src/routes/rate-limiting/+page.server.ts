import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { API_BASE, authHeaders, extractApiError, withChannelId } from '$lib/server/api';

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

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const channelId = cookies.get('channelId');
	const headers = authHeaders(token);

	const res = await fetch(withChannelId(`${API_BASE}/rate-limiting`, channelId), { headers });
	if (!res.ok) throw redirect(302, '/login');

	const raw = await res.json();
	const rules = (Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? [])) as RateLimitRule[];

	return { rules };
};

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const payload = {
			name: (formData.get('name') as string)?.trim(),
			path: (formData.get('path') as string)?.trim(),
			method: (formData.get('method') as string)?.trim() || '*',
			limit: parseInt(formData.get('limit') as string, 10) || 100,
			window: parseInt(formData.get('window') as string, 10) || 60,
			description: (formData.get('description') as string)?.trim() || null,
			is_active: formData.get('is_active') === 'on'
		};

		if (!payload.name || !payload.path) {
			return fail(400, { error: 'Name and path are required' });
		}

		try {
			const res = await fetch(`${API_BASE}/rate-limiting`, {
				method: 'POST',
				headers: authHeaders(token),
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to create rule') });
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
		const id = formData.get('id') as string;
		const payload = {
			name: (formData.get('name') as string)?.trim(),
			path: (formData.get('path') as string)?.trim(),
			method: (formData.get('method') as string)?.trim() || '*',
			limit: parseInt(formData.get('limit') as string, 10) || 100,
			window: parseInt(formData.get('window') as string, 10) || 60,
			description: (formData.get('description') as string)?.trim() || null,
			is_active: formData.get('is_active') === 'on'
		};

		if (!id) return fail(400, { error: 'Rule ID is required' });
		if (!payload.name || !payload.path) return fail(400, { error: 'Name and path are required' });

		try {
			const res = await fetch(`${API_BASE}/rate-limiting/${encodeURIComponent(id)}`, {
				method: 'PUT',
				headers: authHeaders(token),
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to update rule') });
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
		const id = formData.get('id') as string;
		if (!id) return fail(400, { error: 'Rule ID is required' });

		try {
			const res = await fetch(`${API_BASE}/rate-limiting/${encodeURIComponent(id)}`, {
				method: 'DELETE',
				headers: authHeaders(token)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to delete rule') });
			}

			return { success: true, action: 'delete' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	}
};
