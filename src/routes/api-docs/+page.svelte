<script lang="ts">
	const API_PORT = typeof import.meta !== 'undefined' && import.meta.env.VITE_API_PORT
		? import.meta.env.VITE_API_PORT
		: 8100;

	const redocUrl = $derived(() => {
		if (typeof window === 'undefined') return `http://localhost:${API_PORT}/redoc`;
		return window.location.origin.replace(/:\d+$/, '') + `:${API_PORT}/redoc`;
	});
</script>

<svelte:head>
	<title>API Docs - TrueLocal AI</title>
</svelte:head>

<div class="h-full flex flex-col">
	<div class="p-4 border-b border-gray-200 bg-white">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-xl font-bold text-gray-900">API Documentation</h1>
				<p class="text-sm text-gray-500 mt-0.5">Interactive OpenAPI documentation powered by ReDoc</p>
			</div>
			<a
				href={redocUrl()}
				target="_blank"
				rel="noopener"
				class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
			>
				Open in New Tab
			</a>
		</div>
	</div>
	<div class="flex-1 relative">
		<iframe
			src={redocUrl()}
			title="API Documentation"
			class="w-full h-full border-0"
			style="min-height: calc(100vh - 120px)"
		></iframe>
	</div>
</div>
