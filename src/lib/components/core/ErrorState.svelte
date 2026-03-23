<script lang="ts">
	let { message = 'An error occurred', onRetry }: { message?: string; onRetry?: () => void } = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-red-500">
	<p class="text-lg font-medium">{message}</p>
	{#if onRetry}
		<button onclick={onRetry} class="mt-4 px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Try Again</button>
	{/if}
</div>
