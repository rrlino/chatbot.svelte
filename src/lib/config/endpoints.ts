export const endpoints = {
	auth: {
		login: '/auth/login',
		logout: '/auth/logout',
		me: '/auth/me',
		verifyToken: '/auth/verify-token',
		changePassword: '/auth/change-password',
		users: '/auth/users',
		user: (id: string) => `/auth/users/${id}`
	},
	users: {
		list: '/users',
		get: (id: string) => `/users/${id}`,
		create: '/users',
		update: (id: string) => `/users/${id}`,
		delete: (id: string) => `/users/${id}`,
		status: (id: string) => `/users/${id}/status`,
		search: '/users/search',
		variables: (userId: string) => `/users/${userId}/variables`,
		variable: (userId: string, tag: string) => `/users/${userId}/variables/${tag}`,
		variablesBulk: (userId: string) => `/users/${userId}/bulk`,
		context: (userId: string) => `/users/${userId}/context`,
		journeys: (userId: string) => `/users/${userId}/journeys`
	},
	chatbots: {
		list: '/chatbots',
		get: (id: string) => `/chatbots/${id}`,
		create: '/chatbots',
		update: (id: string) => `/chatbots/${id}`,
		delete: (id: string) => `/chatbots/${id}`,
		stats: '/chatbots/stats',
		respond: '/chatbots/respond'
	},
	channels: {
		list: '/channels',
		get: (id: string) => `/channels/${id}`,
		create: '/channels',
		status: (id: string) => `/channels/${id}/status`,
		active: (id: string) => `/channels/${id}/active`,
		config: (id: string) => `/channels/${id}/config`,
		search: '/channels/search'
	},
	conversations: {
		list: '/conversations',
		get: (id: string) => `/conversations/${id}`,
		create: '/conversations',
		getOrCreate: '/conversations/get-or-create',
		update: (id: string) => `/conversations/${id}`,
		close: (id: string) => `/conversations/${id}/close`,
		history: (id: string) => `/conversations/${id}/history`,
		messages: (id: string) => `/conversations/${id}/messages`,
		exists: (id: string) => `/conversations/${id}/exists`,
		expireOld: '/conversations/expire-old',
		stats: '/conversations/stats'
	},
	messages: {
		list: '/messages',
		get: (id: string) => `/messages/${id}`,
		create: '/messages',
		stats: '/messages/stats',
		search: '/messages/search',
		retry: (id: string) => `/messages/${id}/retry`,
		process: '/messages/process'
	},
	journeys: {
		list: '/journeys',
		get: (id: string) => `/journeys/${id}`,
		create: '/journeys',
		update: (id: string) => `/journeys/${id}`,
		delete: (id: string) => `/journeys/${id}`,
		questions: (journeyId: string) => `/journeys/${journeyId}/questions`,
		question: (journeyId: string, tag: string) => `/journeys/${journeyId}/questions/${tag}`,
		start: (id: string) => `/journeys/${id}/start`,
		progress: (journeyId: string, userId: string) => `/journeys/${journeyId}/users/${userId}/progress`,
		submitSequential: '/journeys/submit/sequential',
		submitBatch: '/journeys/submit/batch',
		progressAll: '/journeys/progress',
		stats: '/journeys/stats',
		checkExpiry: '/journeys/check-expiry'
	},
	journeyAssignments: {
		list: '/api/journey-assignments',
		get: (id: string) => `/api/journey-assignments/${id}`,
		start: '/api/journey-assignments/start',
		active: (userId: string) => `/api/journey-assignments/active/${userId}`,
		answer: '/api/journey-assignments/answer',
		batchAnswers: '/api/journey-assignments/batch-answers',
		nextQuestion: (assignmentId: string) => `/api/journey-assignments/next-question/${assignmentId}`,
		pause: (assignmentId: string) => `/api/journey-assignments/${assignmentId}/pause`,
		resume: (assignmentId: string) => `/api/journey-assignments/${assignmentId}/resume`,
		complete: (assignmentId: string) => `/api/journey-assignments/${assignmentId}/complete`,
		userHistory: (userId: string) => `/api/journey-assignments/user/${userId}/history`,
		userList: (userId: string) => `/api/journey-assignments/user/${userId}`,
		stats: '/api/journey-assignments/stats',
		expireOld: '/api/journey-assignments/expire-old'
	},
	variables: {
		definitions: '/var-definitions',
		active: '/var-definitions/active',
		category: (category: string) => `/var-definitions/category/${category}`,
		definition: (tag: string) => `/var-definitions/${tag}`,
		users: (userId: string) => `/variables/users/${userId}`,
		userVariable: (userId: string, tag: string) => `/variables/users/${userId}/${tag}`,
		usersBulk: (userId: string) => `/variables/users/${userId}/bulk`,
		context: (userId: string) => `/variables/users/${userId}/context`,
		comorbidities: (userId: string) => `/variables/users/${userId}/comorbidities`,
		exportByTag: (tag: string) => `/variables/${tag}/users/export`
	},
	settings: {
		list: '/settings',
		get: (key: string) => `/settings/${key}`,
		update: (key: string) => `/settings/${key}`,
		delete: (key: string) => `/settings/${key}`,
		import: '/settings/import'
	},
	system: {
		settings: '/system/settings',
		version: '/api/health/detailed',
		upgrade: '/api/health/detailed'
	},
	security: {
		status: '/api/security/status'
	},
	webhooks: {
		whatsappVerify: '/v1/webhooks/whatsapp',
		simulate: '/api/send-webhook',
		status: '/webhooks/status',
		mercadopago: '/webhooks/mercadopago',
		getnet: '/webhooks/getnet',
		cielo: '/webhooks/cielo'
	},
	whatsapp: {
		settings: '/whatsapp/settings',
		connector: '/whatsapp/connector',
		messages: '/whatsapp/messages'
	},
	jobs: {
		list: '/api/job-queue',
		get: (id: string) => `/api/job-queue/${id}`,
		create: '/api/job-queue',
		process: (id: string) => `/api/job-queue/${id}/process`,
		worker: '/api/job-queue/worker'
	},
	audit: {
		list: '/api/audit'
	},
	analytics: {
		metrics: '/analytics/metrics'
	},
	ai: {
		chatbotResponse: '/api/ai/chatbot-response',
		parseJourneyBatch: '/api/ai/parse-journey-batch',
		conversationSummary: '/api/ai/conversation-summary',
		validateConfig: '/api/ai/validate-config',
		clearCache: '/api/ai/clear-cache',
		testResponse: '/api/ai/test-response',
		testBatchParsing: '/api/ai/test-batch-parsing',
		health: '/api/ai/health'
	},
	billing: {
		plans: '/billing/plans',
		plan: (id: string) => `/billing/plans/${id}`,
		subscription: (userId: string) => `/billing/subscriptions/users/${userId}`,
		cancelSubscription: (userId: string) => `/billing/subscriptions/users/${userId}/cancel`,
		activeSubscription: (userId: string) => `/billing/subscriptions/users/${userId}/active`,
		events: '/billing/events',
		stats: '/billing/stats',
		checkout: '/billing/checkout',
		portal: '/billing/portal'
	},
	health: {
		check: '/api/health',
		detailed: '/api/health/detailed',
		metrics: '/api/metrics',
		metricsReset: '/api/metrics/reset',
		routes: '/api/routes'
	}
} as const;
