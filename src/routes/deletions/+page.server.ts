import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { authHeaders, extractApiError, withChannelId } from '$lib/server/api';

const RUST_API = 'http://localhost:8100/api/v1';

interface DeletionRequest {
	id: number;
	user_name: string;
	status: string;
	created_at: string;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const channelId = cookies.get('channelId');
	const headers = authHeaders(token);

	let deletionRequests: DeletionRequest[] = [];

	try {
		const res = await fetch(
			withChannelId(`${RUST_API}/data-deletions`, channelId),
			{ headers }
		);
		if (res.ok) {
			const json = await res.json();
			if (Array.isArray(json)) {
				deletionRequests = json;
			} else if (json.data && Array.isArray(json.data)) {
				deletionRequests = json.data;
			} else if (json.requests && Array.isArray(json.requests)) {
				deletionRequests = json.requests;
			}
		}
	} catch (err) {
		console.error('Failed to fetch data deletions:', err);
	}

	return { deletionRequests };
};

export const actions: Actions = {
	approve: async ({ request, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { error: 'Request ID is required' });

		try {
			const res = await fetch(`${RUST_API}/data-deletions/${id}/approve`, {
				method: 'POST',
				headers: authHeaders(token)
			});
			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to approve request') });
			}
			return { success: true, action: 'approve' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	},

	reject: async ({ request, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { error: 'Request ID is required' });

		try {
			const res = await fetch(`${RUST_API}/data-deletions/${id}/reject`, {
				method: 'POST',
				headers: authHeaders(token)
			});
			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to reject request') });
			}
			return { success: true, action: 'reject' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	}
};
