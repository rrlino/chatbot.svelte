<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SearchIcon, XIcon } from 'lucide-svelte';

	let {
		search = $bindable(''),
		searchPlaceholder = 'Search...',
		perPage = $bindable(25),
		perPageOptions = [10, 25, 50, 100],
		onSearchChange,
		onPerPageChange,
		loading = false,
		children
	}: {
		search?: string;
		searchPlaceholder?: string;
		perPage?: number;
		perPageOptions?: number[];
		onSearchChange?: (query: string) => void;
		onPerPageChange?: (perPage: number) => void;
		loading?: boolean;
		children?: Snippet;
	} = $props();

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function handleSearchInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		search = value;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			onSearchChange?.(value);
		}, 300);
	}

	function clearSearch() {
		search = '';
		onSearchChange?.('');
	}

	function handlePerPageChange(e: Event) {
		const value = Number((e.target as HTMLSelectElement).value);
		perPage = value;
		onPerPageChange?.(value);
	}
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
	<div class="flex flex-wrap items-center gap-3">
		<!-- Search input -->
		<div class="relative flex-1 min-w-[200px]">
			<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
			<input
				type="text"
				value={search}
				oninput={handleSearchInput}
				placeholder={searchPlaceholder}
				disabled={loading}
				class="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
			/>
			{#if search}
				<button onclick={clearSearch} class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
					<XIcon class="h-4 w-4" />
				</button>
			{/if}
		</div>

		<!-- Per page selector -->
		<div class="flex items-center gap-2">
			<label for="per-page" class="text-sm text-gray-500 whitespace-nowrap">Per page:</label>
			<select
				id="per-page"
				value={perPage}
				onchange={handlePerPageChange}
				disabled={loading}
				class="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
			>
				{#each perPageOptions as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</div>

		<!-- Slot for additional filters -->
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
