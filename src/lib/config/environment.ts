export const CONFIG = {
	api: {
		baseUrl: import.meta.env.VITE_API_BASE_URL || '',
		timeout: 30000
	},
	backend: {
		type: (import.meta.env.VITE_BACKEND_TYPE || 'greenfield') as 'greenfield' | 'rust'
	}
} as const;
