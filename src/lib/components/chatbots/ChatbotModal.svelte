<script lang="ts">
	import { AppModal } from '$components/core';

	let {
		open = $bindable(false),
		mode = 'create',
		chatbot = null,
		onSave,
		onClose
	}: {
		open?: boolean;
		mode?: 'create' | 'edit';
		chatbot?: Record<string, unknown> | null;
		onSave?: () => void;
		onClose?: () => void;
	} = $props();

	function handleClose() {
		onClose?.();
		open = false;
	}
</script>

<AppModal open={open} title={mode === 'create' ? 'Create Chatbot' : 'Edit Chatbot'} onClose={handleClose}>
	<div class="space-y-4">
		<p class="text-sm text-gray-500">Chatbot form will be implemented here.</p>
	</div>
</AppModal>
