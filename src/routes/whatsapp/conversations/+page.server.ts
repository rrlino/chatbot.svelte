import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_BASE, authHeaders } from '$lib/server/api';

interface Conversation {
	id: number;
	user_id: number;
	chatbot_id: number;
	channel_id: number;
	status: string;
	started_at: string | null;
	last_message_at: string | null;
	closed_at: string | null;
	created_at: string;
}

interface ConversationMessage {
	id: number;
	conversation_id: number;
	direction: string;
	content: string;
	status: string;
	message_type: string | null;
	external_message_id: string | null;
	metadata: Record<string, unknown> | null;
	sent_at: string | null;
	delivered_at: string | null;
	created_at: string;
}

interface ConversationStats {
	total: number;
	active: number;
	closed: number;
	expired: number;
	[key: string]: unknown;
}

interface MessageStats {
	total: number;
	inbound: number;
	outbound: number;
	sent: number;
	failed: number;
	pending: number;
	[key: string]: unknown;
}

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const headers = authHeaders(token);

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const perPage = Math.max(1, Number(url.searchParams.get('perPage')) || 25);
	const search = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const selectedId = url.searchParams.get('id') || '';

	// Find WhatsApp (meta) channels
	let whatsappChannelId: number | null = null;
	let channels: { id: number; name: string; provider: string }[] = [];

	try {
		const chRes = await fetch(`${API_BASE}/channels`, { headers });
		if (chRes.ok) {
			const chJson = await chRes.json();
			const chData = chJson.data ?? chJson;
			channels = Array.isArray(chData) ? chData : [];
			// Find the first meta/whatsapp channel
			const waChannel = channels.find(
				(c: { provider: string; is_active?: boolean }) =>
					c.provider === 'meta' || c.provider === 'whatsapp'
			);
			if (waChannel) whatsappChannelId = waChannel.id;
		}
	} catch (err) {
		console.error('Failed to fetch channels:', err);
	}

	// Build conversation query params
	const params = new URLSearchParams({
		limit: String(perPage),
		offset: String((page - 1) * perPage)
	});
	if (statusFilter) params.set('status', statusFilter);
	if (whatsappChannelId) params.set('channelId', String(whatsappChannelId));

	let conversations: Conversation[] = [];
	let total = 0;

	try {
		const res = await fetch(`${API_BASE}/conversations?${params}`, { headers });
		if (res.ok) {
			const json = await res.json();
			conversations = json.data ?? (Array.isArray(json) ? json : []);
			total = json.total ?? conversations.length;
		}
	} catch (err) {
		console.error('Failed to fetch conversations:', err);
	}

	// Fetch conversation stats
	let stats: ConversationStats | null = null;
	try {
		const statsRes = await fetch(`${API_BASE}/conversations/stats`, { headers });
		if (statsRes.ok) {
			const statsJson = await statsRes.json();
			stats = statsJson.data ?? statsJson;
		}
	} catch (err) {
		console.error('Failed to fetch conversation stats:', err);
	}

	// Fetch message stats
	let messageStats: MessageStats | null = null;
	try {
		const msgStatsRes = await fetch(`${API_BASE}/messages/stats`, { headers });
		if (msgStatsRes.ok) {
			const msgStatsJson = await msgStatsRes.json();
			messageStats = msgStatsJson.data ?? msgStatsJson;
		}
	} catch (err) {
		console.error('Failed to fetch message stats:', err);
	}

	// If a conversation is selected, fetch its details + messages
	let selectedConversation: Conversation | null = null;
	let messages: ConversationMessage[] = [];

	if (selectedId) {
		try {
			const [convRes, msgRes] = await Promise.all([
				fetch(`${API_BASE}/conversations/${selectedId}`, { headers }),
				fetch(`${API_BASE}/conversations/${selectedId}/messages?limit=100`, { headers })
			]);
			if (convRes.ok) {
				const convJson = await convRes.json();
				selectedConversation = convJson.data ?? convJson;
			}
			if (msgRes.ok) {
				const msgJson = await msgRes.json();
				const msgData = msgJson.data ?? msgJson;
				messages = Array.isArray(msgData) ? msgData : [];
			}
		} catch (err) {
			console.error('Failed to fetch conversation detail:', err);
		}
	}

	return {
		conversations,
		total,
		page,
		perPage,
		search,
		statusFilter,
		selectedId,
		whatsappChannelId,
		channels,
		stats,
		messageStats,
		selectedConversation,
		messages
	};
};
