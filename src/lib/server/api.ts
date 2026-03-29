export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export function authHeaders(token: string): Record<string, string> {
	return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function extractApiError(res: Response, fallback: string): Promise<string> {
	const body = await res.json().catch(() => ({}));
	return (body as Record<string, string>).error || (body as Record<string, string>).message || fallback;
}
