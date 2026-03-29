export function getQuestionTypeLabel(type: string): string {
	const labels: Record<string, string> = { text: 'Text', number: 'Number', boolean: 'Yes/No', choice: 'Choice' };
	return labels[type] || type;
}

export function getQuestionTypeBadge(type: string): string {
	const badges: Record<string, string> = {
		text: 'bg-blue-100 text-blue-700',
		number: 'bg-purple-100 text-purple-700',
		boolean: 'bg-green-100 text-green-700',
		choice: 'bg-orange-100 text-orange-700'
	};
	return badges[type] || 'bg-gray-100 text-gray-700';
}
