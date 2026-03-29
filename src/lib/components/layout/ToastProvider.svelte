<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import { CheckCircleIcon, XCircleIcon, InfoIcon, AlertTriangleIcon, XIcon } from 'lucide-svelte';

	const icons = {
		success: CheckCircleIcon,
		error: XCircleIcon,
		info: InfoIcon,
		warning: AlertTriangleIcon
	};

	const bgColors = {
		success: 'bg-green-50 border-green-200 text-green-800',
		error: 'bg-red-50 border-red-200 text-red-800',
		info: 'bg-blue-50 border-blue-200 text-blue-800',
		warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
	};

	const iconColors = {
		success: 'text-green-500',
		error: 'text-red-500',
		info: 'text-blue-500',
		warning: 'text-yellow-500'
	};
</script>

<div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
	{#each $toast as t (t.id)}
		{@const Icon = icons[t.type]}
		{@const bg = bgColors[t.type]}
		{@const ic = iconColors[t.type]}
		<div class="animate-fade-in-up flex items-start gap-3 p-3 rounded-lg border shadow-lg {bg}">
			<Icon class="h-5 w-5 mt-0.5 shrink-0 {ic}" />
			<p class="text-sm flex-1">{t.message}</p>
			<button onclick={() => toast.dismiss(t.id)} class="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
				<XIcon class="h-4 w-4" />
			</button>
		</div>
	{/each}
</div>
