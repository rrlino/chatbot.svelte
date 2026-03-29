<script lang="ts">
	import { selectedChannelId } from '$lib/stores/channel';
	import { apiFetch } from '$lib/utils/api';
	import { endpoints } from '$lib/config/endpoints';

	interface Channel {
		id: string;
		name: string;
		type?: string;
		active?: boolean;
	}

	let channels: Channel[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		loadChannels();
	});

	async function loadChannels() {
		try {
			loading = true;
			error = '';
			const response = await apiFetch<{ data?: Channel[]; channels?: Channel[] }>(endpoints.channels.list);
			channels = response.data ?? response.channels ?? (Array.isArray(response) ? response : []);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load channels';
		} finally {
			loading = false;
		}
	}
</script>

<div class="inline-block">
	{#if loading}
		<select disabled class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/40">
			<option>Loading channels...</option>
		</select>
	{:else if error}
		<p class="text-red-400 text-sm">{error}</p>
	{:else}
		<select
			class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
			onchange={(e) => {
				const value = (e.target as HTMLSelectElement).value;
				selectedChannelId.set(value || null);
			}}
		>
			<option value="">All channels</option>
			{#each channels as channel}
				<option value={channel.id}>{channel.name}</option>
			{/each}
		</select>
	{/if}
</div>
