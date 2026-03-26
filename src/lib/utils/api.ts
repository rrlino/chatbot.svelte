const API_URL = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined'
	? (import.meta.env.VITE_API_BASE_URL || '')
	: '';

function parseErrorMessage(body: string): string {
	try {
		const parsed = JSON.parse(body);
		if (Array.isArray(parsed)) {
			const strings = parsed
				.filter((item) => typeof item === 'string')
				.map((s) => s.replace(/^Authentication error:\s*/, ''));
			if (strings.length > 0) return strings.join(', ');
			const errors = parsed
				.filter((item) => item && typeof item === 'object' && 'error' in item)
				.map((item) => (item as Record<string, unknown>).error);
			if (errors.length > 0) return errors.join(', ');
		}
		if (typeof parsed === 'object' && parsed !== null) {
			if (typeof parsed.message === 'string') return parsed.message;
			if (typeof parsed.error === 'string') return parsed.error;
			if (typeof parsed.detail === 'string') return parsed.detail;
		}
		return body;
	} catch {
		return body;
	}
}

export class ApiError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

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
		throw new ApiError(401, 'Authentication failed');
	}

	if (!response.ok) {
		const errorBody = await response.text();
		const message = parseErrorMessage(errorBody);
		throw new ApiError(response.status, message);
	}

	return response.json();
}
