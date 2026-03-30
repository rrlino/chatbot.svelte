import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

import { env } from '$env/dynamic/private';
const API_BASE = env.API_BASE_URL || 'http://localhost:8080/api/v1';
const API_ORIGIN = API_BASE.replace(/\/api\/v\d+$/, '');

function resolveApiUrl(endpoint: string): string {
	return endpoint.startsWith('/api/') ? `${API_ORIGIN}${endpoint}` : `${API_BASE}${endpoint}`;
}

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
			const response = await fetch(resolveApiUrl('/auth/login'), {
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
					secure: false,
					maxAge: 60 * 60 * 24 * 7 // 7 days
				});
			}

			// Store user info in a separate cookie for client-side access
			if (data.user) {
				cookies.set('user', JSON.stringify(data.user), {
					path: '/',
					httpOnly: false,
					sameSite: 'lax',
					secure: false,
					maxAge: 60 * 60 * 24 * 7
				});
			}

			throw redirect(303, '/dashboard');
		} catch (e) {
			if (e instanceof redirect) throw e;
			return fail(500, { error: 'Unable to connect to server' });
		}
	}
};
