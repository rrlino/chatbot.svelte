import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { authHeaders } from '$lib/server/api';

const RUST_API = 'http://localhost:8100/api/v1';
const RUST_ORIGIN = 'http://localhost:8100';

interface Partner {
	id: number;
	company_name: string;
	domain: string | null;
	contact_name: string;
	contact_email: string;
	plan: string;
	status: string;
	usage_limit: number;
	current_usage: number;
	usage_percentage: number;
	integration_status: string;
	last_activity_at: string | null;
	created_at: string;
}

interface RateLimitRule {
	id: number;
	name: string;
	type: string;
	target: string;
	request_limit: number;
	time_window: string;
	current_usage: number;
	usage_percentage: number;
	status: string;
	description: string | null;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const headers = authHeaders(token);

	// Fetch OpenAPI spec to count endpoints
	let endpointCount = 0;
	try {
		const res = await fetch(`${RUST_ORIGIN}/openapi.json`, { headers });
		if (res.ok) {
			const apiSpec = await res.json();
			if (apiSpec.paths) {
				for (const path of Object.values(apiSpec.paths) as Record<string, unknown>[]) {
					endpointCount += Object.keys(path).filter((m) =>
						['get', 'post', 'put', 'delete', 'patch'].includes(m)
					).length;
				}
			}
		}
	} catch (err) {
		console.error('Failed to fetch OpenAPI spec:', err);
	}

	// Fetch partners (endpoint may not exist yet — graceful fallback)
	let partners: Partner[] = [];
	try {
		const res = await fetch(`${RUST_API}/partners`, { headers });
		if (res.ok) {
			const json = await res.json();
			partners = json.data ?? (Array.isArray(json) ? json : []);
		}
	} catch {
		// Partners endpoint not yet implemented
	}

	// Fetch rate-limiting rules (endpoint may not exist yet — graceful fallback)
	let rateLimitRules: RateLimitRule[] = [];
	try {
		const res = await fetch(`${RUST_API}/rate-limiting/rules`, { headers });
		if (res.ok) {
			const json = await res.json();
			rateLimitRules = json.data ?? (Array.isArray(json) ? json : []);
		}
	} catch {
		// Rate limiting endpoint not yet implemented
	}

	// Fetch webhook status for overview stats
	let webhookStatus: { status: string; total_events: number; unprocessed_events: number; providers: string[] } | null = null;
	try {
		const res = await fetch(`${RUST_ORIGIN}/webhooks/status`, { headers });
		if (res.ok) {
			webhookStatus = await res.json();
		}
	} catch {
		// ignore
	}

	// Compute overview stats
	const activePartners = partners.filter((p) => p.status === 'active').length;
	const totalMonthlyRequests = partners.reduce((sum, p) => sum + (p.current_usage || 0), 0);

	return {
		apiBaseUrl: `${RUST_API}`,
		swaggerBaseUrl: RUST_ORIGIN,
		endpointCount,
		partners,
		rateLimitRules,
		activePartners,
		totalMonthlyRequests,
		webhookStatus
	};
};
