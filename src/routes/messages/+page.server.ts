import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { authHeaders, extractApiError } from '$lib/server/api';

const RUST_API = 'http://localhost:8100/api/v1';

interface MessageStats {
	total: number;
	sent: number;
	delivered: number;
	read: number;
	failed: number;
	pending: number;
}

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const headers = authHeaders(token);

	// Pagination & filter params from URL
	const page = parseInt(url.searchParams.get('page') || '1');
	const perPage = parseInt(url.searchParams.get('per_page') || '25');
	const sortBy = url.searchParams.get('sort_by') || 'created_at';
	const sortDirection = url.searchParams.get('sort_direction') || 'desc';
	const status = url.searchParams.get('status') || '';
	const direction = url.searchParams.get('direction') || '';
	const search = url.searchParams.get('search') || '';

	// Build query for messages API
	const qs = new URLSearchParams();
	qs.set('limit', String(perPage));
	qs.set('offset', String((page - 1) * perPage));
	qs.set('sort_by', sortBy);
	qs.set('sort_direction', sortDirection);
	if (status) qs.set('status', status);
	if (direction) qs.set('direction', direction);
	if (search) qs.set('search', search);

	// Fetch messages
	let messages: Record<string, unknown>[] = [];
	let total = 0;
	let error = '';
	try {
		const res = await fetch(`${RUST_API}/chatbot/messages?${qs.toString()}`, { headers });
		if (res.ok) {
			const json = await res.json();
			const data = json.data ?? json;
			messages = Array.isArray(data) ? data : [];
			total = json.total ?? messages.length;
		} else {
			error = 'Failed to load messages';
		}
	} catch {
		error = 'Unable to connect to server';
	}

	// Fetch stats
	let stats: MessageStats | null = null;
	try {
		const res = await fetch(`${RUST_API}/chatbot/messages/stats`, { headers });
		if (res.ok) {
			const json = await res.json();
			stats = json.data ?? json;
		}
	} catch {
		console.error('Failed to fetch message stats');
	}

	return {
		messages,
		total,
		stats,
		error,
		filters: { page, perPage, sortBy, sortDirection, status, direction, search }
	};
};

export const actions: Actions = {
	retry: async ({ request, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { error: 'Message ID is required' });

		try {
			const res = await fetch(`${RUST_API}/chatbot/messages/${id}/retry`, {
				method: 'POST',
				headers: authHeaders(token)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to retry message') });
			}

			return { success: true, action: 'retry' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	}
};
