import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_BASE, authHeaders } from '$lib/server/api';

interface WebhookStatus {
	status: string;
	total_events: number;
	unprocessed_events: number;
	providers: string[];
}

interface Channel {
	id: number;
	name: string;
	provider: string;
	status: string;
	is_active: boolean;
	config: Record<string, unknown>;
	webhook_url: string | null;
	webhook_secret: string | null;
	created_at: string;
	updated_at: string;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const headers = authHeaders(token);

	let webhookStatus: WebhookStatus | null = null;
	let channels: Channel[] = [];

	// Fetch webhook status from /webhooks/status (root-level, not /api/v1)
	const apiOrigin = API_BASE.replace(/\/api\/v\d+$/, '');
	try {
		const res = await fetch(`${apiOrigin}/webhooks/status`, { headers });
		if (res.ok) {
			const json = await res.json();
			webhookStatus = json;
		}
	} catch (err) {
		console.error('Failed to fetch webhook status:', err);
	}

	// Fetch channels (which contain webhook_url / webhook_secret)
	try {
		const res = await fetch(`${API_BASE}/channels`, { headers });
		if (res.ok) {
			const json = await res.json();
			channels = json.data ?? (Array.isArray(json) ? json : []);
		}
	} catch (err) {
		console.error('Failed to fetch channels:', err);
	}

	return { webhookStatus, channels };
};
