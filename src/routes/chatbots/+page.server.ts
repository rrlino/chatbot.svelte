import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_BASE, authHeaders } from '$lib/server/api';

interface Chatbot {
	id: number;
	name: string;
	description: string | null;
	system_prompt: string;
	model_config: Record<string, unknown>;
	is_default: boolean;
	is_active: boolean;
	business_module: string | null;
	category: string | null;
	session_timeout_minutes: number | null;
	created_at: string;
	updated_at: string;
}

interface ChatbotStats {
	total: number;
	active: number;
	inactive: number;
	by_category: { category: string; count: number }[];
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const headers = authHeaders(token);

	let chatbots: Chatbot[] = [];
	let stats: ChatbotStats | null = null;

	try {
		const res = await fetch(`${API_BASE}/chatbots`, { headers });
		if (res.ok) {
			const json = await res.json();
			chatbots = json.data ?? (Array.isArray(json) ? json : []);
		}
	} catch (err) {
		console.error('Failed to fetch chatbots:', err);
	}

	// Stats endpoint is at /api/chatbots/stats (not v1)
	const apiOrigin = API_BASE.replace(/\/api\/v\d+$/, '');
	try {
		const res = await fetch(`${apiOrigin}/api/chatbots/stats`, { headers });
		if (res.ok) {
			const json = await res.json();
			stats = json.data ?? json ?? null;
		}
	} catch {
		// stats are optional
	}

	return { chatbots, stats };
};
