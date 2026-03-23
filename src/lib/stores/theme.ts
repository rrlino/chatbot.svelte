import { writable } from 'svelte/store';

function createThemeStore() {
	const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
	const { subscribe, set } = writable<'light' | 'dark'>(stored === 'dark' ? 'dark' : 'light');

	return {
		subscribe,
		toggle() {
			subscribe((current) => {
				const next = current === 'light' ? 'dark' : 'light';
				localStorage.setItem('theme', next);
				set(next);
				return next;
			})();
		}
	};
}

export const theme = createThemeStore();
