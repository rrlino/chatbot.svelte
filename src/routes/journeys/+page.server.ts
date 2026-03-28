import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

function authHeaders(token: string): Record<string, string> {
	return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const payload = {
			code: (formData.get('code') as string)?.trim(),
			name: (formData.get('name') as string)?.trim(),
			description: (formData.get('description') as string)?.trim() || '',
			is_active: formData.get('is_active') === 'on',
			is_mandatory: formData.get('is_mandatory') === 'on'
		};

		if (!payload.code || !payload.name) {
			return fail(400, { error: 'Code and name are required', form: payload });
		}

		try {
			const res = await fetch(`${API_BASE}/journeys`, {
				method: 'POST',
				headers: authHeaders(token),
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				return fail(res.status, {
					error: (err as Record<string, string>).error || (err as Record<string, string>).message || 'Failed to create journey'
				});
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
			code: (formData.get('code') as string)?.trim(),
			name: (formData.get('name') as string)?.trim(),
			description: (formData.get('description') as string)?.trim() || '',
			is_active: formData.get('is_active') === 'on',
			is_mandatory: formData.get('is_mandatory') === 'on'
		};

		if (!id) return fail(400, { error: 'Journey ID is required' });
		if (!payload.name) return fail(400, { error: 'Name is required' });

		try {
			const res = await fetch(`${API_BASE}/journeys/${id}`, {
				method: 'PUT',
				headers: authHeaders(token),
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				return fail(res.status, {
					error: (err as Record<string, string>).error || (err as Record<string, string>).message || 'Failed to update journey'
				});
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
		if (!id) return fail(400, { error: 'Journey ID is required' });

		try {
			const res = await fetch(`${API_BASE}/journeys/${id}`, {
				method: 'DELETE',
				headers: authHeaders(token)
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				return fail(res.status, {
					error: (err as Record<string, string>).error || (err as Record<string, string>).message || 'Failed to delete journey'
				});
			}

			return { success: true, action: 'delete' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	},

	toggle: async ({ request, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const isActive = formData.get('is_active') === 'true';
		if (!id) return fail(400, { error: 'Journey ID is required' });

		try {
			const res = await fetch(`${API_BASE}/journeys/${id}`, {
				method: 'PUT',
				headers: authHeaders(token),
				body: JSON.stringify({ is_active: !isActive })
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				return fail(res.status, {
					error: (err as Record<string, string>).error || (err as Record<string, string>).message || 'Failed to toggle journey status'
				});
			}

			return { success: true, action: 'toggle' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	}
};
