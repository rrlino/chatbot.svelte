<script lang="ts">
	let { user = $bindable(null) }: { user?: Record<string, unknown> | null } = $props();
</script>

<div class="space-y-4">
	<div class="grid grid-cols-2 gap-4">
		<div>
			<label for="user-name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
			<input id="user-name" type="text" value={user?.name ?? ''} oninput={(e) => { if (user) user.name = (e.target as HTMLInputElement).value; }} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Full name" />
		</div>
		<div>
			<label for="user-email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
			<input id="user-email" type="email" value={user?.email ?? ''} oninput={(e) => { if (user) user.email = (e.target as HTMLInputElement).value; }} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="user@example.com" />
		</div>
	</div>
	<div class="grid grid-cols-2 gap-4">
		<div>
			<label for="user-phone" class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
			<input id="user-phone" type="text" value={user?.phone_number ?? ''} oninput={(e) => { if (user) user.phone_number = (e.target as HTMLInputElement).value; }} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+5511999999999" />
		</div>
		<div>
			<label for="user-language" class="block text-sm font-medium text-gray-700 mb-1">Language</label>
			<select id="user-language" value={user?.language ?? 'pt-BR'} onchange={(e) => { if (user) user.language = (e.target as HTMLSelectElement).value; }} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
				<option value="pt-BR">Portuguese (BR)</option>
				<option value="en">English</option>
				<option value="es">Spanish</option>
			</select>
		</div>
	</div>

	{#if user?.created_at}
		<div class="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
			<div>
				<p class="text-xs font-medium text-gray-500 uppercase">Created</p>
				<p class="text-sm text-gray-700 mt-0.5">{new Date(user.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
			</div>
			<div>
				<p class="text-xs font-medium text-gray-500 uppercase">Updated</p>
				<p class="text-sm text-gray-700 mt-0.5">{new Date(user.updated_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
			</div>
		</div>
	{/if}
</div>
