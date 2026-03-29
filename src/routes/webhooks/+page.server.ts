import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { authHeaders } from '$lib/server/api';

const RUST_API = 'http://localhost:8100/api/v1';

interface Webhook {
	id: number;
	name: string;
	provider: string;
	status: string;
	is_active: boolean;
	webhook_url: string | null;
	webhook_secret: string | null;
	created_at: string;
	updated_at: string;
}

interface WebhookStatus {
	status: string;
	total_events: number;
	unprocessed_events: number;
	providers: string[];
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const headers = authHeaders(token);

	let webhooks: Webhook[] = [];
	let webhookStatus: WebhookStatus | null = null;

	// Fetch webhooks from the Rust API
	try {
		const res = await fetch(`${RUST_API}/chatbot/webhooks`, { headers });
		if (res.ok) {
			const json = await res.json();
			webhooks = json.data ?? (Array.isArray(json) ? json : []);
		}
	} catch (err) {
		console.error('Failed to fetch webhooks:', err);
	}

	// Fetch webhook status (event counts, providers, etc.)
	const apiOrigin = RUST_API.replace(/\/api\/v\d+$/, '');
	try {
		const res = await fetch(`${apiOrigin}/webhooks/status`, { headers });
		if (res.ok) {
			const json = await res.json();
			webhookStatus = json;
		}
	} catch (err) {
		console.error('Failed to fetch webhook status:', err);
	}

	return { webhooks, webhookStatus };
};
