<script lang="ts">
	let { user = $bindable(null) }: { user?: Record<string, unknown> | null } = $props();
</script>

<div class="space-y-4">
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<div>
			<label for="user-name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
			<input
				id="user-name"
				type="text"
				value={user?.name ?? ''}
				oninput={(e) => { if (user) user.name = (e.target as HTMLInputElement).value; }}
				class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="Full name"
			/>
		</div>
		<div>
			<label for="user-email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
			<input
				id="user-email"
				type="email"
				value={user?.email ?? ''}
				oninput={(e) => { if (user) user.email = (e.target as HTMLInputElement).value; }}
				class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="user@example.com"
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<div>
			<label for="user-phone" class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
			<input
				id="user-phone"
				type="text"
				value={user?.phone_number ?? ''}
				oninput={(e) => { if (user) user.phone_number = (e.target as HTMLInputElement).value; }}
				class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="+5511999999999"
			/>
		</div>
		<div>
			<label for="user-language" class="block text-sm font-medium text-gray-700 mb-1">Language</label>
			<select
				id="user-language"
				value={user?.language ?? 'pt-BR'}
				onchange={(e) => { if (user) user.language = (e.target as HTMLSelectElement).value; }}
				class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="pt-BR">Portuguese (BR)</option>
				<option value="en">English</option>
				<option value="es">Spanish</option>
			</select>
		</div>
	</div>

	<!-- Role / Status + Chatbot Toggle -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<div>
			<label for="user-status" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
			<select
				id="user-status"
				value={user?.status ?? 'guest'}
				onchange={(e) => { if (user) user.status = (e.target as HTMLSelectElement).value; }}
				class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="guest">Guest</option>
				<option value="registered">Registered</option>
			</select>
		</div>
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1">Chatbot</label>
			<div class="flex items-center gap-3 py-2">
				<button
					type="button"
					onclick={() => { if (user) user.chatbot_paused = !user.chatbot_paused; }}
					class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 {user?.chatbot_paused ? 'bg-yellow-400' : 'bg-green-500'}"
					role="switch"
					aria-checked={!user?.chatbot_paused}
				>
					<span
						class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform {user?.chatbot_paused ? 'translate-x-1' : 'translate-x-6'}"
					></span>
				</button>
				<span class="text-sm text-gray-600">
					{user?.chatbot_paused ? 'Paused' : 'Active'}
				</span>
			</div>
		</div>
	</div>

	{#if user?.created_at}
		<div class="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
			<div>
				<p class="text-xs font-medium text-gray-500 uppercase">Created</p>
				<p class="text-sm text-gray-700 mt-0.5">
					{new Date(user.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
				</p>
			</div>
			<div>
				<p class="text-xs font-medium text-gray-500 uppercase">Updated</p>
				<p class="text-sm text-gray-700 mt-0.5">
					{user.updated_at
						? new Date(user.updated_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
						: '—'}
				</p>
			</div>
		</div>
	{/if}
</div>
