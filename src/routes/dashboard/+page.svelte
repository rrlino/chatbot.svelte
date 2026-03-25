<script lang="ts">
	import { goto } from '$app/navigation';
	import { Activity, Users, Bot, TrendingUp, MessageSquare, Clock, RefreshCw } from 'lucide-svelte';
	import LoadingState from '$components/core/LoadingState.svelte';
	import EmptyState from '$components/core/EmptyState.svelte';

	let { data } = $props();
	let loading = $state(false);
	let recentActivity = $state(data.recentActivity);
	let period = $state('day');

	function getActivityIcon(type: string) {
		switch (type) {
			case 'message_in': return 'text-green-500';
			case 'message_out': return 'text-blue-500';
			case 'message_failed': return 'text-red-500';
			default: return 'text-blue-600';
		}
	}

	function getActivityBadgeClass(type: string) {
		switch (type) {
			case 'message_in': return 'bg-green-100 text-green-700';
			case 'message_out': return 'bg-blue-100 text-blue-700';
			case 'message_failed': return 'bg-red-100 text-red-700';
			default: return 'bg-gray-100 text-gray-700';
		}
	}

	function getActivityLabel(type: string) {
		switch (type) {
			case 'message_in': return 'Inbound';
			case 'message_out': return 'Outbound';
			case 'message_failed': return 'Failed';
			default: return 'Message';
		}
	}

	function getUserInitials(name: string) {
		if (!name) return '??';
		const words = name.split(' ');
		if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
		return words[0].substring(0, 2).toUpperCase();
	}

	function getUserColor(name: string) {
		const colors = ['#6f42c1', '#20c997', '#fd7e14', '#e83e8c', '#6610f2', '#198754', '#dc3545'];
		if (!name) return colors[0];
		let hash = 0;
		for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
		return colors[Math.abs(hash) % colors.length];
	}

	function formatTime(dateString: string) {
		if (!dateString) return 'Unknown';
		const diffMins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
		if (diffMins < 1) return 'Now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
		return `${Math.floor(diffMins / 1440)}d ago`;
	}

	async function refreshActivity() {
		loading = true;
		try {
			const token = localStorage.getItem('authToken');
			const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
			const res = await fetch(`${API_BASE}/messages?limit=10`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const json = await res.json() as any;
			const messages: any[] = json.data ?? json;
			recentActivity = messages
				.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
				.slice(0, 10)
				.map((msg: any) => {
					const direction = (msg.direction ?? '').toLowerCase();
					const status = (msg.status ?? '').toLowerCase();
					let type = 'message';
					if (status === 'failed' || status === 'error') type = 'message_failed';
					else if (direction === 'inbound') type = 'message_in';
					else if (direction === 'outbound') type = 'message_out';
					return {
						id: msg.id,
						type,
						title: (msg.content ?? '').substring(0, 80) || 'New Message',
						counterpartyName: msg.from_number ?? 'Unknown',
						counterpartyPhone: msg.from_number ?? '',
						timestamp: msg.created_at
					};
				});
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Dashboard - TrueLocal AI</title>
</svelte:head>

<div class="p-6 space-y-6">
	<!-- Header -->
	<div class="bg-white rounded-xl shadow-sm p-5">
		<h1 class="text-xl font-bold text-gray-900 flex items-center gap-2" data-testid="dashboard-title">
			<Activity class="h-5 w-5 text-blue-600" />
			Dashboard
		</h1>
		<p class="text-gray-500 mt-1">Welcome back. Here's your platform overview.</p>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="bg-white rounded-xl shadow-sm p-5" data-testid="total-messages-card">
			<div class="flex items-center gap-3">
				<div class="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
					<MessageSquare class="h-6 w-6 text-blue-600" />
				</div>
				<div>
					<p class="text-sm text-gray-500" data-testid="total-messages-label">Total Messages</p>
					<p class="text-2xl font-bold">{data.stats.totalMessages}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-xl shadow-sm p-5" data-testid="active-users-card">
			<div class="flex items-center gap-3">
				<div class="flex-shrink-0 p-2 bg-green-50 rounded-lg">
					<Users class="h-6 w-6 text-green-600" />
				</div>
				<div>
					<p class="text-sm text-gray-500" data-testid="active-users-label">Total Users</p>
					<p class="text-2xl font-bold">{data.stats.activeUsers}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-xl shadow-sm p-5" data-testid="chatbots-card">
			<div class="flex items-center gap-3">
				<div class="flex-shrink-0 p-2 bg-purple-50 rounded-lg">
					<Bot class="h-6 w-6 text-purple-600" />
				</div>
				<div>
					<p class="text-sm text-gray-500" data-testid="chatbots-label">Chatbots</p>
					<p class="text-2xl font-bold">{data.stats.totalChatbots}</p>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-xl shadow-sm p-5" data-testid="success-rate-card">
			<div class="flex items-center gap-3">
				<div class="flex-shrink-0 p-2 bg-amber-50 rounded-lg">
					<TrendingUp class="h-6 w-6 text-amber-600" />
				</div>
				<div>
					<p class="text-sm text-gray-500" data-testid="success-rate-label">Active Conversations</p>
					<p class="text-2xl font-bold">{data.stats.activeConversations}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Recent Activity -->
		<div class="lg:col-span-2 bg-white rounded-xl shadow-sm">
			<div class="flex items-center justify-between p-5 border-b border-gray-100">
				<h2 class="text-lg font-semibold flex items-center gap-2">
					<Clock class="h-5 w-5 text-gray-400" />
					Recent Activity
				</h2>
				<button
					onclick={refreshActivity}
					disabled={loading}
					class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
				>
					<RefreshCw class="h-4 w-4 {loading ? 'animate-spin' : ''}" />
					Refresh
				</button>
			</div>
			<div class="p-0">
				{#if loading}
					<LoadingState />
				{:else if recentActivity.length === 0}
					<EmptyState title="No recent activity" description="Messages will appear here once users start chatting." />
				{:else}
					<div class="divide-y divide-gray-50">
						{#each recentActivity as item}
							<div class="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
								<div class="flex-shrink-0 p-2 bg-gray-100 rounded-full h-9 w-9 flex items-center justify-center">
									<MessageSquare class="h-4 w-4 {getActivityIcon(item.type)}" />
								</div>
								<div class="flex-grow-1 min-w-0">
									<p class="text-sm text-gray-900 truncate" title={item.title}>{item.title}</p>
									<p class="text-xs text-gray-500 mt-0.5">{item.counterpartyName}</p>
								</div>
								<div class="flex-shrink-0 text-right">
									<span class="inline-block px-2 py-0.5 text-xs font-medium rounded-full {getActivityBadgeClass(item.type)}">
										{getActivityLabel(item.type)}
									</span>
									<p class="text-xs text-gray-400 mt-1">{formatTime(item.timestamp)}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
			{#if recentActivity.length > 0}
				<div class="p-4 border-t border-gray-100 text-center">
					<button
						onclick={() => goto('/messages')}
						class="text-sm text-blue-600 hover:text-blue-800"
					>
						View all messages →
					</button>
				</div>
			{/if}
		</div>

		<!-- System Overview -->
		<div class="bg-white rounded-xl shadow-sm">
			<div class="p-5 border-b border-gray-100">
				<h2 class="text-lg font-semibold flex items-center gap-2">
					<Activity class="h-5 w-5 text-gray-400" />
					System Overview
				</h2>
			</div>
			<div class="p-5 space-y-5">
				<!-- System Health -->
				<div>
					<h3 class="text-sm text-gray-500 mb-2">System Health</h3>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div class="bg-green-500 h-2 rounded-full" style="width: 95%"></div>
					</div>
					<p class="text-xs text-gray-400 mt-1">95% operational</p>
				</div>

				<!-- Quick Stats -->
				<div>
					<h3 class="text-sm text-gray-500 mb-2">Quick Stats</h3>
					<div class="grid grid-cols-2 gap-2">
						<div class="text-center p-3 bg-gray-50 rounded-lg">
							<p class="text-lg font-bold text-blue-600">{data.stats.todayMessages}</p>
							<p class="text-xs text-gray-500">Inbound</p>
						</div>
						<div class="text-center p-3 bg-gray-50 rounded-lg">
							<p class="text-lg font-bold text-green-600">{data.stats.activeConversations}</p>
							<p class="text-xs text-gray-500">Conversations</p>
						</div>
						<div class="text-center p-3 bg-gray-50 rounded-lg">
							<p class="text-lg font-bold text-purple-600">{data.stats.totalChatbots}</p>
							<p class="text-xs text-gray-500">Bots</p>
						</div>
						<div class="text-center p-3 bg-gray-50 rounded-lg">
							<p class="text-lg font-bold text-amber-600">{data.stats.totalMessages}</p>
							<p class="text-xs text-gray-500">Total Msgs</p>
						</div>
					</div>
				</div>

				<!-- Recent Users -->
				<div>
					<h3 class="text-sm text-gray-500 mb-2">Recent Users</h3>
					{#if data.recentUsers.length === 0}
						<p class="text-sm text-gray-400">No users yet</p>
					{:else}
						<div class="space-y-2">
							{#each data.recentUsers as user}
								<div class="flex items-center gap-2">
									<div
										class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
										style="background-color: {getUserColor(user.name)}"
									>
										{getUserInitials(user.name)}
									</div>
									<div class="flex-grow-1 min-w-0">
										<p class="text-sm font-medium text-gray-900 truncate">{user.name}</p>
										<p class="text-xs text-gray-400">{formatTime(user.lastActive)}</p>
									</div>
									{#if user.isOnline}
										<span class="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"></span>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
			<div class="p-4 border-t border-gray-100 text-center">
				<button
					onclick={() => goto('/users')}
					class="text-sm text-blue-600 hover:text-blue-800"
				>
					View all users →
				</button>
			</div>
		</div>
	</div>
</div>
