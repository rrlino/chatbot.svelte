<script lang="ts">
	let { onSearch }: { onSearch?: (query: string) => void } = $props();
	let query = $state('');
</script>

<div class="flex items-center gap-3 mb-4">
	<input
		type="text"
		bind:value={query}
		placeholder="Search users..."
		class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
	/>
	<button onclick={() => onSearch?.(query)} class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Search</button>
</div>
