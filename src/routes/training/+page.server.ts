import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { API_BASE, authHeaders, extractApiError, withChannelId } from '$lib/server/api';

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

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const channelId = cookies.get('channelId');
	const headers = authHeaders(token);

	const res = await fetch(withChannelId(`${API_BASE}/training-assignments`, channelId), { headers });
	if (!res.ok) throw redirect(302, '/login');

	const raw = await res.json();
	const assignments = (Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? [])) as TrainingAssignment[];

	return { assignments };
};

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const payload = {
			client_id: parseInt(formData.get('client_id') as string, 10),
			training_set_id: parseInt(formData.get('training_set_id') as string, 10),
			status: (formData.get('status') as string)?.trim() || 'active',
			start_date: (formData.get('start_date') as string)?.trim() || null,
			end_date: (formData.get('end_date') as string)?.trim() || null,
			notes: (formData.get('notes') as string)?.trim() || null
		};

		if (!payload.client_id || !payload.training_set_id) {
			return fail(400, { error: 'Client and training set are required' });
		}

		try {
			const res = await fetch(`${API_BASE}/training-assignments`, {
				method: 'POST',
				headers: authHeaders(token),
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to create assignment') });
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
			client_id: parseInt(formData.get('client_id') as string, 10),
			training_set_id: parseInt(formData.get('training_set_id') as string, 10),
			status: (formData.get('status') as string)?.trim() || 'active',
			start_date: (formData.get('start_date') as string)?.trim() || null,
			end_date: (formData.get('end_date') as string)?.trim() || null,
			notes: (formData.get('notes') as string)?.trim() || null
		};

		if (!id) return fail(400, { error: 'Assignment ID is required' });
		if (!payload.client_id || !payload.training_set_id) return fail(400, { error: 'Client and training set are required' });

		try {
			const res = await fetch(`${API_BASE}/training-assignments/${encodeURIComponent(id)}`, {
				method: 'PUT',
				headers: authHeaders(token),
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to update assignment') });
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
		if (!id) return fail(400, { error: 'Assignment ID is required' });

		try {
			const res = await fetch(`${API_BASE}/training-assignments/${encodeURIComponent(id)}`, {
				method: 'DELETE',
				headers: authHeaders(token)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to delete assignment') });
			}

			return { success: true, action: 'delete' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	}
};
