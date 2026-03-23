<script lang="ts">
	import type { Snippet } from 'svelte';
	let { open = $bindable(false), title = '', onClose, children }: { open?: boolean; title?: string; onClose?: () => void; children?: Snippet } = $props();
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_interactive_supports_focus -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={onClose} role="dialog" tabindex="-1">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h3 class="text-lg font-semibold text-gray-900">{title}</h3>
				<button onclick={onClose} class="text-gray-400 hover:text-gray-600" aria-label="Close">&times;</button>
			</div>
			<div class="p-4">
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>
	</div>
{/if}
