import { writable, get } from 'svelte/store';

interface MissingEndpoint {
	endpoint: string;
	method: string;
	status?: number;
	timestamp: number;
}

const MAX_ENTRIES = 50;

function createBackendCompat() {
	const { subscribe, set, update } = writable<MissingEndpoint[]>([]);

	function addMissing(endpoint: string, method: string, status?: number) {
		update((entries) => {
			const exists = entries.some(
				(e) => e.endpoint === endpoint && e.method === method
			);
			if (exists) return entries;

			const newEntry: MissingEndpoint = {
				endpoint,
				method,
				status,
				timestamp: Date.now()
			};

			const updated = [newEntry, ...entries];
			return updated.slice(0, MAX_ENTRIES);
		});
	}

	function clear() {
		set([]);
	}

	return { subscribe, addMissing, clear };
}

export const backendCompat = createBackendCompat();
