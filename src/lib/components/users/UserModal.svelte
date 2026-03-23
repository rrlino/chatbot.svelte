<script lang="ts">
	import { AppModal } from '$components/core';

	let { open = $bindable(false), mode = 'edit', user = null }: { open?: boolean; mode?: 'create' | 'edit'; user?: Record<string, unknown> | null } = $props();
</script>

<AppModal open={open} title={mode === 'create' ? 'Create User' : 'Edit User'} onClose={() => (open = false)}>
	<div class="space-y-4">
		<p class="text-sm text-gray-500">User form will be implemented here.</p>
	</div>
</AppModal>
