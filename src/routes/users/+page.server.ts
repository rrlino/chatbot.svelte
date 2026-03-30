import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_BASE, authHeaders } from '$lib/server/api';

interface User {
	id: number;
	name: string | null;
	email: string | null;
	phone_number: string | null;
	status: string | null;
	chatbot_paused: boolean | null;
	created_at: string;
}

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const headers = authHeaders(token);

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const perPage = Math.max(1, Number(url.searchParams.get('perPage')) || 25);
	const search = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || '';

	const params = new URLSearchParams({
		limit: String(perPage),
		offset: String((page - 1) * perPage)
	});
	if (search) params.set('search', search);
	if (statusFilter) params.set('status', statusFilter);

	let users: User[] = [];
	let total = 0;

	try {
		const res = await fetch(`${API_BASE}/users?${params}`, { headers });
		if (res.ok) {
			const json = await res.json();
			users = json.data ?? (Array.isArray(json) ? json : []);
			total = json.total ?? users.length;
		}
	} catch (err) {
		console.error('Failed to fetch users:', err);
	}

	return { users, total, page, perPage, search, statusFilter };
};
