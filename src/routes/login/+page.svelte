<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Bot } from 'lucide-svelte';
	import LanguageSwitcher from '$components/layout/LanguageSwitcher.svelte';

	let currentLang = $state('pt');
	let formError = $state('');
	let loading = $state(false);

	if (typeof localStorage !== 'undefined') {
		currentLang = localStorage.getItem('i18n_locale') || 'pt';
		// Client-side redirect if already authenticated (SPA navigation)
		if (localStorage.getItem('authToken')) {
			goto('/dashboard', { replaceState: true });
		}
	}
</script>

<svelte:head>
	<title>Login - TrueLocal AI</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
	<div class="w-full max-w-md">
		<div class="bg-white rounded-xl shadow-lg p-8">
			<!-- Header -->
			<div class="text-center mb-6">
				<div class="flex justify-end mb-2">
					<LanguageSwitcher bind:currentLang />
				</div>
				<Bot class="h-12 w-12 text-primary mx-auto mb-3" />
				<h2 class="text-2xl font-bold text-gray-900">Login</h2>
				<p class="text-gray-500 mt-1">Admin Panel</p>
			</div>

			<!-- Form -->
			<form
				method="POST"
				use:enhance={() => {
					formError = '';
					loading = true;
					return async ({ result, update }) => {
						loading = false;
						if (result.type === 'failure') {
							const data = result.data as { error?: string };
							formError = data.error || 'Login failed';
							await update();
						}
						// Redirect is handled server-side (303), no client-side goto needed
					};
				}}
				data-testid="login-form"
			>
				<div class="mb-4">
					<label for="username" class="block text-sm font-medium text-gray-700 mb-1"
						>Username</label
					>
					<input
						type="text"
						id="username"
						name="username"
						required
						disabled={loading}
						placeholder="admin"
						data-testid="username-input"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
					/>
				</div>

				<div class="mb-4">
					<label for="password" class="block text-sm font-medium text-gray-700 mb-1"
						>Password</label
					>
					<input
						type="password"
						id="password"
						name="password"
						required
						disabled={loading}
						data-testid="password-input"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
					/>
				</div>

				{#if formError}
					<div
						class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
						data-testid="error-message"
					>
						{formError}
					</div>
				{/if}

				<button
					type="submit"
					disabled={loading}
					data-testid="login-submit"
					class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{#if loading}
						<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							></path>
						</svg>
					{/if}
					{loading ? 'Processing...' : 'Login'}
				</button>
			</form>
		</div>
	</div>
</div>
