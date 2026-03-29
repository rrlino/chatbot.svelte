export interface NavItem {
	label: string;
	href: string;
	icon?: string;
}

export const mainNav: NavItem[] = [
	{ label: 'Messages', href: '/messages', icon: 'chat-dots' },
	{ label: 'Users', href: '/users', icon: 'people' },
	{ label: 'Conversation', href: '/conversation', icon: 'whatsapp' }
];

export interface DropdownMenu {
	label: string;
	icon?: string;
	items: NavItem[];
}

export const chatbotMenu: DropdownMenu = {
	label: 'Chatbots',
	icon: 'robot',
	items: [
		{ label: 'Chatbot Management', href: '/chatbots', icon: 'robot' },
		{ label: 'Journeys', href: '/journeys', icon: 'signpost' },
		{ label: 'Journey Responses', href: '/journey-responses', icon: 'chat-square-text' },
		{ label: 'Variables', href: '/variables', icon: 'code-square' },
		{ label: 'Training Assignments', href: '/training-assignments', icon: 'clipboard-check' }
	]
};

export const systemMenu: DropdownMenu = {
	label: 'System',
	icon: 'gear',
	items: [
		{ label: 'Settings', href: '/system-settings', icon: 'sliders' },
		{ label: 'Upgrade', href: '/system-upgrade', icon: 'rocket' },
		{ label: 'Admins', href: '/admin-users', icon: 'person-badge' },
		{ label: 'Security Alerts', href: '/security-alert-review', icon: 'shield-check' },
		{ label: 'Rate Limiting', href: '/rate-limiting', icon: 'speedometer2' },
		{ label: 'Data Deletions', href: '/data-deletions', icon: 'trash' },
		{ label: 'Audit Logs', href: '/notifications', icon: 'journal-text' }
	]
};

export const integrationsMenu: DropdownMenu = {
	label: 'Integrations',
	icon: 'plug',
	items: [
		{ label: 'Channels', href: '/partner-management', icon: 'diagram-3' },
		{ label: 'Webhooks', href: '/webhook-management', icon: 'link-45deg' },
		{ label: 'API Tokens', href: '/api-tokens', icon: 'key' },
		{ label: 'API Docs', href: '/api-docs', icon: 'file-earmark-code' },
		{ label: 'API Management', href: '/api-management', icon: 'braces' }
	]
};

export const aiMenu: DropdownMenu = {
	label: 'AI',
	icon: 'cpu',
	items: [
		{ label: 'AI Training', href: '/ai-training', icon: 'stars' }
	]
};

export const allMenus: DropdownMenu[] = [chatbotMenu, systemMenu, integrationsMenu, aiMenu];
