import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { API_BASE, authHeaders, extractApiError } from '$lib/server/api';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const token = cookies.get('authToken');
	if (!token) throw redirect(302, '/login');

	const headers = authHeaders(token);

	const [journeyRes, questionsRes] = await Promise.all([
		fetch(`${API_BASE}/journeys/${params.id}`, { headers }),
		fetch(`${API_BASE}/journeys/${params.id}/questions`, { headers })
	]);

	if (!journeyRes.ok) {
		throw redirect(302, '/journeys');
	}

	const journeyRaw = await journeyRes.json();
	const journey = (journeyRaw as { data?: unknown }).data ?? journeyRaw;

	const questionsRaw = await questionsRes.json();
	const questions = Array.isArray(questionsRaw) ? questionsRaw : ((questionsRaw as { data?: unknown[] }).data ?? []);

	return {
		journey: journey as Record<string, unknown>,
		questions: questions as Record<string, unknown>[]
	};
};

export const actions: Actions = {
	createQuestion: async ({ request, params, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const payload = {
			question_text: (formData.get('question_text') as string)?.trim(),
			question_type: formData.get('question_type') as string,
			step_number: parseInt(formData.get('step_number') as string, 10) || 1,
			is_required: formData.get('is_required') === 'on',
			is_active: formData.get('is_active') === 'on',
			variable_name: (formData.get('variable_name') as string)?.trim() || '',
			choice_options: JSON.parse((formData.get('options') as string) || '[]')
		};

		if (!payload.question_text) {
			return fail(400, { error: 'Question text is required' });
		}

		try {
			const res = await fetch(`${API_BASE}/journeys/${params.id}/questions`, {
				method: 'POST',
				headers: authHeaders(token),
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to create question') });
			}

			return { success: true, action: 'createQuestion' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	},

	updateQuestion: async ({ request, params, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const questionId = formData.get('question_id') as string;
		const payload = {
			question_text: (formData.get('question_text') as string)?.trim(),
			question_type: formData.get('question_type') as string,
			step_number: parseInt(formData.get('step_number') as string, 10) || 1,
			is_required: formData.get('is_required') === 'on',
			is_active: formData.get('is_active') === 'on',
			variable_name: (formData.get('variable_name') as string)?.trim() || '',
			choice_options: JSON.parse((formData.get('options') as string) || '[]'),
			journey_id: parseInt(params.id, 10)
		};

		if (!questionId) return fail(400, { error: 'Question ID is required' });
		if (!payload.question_text) return fail(400, { error: 'Question text is required' });

		try {
			const res = await fetch(`${API_BASE}/journeys/${params.id}/questions/${questionId}`, {
				method: 'PUT',
				headers: authHeaders(token),
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to update question') });
			}

			return { success: true, action: 'updateQuestion' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	},

	deleteQuestion: async ({ request, params, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const questionId = formData.get('question_id') as string;
		if (!questionId) return fail(400, { error: 'Question ID is required' });

		try {
			const res = await fetch(`${API_BASE}/journeys/${params.id}/questions/${questionId}`, {
				method: 'DELETE',
				headers: authHeaders(token)
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to delete question') });
			}

			return { success: true, action: 'deleteQuestion' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	},

	toggleQuestion: async ({ request, params, cookies }) => {
		const token = cookies.get('authToken');
		if (!token) throw redirect(302, '/login');

		const formData = await request.formData();
		const questionId = formData.get('question_id') as string;
		const isActive = formData.get('is_active') === 'true';
		const questionText = formData.get('question_text') as string;
		const questionType = formData.get('question_type') as string;
		const stepNumber = parseInt(formData.get('step_number') as string, 10) || 1;
		const isRequired = formData.get('is_required') === 'on';
		const variableName = (formData.get('variable_name') as string) || '';

		if (!questionId) return fail(400, { error: 'Question ID is required' });

		try {
			const res = await fetch(`${API_BASE}/journeys/${params.id}/questions/${questionId}`, {
				method: 'PUT',
				headers: authHeaders(token),
				body: JSON.stringify({
					question_text: questionText,
					question_type: questionType,
					step_number: stepNumber,
					is_required: isRequired,
					is_active: !isActive,
					variable_name: variableName,
					journey_id: parseInt(params.id, 10)
				})
			});

			if (!res.ok) {
				return fail(res.status, { error: await extractApiError(res, 'Failed to toggle question') });
			}

			return { success: true, action: 'toggleQuestion' };
		} catch {
			return fail(500, { error: 'Unable to connect to server' });
		}
	}
};
