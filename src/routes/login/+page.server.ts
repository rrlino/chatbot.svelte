import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (token) {
		redirect(302, '/dashboard');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;

		if (!username || !password) {
			return fail(400, { error: 'Username and password are required' });
		}

		try {
			const response = await fetch(`${API_BASE}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const message =
					(errorData as Record<string, string>).error ||
					(errorData as Record<string, string>).message ||
					'Invalid credentials';
				return fail(response.status, { error: message });
			}

			const data = (await response.json()) as { token: string; user: unknown };

			if (data.token) {
				cookies.set('authToken', data.token, {
					path: '/',
					httpOnly: false,
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 7 // 7 days
				});
			}

			return { success: true, token: data.token, user: data.user };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	}
};
