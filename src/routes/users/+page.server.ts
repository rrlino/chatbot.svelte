import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.68.107:8080/api/v1';

interface User {
	id: number;
	name: string | null;
	email: string | null;
	phone_number: string | null;
	status: string | null;
	chatbot_paused: boolean | null;
	created_at: string;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	};

	let users: User[] = [];
	let total = 0;

	try {
		const qs = new URLSearchParams({ limit: '100', offset: '0' });
		const res = await fetch(`${API_BASE}/users?${qs}`, { headers });
		if (res.ok) {
			const json = await res.json();
			users = json.data ?? (Array.isArray(json) ? json : []);
			total = json.total ?? users.length;
		}
	} catch (err) {
		console.error('Failed to fetch users:', err);
	}

	return { users, total };
};
