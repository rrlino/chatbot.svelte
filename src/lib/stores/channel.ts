import { writable } from 'svelte/store';

export const selectedChannelId = writable<string | null>(null);
