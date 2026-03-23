const API_URL = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined'
	? (import.meta.env.VITE_API_BASE_URL || '')
	: '';

export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const url = `${API_URL}${endpoint}`;
	const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;

	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options.headers
		}
	});

	if (response.status === 401) {
		localStorage.removeItem('authToken');
		localStorage.removeItem('user');
		localStorage.removeItem('refreshToken');
		if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
			window.location.href = '/login';
		}
		throw new Error('Authentication failed');
	}

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`API Error: ${response.status} - ${errorText}`);
	}

	return response.json();
}
