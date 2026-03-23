<script lang="ts">
	let { message = '', type = 'info', visible = $bindable(false) }: { message?: string; type?: 'success' | 'error' | 'info' | 'warning'; visible?: boolean } = $props();

	const bgColor = $derived(
		type === 'success' ? 'bg-green-500' :
		type === 'error' ? 'bg-red-500' :
		type === 'warning' ? 'bg-yellow-500' :
		'bg-blue-500'
	);
</script>

{#if visible}
	<div class="fixed bottom-4 right-4 z-50 animate-fade-in-up">
		<div class="{bgColor} text-white px-4 py-3 rounded-lg shadow-lg">
			{message}
		</div>
	</div>
{/if}
