import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.68.107:8080/api/v1';

interface ApiUser {
	id: number;
	name: string;
	phone_number: string;
	status: string;
	last_activity?: string | null;
	last_activity_at?: string | null;
	created_at: string;
	message_count?: number;
}

interface ApiMessage {
	id: number;
	direction: string;
	content: string;
	status: string;
	created_at: string;
	timestamp?: string;
	from_number?: string;
	user_id?: number;
}

interface MessageStats {
	total: number;
	inbound: number;
	outbound: number;
	sent: number;
	failed: number;
	pending: number;
}

async function fetchJson(url: string, headers: Record<string, string>) {
	const res = await fetch(url, { headers });
	if (!res.ok) return null;
	return res.json();
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const headers = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	};

	const [msgStatsRaw, convStatsRaw, botStatsRaw, usersRaw, msgsRaw] = await Promise.all([
		fetchJson(`${API_BASE}/messages/stats`, headers),
		fetchJson(`${API_BASE}/conversations/stats`, headers),
		fetchJson(`${API_BASE}/chatbots/stats`, headers),
		fetchJson(`${API_BASE}/users?limit=5`, headers),
		fetchJson(`${API_BASE}/messages?limit=30`, headers)
	]);

	// Unwrap JsonResponse { data: ... } envelope
	const msgData: MessageStats = msgStatsRaw?.data ?? msgStatsRaw ?? { total: 0, inbound: 0, outbound: 0, sent: 0, failed: 0, pending: 0 };
	const convData = convStatsRaw?.data ?? convStatsRaw ?? {};
	const botData = botStatsRaw?.data ?? botStatsRaw ?? {};
	const usersList: ApiUser[] = usersRaw?.data ?? (Array.isArray(usersRaw) ? usersRaw : []);
	const usersTotal: number = usersRaw?.total ?? usersList.length;
	const msgsList: ApiMessage[] = msgsRaw?.data ?? (Array.isArray(msgsRaw) ? msgsRaw : []);

	// Build user lookup indexes for enriching messages with names
	const userIndex = new Map<number, string>();
	const phoneIndex = new Map<string, string>();
	for (const u of usersList) {
		if (u.name && u.id) userIndex.set(u.id, u.name);
		if (u.name && u.phone_number) phoneIndex.set(u.phone_number, u.name);
	}

	// Build hourly message activity chart data (last 24 hours)
	const now = Date.now();
	const hourlyBuckets = new Array(24).fill(0);
	const hourlyLabels: string[] = [];
	for (let i = 23; i >= 0; i--) {
		hourlyLabels.push(i === 0 ? 'Now' : `${i}h`);
	}
	for (const msg of msgsList) {
		const ts = new Date(msg.created_at || msg.timestamp || '').getTime();
		const hoursAgo = (now - ts) / (1000 * 60 * 60);
		if (hoursAgo >= 0 && hoursAgo < 24) {
			hourlyBuckets[23 - Math.floor(hoursAgo)]++;
		}
	}

	// Classify and enrich recent messages as activity items
	const recentActivity = msgsList
		.sort((a, b) => new Date(b.created_at || b.timestamp || '').getTime() - new Date(a.created_at || a.timestamp || '').getTime())
		.slice(0, 20)
		.map((msg) => {
			const direction = (msg.direction ?? '').toLowerCase();
			const status = (msg.status ?? '').toLowerCase();
			let type = 'message';
			if (status === 'failed' || status === 'error') type = 'message_failed';
			else if (direction === 'inbound') type = 'message_in';
			else if (direction === 'outbound') type = 'message_out';

			const phone = msg.from_number ?? '';
			const counterpartyName = msg.user_id
				? (userIndex.get(msg.user_id) ?? phoneIndex.get(phone) ?? (phone || 'Unknown'))
				: (phone || 'Unknown');

			return {
				id: msg.id,
				type,
				title: (msg.content ?? '').substring(0, 80) || 'New Message',
				counterpartyName,
				counterpartyPhone: phone,
				timestamp: msg.created_at || msg.timestamp || ''
			};
		});

	// Map recent users
	const recentUsers = usersList.slice(0, 4).map((u) => ({
		id: u.id,
		name: u.name || `User ${u.phone_number ?? u.id}`,
		lastActive: u.last_activity || u.last_activity_at || u.created_at,
		isOnline: u.status === 'active'
	}));

	return {
		stats: {
			totalMessages: msgData.total ?? 0,
			activeUsers: usersTotal ?? 0,
			totalChatbots: botData.total ?? 0,
			todayMessages: msgData.inbound ?? 0,
			activeConversations: convData.total ?? 0,
			messagesSent: msgData.sent ?? 0,
			messagesFailed: msgData.failed ?? 0,
			messagesPending: msgData.pending ?? 0,
			chatbotsActive: botData.active ?? 0
		},
		recentActivity,
		recentUsers,
		chartData: {
			hourly: { labels: hourlyLabels, data: hourlyBuckets },
			direction: {
				labels: ['Inbound', 'Outbound'],
				counts: [msgData.inbound ?? 0, msgData.outbound ?? 0]
			}
		}
	};
};
