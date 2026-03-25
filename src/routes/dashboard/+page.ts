import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

interface DashboardStats {
	messages: { total: number; inbound: number; outbound: number; failed: number; pending: number; sent: number };
	conversations: { total: number; by_status: { status: string; count: number }[] };
	chatbots: { total: number; active: number; inactive: number };
	users: { data: DashboardUser[]; total: number };
	messages_list: { data: DashboardMessage[]; total: number };
}

interface DashboardUser {
	id: number;
	name: string;
	phone_number: string;
	status: string;
	last_activity: string | null;
	created_at: string;
	message_count: number;
}

interface DashboardMessage {
	id: number;
	direction: string;
	content: string;
	status: string;
	created_at: string;
	from_number: string;
	user_id: number;
	conversation_id: number;
}

export const load: PageLoad = async ({ fetch }) => {
	const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
	if (!token) {
		throw redirect(302, '/login');
	}

	const headers = { Authorization: `Bearer ${token}` };

	const [messagesStatsRes, conversationsStatsRes, chatbotsStatsRes, usersRes, messagesRes] = await Promise.all([
		fetch(`${API_BASE}/messages/stats`, { headers }).then((r) => r.json()),
		fetch(`${API_BASE}/conversations/stats`, { headers }).then((r) => r.json()),
		fetch(`${API_BASE}/chatbots/stats`, { headers }).then((r) => r.json()),
		fetch(`${API_BASE}/users?limit=5`, { headers }).then((r) => r.json()),
		fetch(`${API_BASE}/messages?limit=10`, { headers }).then((r) => r.json())
	]);

	const raw = {
		messages: messagesStatsRes.data ?? messagesStatsRes,
		conversations: conversationsStatsRes.data ?? conversationsStatsRes,
		chatbots: chatbotsStatsRes.data ?? chatbotsStatsRes,
		users: usersRes,
		messages_list: messagesRes
	} as DashboardStats;

	// Build user lookup index for enriching messages
	const userIndex = new Map<number, string>();
	const phoneIndex = new Map<string, string>();
	for (const user of raw.users.data ?? []) {
		if (user.name && user.id) userIndex.set(user.id, user.name);
		if (user.name && user.phone_number) phoneIndex.set(user.phone_number, user.name);
	}

	// Classify and enrich recent messages as activity items
	const recentActivity = (raw.messages_list.data ?? [])
		.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		.slice(0, 10)
		.map((msg) => {
			const direction = (msg.direction ?? '').toLowerCase();
			const status = (msg.status ?? '').toLowerCase();
			let type: string = 'message';
			if (status === 'failed' || status === 'error') type = 'message_failed';
			else if (direction === 'inbound') type = 'message_in';
			else if (direction === 'outbound') type = 'message_out';

			const phone = msg.from_number ?? '';
			const counterpartyName = msg.user_id ? (userIndex.get(msg.user_id) ?? phoneIndex.get(phone) ?? null) : null;

			return {
				id: msg.id,
				type,
				title: (msg.content ?? '').substring(0, 80) || 'New Message',
				counterpartyName: counterpartyName ?? (phone || 'Unknown'),
				counterpartyPhone: phone,
				timestamp: msg.created_at
			};
		});

	// Map recent users
	const recentUsers = (raw.users.data ?? []).slice(0, 4).map((u) => ({
		id: u.id,
		name: u.name || `User ${u.phone_number}`,
		lastActive: u.last_activity || u.created_at,
		isOnline: u.status === 'active'
	}));

	return {
		stats: {
			totalMessages: raw.messages.total ?? 0,
			activeUsers: raw.users.total ?? 0,
			totalChatbots: raw.chatbots.total ?? 0,
			todayMessages: raw.messages.inbound ?? 0,
			activeConversations: raw.conversations.total ?? 0
		},
		recentActivity,
		recentUsers
	};
};
