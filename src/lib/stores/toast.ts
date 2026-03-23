import { writable } from 'svelte/store';

export interface Toast {
	id: number;
	message: string;
	type: 'success' | 'error' | 'info' | 'warning';
}

let nextId = 0;

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	return {
		subscribe,
		show(message: string, type: Toast['type'] = 'info') {
			const id = nextId++;
			update((toasts) => [...toasts, { id, message, type }]);
			setTimeout(() => {
				update((toasts) => toasts.filter((t) => t.id !== id));
			}, 3000);
		},
		success(message: string) { this.show(message, 'success'); },
		error(message: string) { this.show(message, 'error'); },
		info(message: string) { this.show(message, 'info'); },
		warning(message: string) { this.show(message, 'warning'); },
		dismiss(id: number) { update((toasts) => toasts.filter((t) => t.id !== id)); }
	};
}

export const toast = createToastStore();
