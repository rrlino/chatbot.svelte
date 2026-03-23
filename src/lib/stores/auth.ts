import { writable } from 'svelte/store';
import { endpoints } from '$config/endpoints';
import { apiFetch } from '$utils/api';

interface AuthState {
	token: string | null;
	isAuthenticated: boolean;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		token: typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null,
		isAuthenticated: typeof localStorage !== 'undefined' ? !!localStorage.getItem('authToken') : false
	});

	return {
		subscribe,
		async login(username: string, password: string) {
			const email = username.includes('@') ? username : `${username}@localhost.com`;
			const response = await apiFetch<{ data?: { token?: string; access_token?: string; user?: unknown; refresh_token?: string }; token?: string; access_token?: string; user?: unknown; refresh_token?: string }>(endpoints.auth.login, {
				method: 'POST',
				body: JSON.stringify({ email, password })
			});

			const authData = response.data || response;
			const token = authData.token || authData.access_token;

			if (!token) {
				throw new Error('No token received from server');
			}

			localStorage.setItem('authToken', token);

			if (authData.user) {
				localStorage.setItem('user', JSON.stringify(authData.user));
			}

			if (authData.refresh_token) {
				localStorage.setItem('refreshToken', authData.refresh_token);
			}

			update((s) => ({ ...s, token, isAuthenticated: true }));
			return authData;
		},
		logout() {
			localStorage.removeItem('authToken');
			localStorage.removeItem('user');
			localStorage.removeItem('refreshToken');
			set({ token: null, isAuthenticated: false });
		}
	};
}

export const auth = createAuthStore();
