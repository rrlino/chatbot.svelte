export const endpoints = {
	auth: {
		login: '/auth/login',
		logout: '/auth/logout',
		me: '/auth/me'
	},
	users: {
		list: '/users',
		get: (id: string) => `/users/${id}`,
		create: '/users',
		update: (id: string) => `/users/${id}`,
		delete: (id: string) => `/users/${id}`
	},
	chatbots: {
		list: '/chatbots',
		get: (id: string) => `/chatbots/${id}`,
		create: '/chatbots',
		update: (id: string) => `/chatbots/${id}`,
		delete: (id: string) => `/chatbots/${id}`
	},
	messages: {
		list: '/messages',
		get: (id: string) => `/messages/${id}`
	},
	journeys: {
		list: '/journeys',
		questions: '/journey-questions',
		responses: '/journey-responses'
	},
	variables: {
		list: '/variables'
	},
	system: {
		settings: '/system/settings',
		version: '/system/version',
		upgrade: '/system/upgrade'
	},
	whatsapp: {
		settings: '/whatsapp/settings',
		connector: '/whatsapp/connector',
		messages: '/whatsapp/messages'
	},
	fitness: {
		exercises: '/fitness/exercises',
		trainingSets: '/fitness/training-sets',
		assignments: '/fitness/assignments'
	}
} as const;
