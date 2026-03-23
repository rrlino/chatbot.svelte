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
		{ label: 'Variables', href: '/variables', icon: 'code-square' }
	]
};

export const systemMenu: DropdownMenu = {
	label: 'System',
	icon: 'gear',
	items: [
		{ label: 'Settings', href: '/system-settings', icon: 'sliders' },
		{ label: 'Admins', href: '/admin-users', icon: 'person-badge' },
		{ label: 'Upgrade', href: '/system-settings?tab=upgrades', icon: 'rocket' },
		{ label: 'Data Deletions', href: '/data-deletions', icon: 'trash' }
	]
};
