import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { authHeaders, withChannelId } from '$lib/server/api';

const RUST_API = 'http://localhost:8100/api/v1';

interface Partner {
	id: number;
	name: string;
	email: string;
	status: string;
	company_name?: string;
	contact_name?: string;
	contact_email?: string;
	domain?: string | null;
	plan?: string;
	created_at: string;
	updated_at?: string;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const channelId = cookies.get('channelId');
	const headers = authHeaders(token);

	let partners: Partner[] = [];
	try {
		const res = await fetch(withChannelId(`${RUST_API}/partners`, channelId), { headers });
		if (res.ok) {
			const json = await res.json();
			partners = json.data ?? (Array.isArray(json) ? json : []);
		}
	} catch (err) {
		console.error('Failed to fetch partners:', err);
	}

	const activePartners = partners.filter((p) => p.status === 'active').length;
	const inactivePartners = partners.filter((p) => p.status !== 'active').length;

	return { partners, activePartners, inactivePartners };
};
