import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { authHeaders, withChannelId } from '$lib/server/api';

const RUST_API = 'http://localhost:8100/api/v1';

interface DeletionRequest {
	id: number;
	confirmation_code: string;
	app_scoped_user_id: string | null;
	status: string;
	created_at: string;
	processed_at: string | null;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const channelId = cookies.get('channelId');
	const headers = authHeaders(token);

	let deletionRequests: DeletionRequest[] = [];

	try {
		const res = await fetch(
			withChannelId(`${RUST_API}/data-deletion-callback/admin/requests`, channelId),
			{ headers }
		);
		if (res.ok) {
			const json = await res.json();
			if (json.requests && Array.isArray(json.requests)) {
				deletionRequests = json.requests;
			} else if (Array.isArray(json)) {
				deletionRequests = json;
			} else if (json.data && Array.isArray(json.data)) {
				deletionRequests = json.data;
			}
		}
	} catch (err) {
		console.error('Failed to fetch data deletion requests:', err);
	}

	return { deletionRequests };
};
