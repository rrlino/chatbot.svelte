import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			$components: 'src/lib/components',
			$data: 'src/lib/data',
			$utils: 'src/lib/utils',
			$stores: 'src/lib/stores',
			$config: 'src/lib/config',
			$types: 'src/lib/types',
			$i18n: 'src/lib/i18n'
		}
	}
};

export default config;
