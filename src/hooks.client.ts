import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
	const { url } = event;

	if (!token && url.pathname !== '/login') {
		redirect(302, '/login');
	}

	if (token && url.pathname === '/login') {
		redirect(302, '/dashboard');
	}

	return resolve(event);
};
