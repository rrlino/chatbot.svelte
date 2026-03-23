export interface User {
	id: string;
	name: string;
	email: string;
	phone?: string;
	status: 'active' | 'inactive';
	role: 'guest' | 'registered';
	created_at: string;
}

export interface Chatbot {
	id: string;
	name: string;
	description?: string;
	status: 'active' | 'inactive';
	system_prompt: string;
	is_default: boolean;
	users_count: number;
	created_at: string;
}

export interface Message {
	id: string;
	user_id: string;
	direction: 'inbound' | 'outbound';
	content: string;
	status: string;
	created_at: string;
}

export interface Journey {
	id: string;
	type: string;
	questions: JourneyQuestion[];
}

export interface JourneyQuestion {
	id: string;
	journey_type: string;
	question_text: string;
	question_type: 'YES_NO' | 'MULTIPLE_CHOICE' | 'FREE_TEXT' | 'SCALE';
	display_order: number;
	required: boolean;
	enabled: boolean;
}

export interface JourneyResponse {
	id: string;
	user_id: string;
	journey_type: string;
	question_id: string;
	answer: string;
	status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
	created_at: string;
}

export interface Variable {
	key: string;
	value: string;
	category: string;
	description?: string;
}

export interface SystemSettings {
	system_name: string;
	interface_language: string;
	date_format: string;
	timezone: string;
	session_timeout: number;
	theme: string;
}

export interface ApiResponse<T> {
	data: T;
	message?: string;
	total?: number;
	page?: number;
	per_page?: number;
}
