import en from './en.json';
import pt from './pt.json';

const messages: Record<string, Record<string, unknown>> = { en, pt };

export function getLocale(): string {
	if (typeof localStorage === 'undefined') return 'pt';
	return localStorage.getItem('i18n_locale') || 'pt';
}

export function t(key: string, locale?: string): string {
	const loc = locale || getLocale();
	const keys = key.split('.');
	let result: unknown = messages[loc];
	for (const k of keys) {
		if (result && typeof result === 'object') {
			result = (result as Record<string, unknown>)[k];
		} else {
			return key;
		}
	}
	return typeof result === 'string' ? result : key;
}
