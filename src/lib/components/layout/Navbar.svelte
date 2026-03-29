<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		MessageCircle, Users, Bot, Settings, ChevronDown,
		LogOut, Moon, Sun, Globe, Menu, X, BotIcon,
		Cpu
	} from 'lucide-svelte';
	import LanguageSwitcher from './LanguageSwitcher.svelte';
	import { mainNav, chatbotMenu, systemMenu, integrationsMenu, aiMenu } from '$data/navigation';

	let currentLang = $state('pt');
	let mobileMenuOpen = $state(false);
	let openDropdown = $state<string | null>(null);
	let isDark = $state(false);

	// Initialize language from localStorage
	if (typeof localStorage !== 'undefined') {
		currentLang = localStorage.getItem('i18n_locale') || 'pt';
		isDark = localStorage.getItem('theme') === 'dark';
	}

	function toggleDropdown(name: string) {
		openDropdown = openDropdown === name ? null : name;
	}

	function closeDropdowns() {
		openDropdown = null;
	}

	function toggleTheme() {
		isDark = !isDark;
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
		closeDropdowns();
	}

	function navigate(href: string) {
		closeDropdowns();
		mobileMenuOpen = false;
		goto(href);
	}

	function logout() {
		localStorage.removeItem('authToken');
		goto('/login');
	}

	function isActive(href: string): boolean {
		return page.url.pathname === href;
	}

	function isDropdownActive(items: { href: string }[]): boolean {
		return items.some((item) => page.url.pathname === item.href);
	}
</script>

<nav class="fixed top-0 left-0 right-0 z-40 bg-blue-600 shadow-lg">
	<div class="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
		<div class="flex h-14 items-center justify-between">
			<!-- Logo -->
			<a href="/dashboard" class="flex items-center gap-2 text-white font-semibold text-lg hover:bg-white/10 rounded-md px-2 py-1.5 transition-colors">
				<BotIcon class="h-5 w-5" />
				TrueLocal AI
				<span class="text-[0.6rem] px-1.5 py-0.5 rounded bg-blue-400/50 text-white/90 font-medium">Greenfield</span>
			</a>

			<!-- Desktop Nav -->
			<div class="hidden lg:flex items-center gap-1">
				{#each mainNav as item}
					<a
						href={item.href}
						class="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md transition-colors
							{isActive(item.href) ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
					>
						{#if item.icon === 'chat-dots'}
							<MessageCircle class="h-4 w-4" />
						{:else if item.icon === 'people'}
							<Users class="h-4 w-4" />
						{:else if item.icon === 'whatsapp'}
							<MessageCircle class="h-4 w-4" />
						{/if}
						{item.label}
					</a>
				{/each}

				<!-- Chatbots Dropdown -->
				<div class="relative">
					<button
						onclick={() => toggleDropdown('chatbots')}
						onmouseenter={() => { if (window.innerWidth >= 1024) openDropdown = 'chatbots'; }}
						class="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md transition-colors
							{isDropdownActive(chatbotMenu.items) || openDropdown === 'chatbots' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
					>
						<Bot class="h-4 w-4" />
						{chatbotMenu.label}
						<ChevronDown class="h-3.5 w-3.5 transition-transform {openDropdown === 'chatbots' ? 'rotate-180' : ''}" />
					</button>
					{#if openDropdown === 'chatbots'}
						<div class="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
							{#each chatbotMenu.items as item}
								<a
									href={item.href}
									onclick={() => navigate(item.href)}
									class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
								>
									{item.label}
								</a>
							{/each}
						</div>
					{/if}
				</div>

				<!-- System Dropdown -->
				<div class="relative">
					<button
						onclick={() => toggleDropdown('system')}
						onmouseenter={() => { if (window.innerWidth >= 1024) openDropdown = 'system'; }}
						class="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md transition-colors
							{isDropdownActive(systemMenu.items) || openDropdown === 'system' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
					>
						<Settings class="h-4 w-4" />
						{systemMenu.label}
						<ChevronDown class="h-3.5 w-3.5 transition-transform {openDropdown === 'system' ? 'rotate-180' : ''}" />
					</button>
					{#if openDropdown === 'system'}
						<div class="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
							{#each systemMenu.items as item}
								<a
									href={item.href}
									onclick={() => navigate(item.href)}
									class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
								>
									{item.label}
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</div>

				<!-- Integrations Dropdown -->
				<div class="relative">
					<button
						onclick={() => toggleDropdown('integrations')}
						onmouseenter={() => { if (window.innerWidth >= 1024) openDropdown = 'integrations'; }}
						class="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md transition-colors
							{isDropdownActive(integrationsMenu.items) || openDropdown === 'integrations' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
					>
						<Globe class="h-4 w-4" />
						{integrationsMenu.label}
						<ChevronDown class="h-3.5 w-3.5 transition-transform {openDropdown === 'integrations' ? 'rotate-180' : ''}" />
					</button>
					{#if openDropdown === 'integrations'}
						<div class="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
							{#each integrationsMenu.items as item}
								<a href={item.href} onclick={() => navigate(item.href)} class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors">{item.label}</a>
							{/each}
						</div>
					{/if}
				</div>

				<!-- AI Dropdown -->
				<div class="relative">
					<button
						onclick={() => toggleDropdown('ai')}
						onmouseenter={() => { if (window.innerWidth >= 1024) openDropdown = 'ai'; }}
						class="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md transition-colors
							{isDropdownActive(aiMenu.items) || openDropdown === 'ai' ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
					>
						<Cpu class="h-4 w-4" />
						{aiMenu.label}
						<ChevronDown class="h-3.5 w-3.5 transition-transform {openDropdown === 'ai' ? 'rotate-180' : ''}" />
					</button>
					{#if openDropdown === 'ai'}
						<div class="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
							{#each aiMenu.items as item}
								<a href={item.href} onclick={() => navigate(item.href)} class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors">{item.label}</a>
							{/each}
						</div>
					{/if}
				</div>

			<!-- Right side: Language + User -->
			<div class="hidden lg:flex items-center gap-2">
				<LanguageSwitcher bind:currentLang />

				<!-- User Dropdown -->
				<div class="relative">
					<button
						onclick={() => toggleDropdown('user')}
						class="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors"
					>
						<div class="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
							<span class="text-xs font-bold">A</span>
						</div>
						Admin
						<ChevronDown class="h-3.5 w-3.5" />
					</button>
					{#if openDropdown === 'user'}
						<div class="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
							<div class="px-4 py-2 border-b border-gray-100">
								<p class="text-xs text-gray-500">Logged in as Admin</p>
							</div>
							<button
								onclick={toggleTheme}
								class="flex items-center justify-between w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
							>
								<span class="flex items-center gap-2">
									{#if isDark}
										<Sun class="h-4 w-4" />
										Light Mode
									{:else}
										<Moon class="h-4 w-4" />
										Dark Mode
									{/if}
								</span>
								<span class="text-xs px-1.5 py-0.5 rounded-full {isDark ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}">
									{isDark ? 'ON' : 'OFF'}
								</span>
							</button>
							<div class="border-t border-gray-100 mt-1 pt-1">
								<button
									onclick={logout}
									class="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
								>
									<LogOut class="h-4 w-4" />
									Logout
								</button>
							</div>
						</div>
					{/if}
				</div>

				<!-- Quick Theme Toggle -->
				<button
					onclick={toggleTheme}
					class="p-2 text-white/80 hover:bg-white/10 hover:text-white rounded-md transition-colors"
					aria-label="Toggle theme"
				>
					{#if isDark}
						<Sun class="h-4 w-4" />
					{:else}
						<Moon class="h-4 w-4" />
					{/if}
				</button>
			</div>

			<!-- Mobile Menu Button -->
			<div class="flex items-center gap-2 lg:hidden">
				<LanguageSwitcher bind:currentLang />
				<button
					onclick={toggleMobileMenu}
					class="p-2 text-white hover:bg-white/10 rounded-md transition-colors"
					aria-label="Toggle menu"
				>
					{#if mobileMenuOpen}
						<X class="h-5 w-5" />
					{:else}
						<Menu class="h-5 w-5" />
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Mobile Menu -->
	{#if mobileMenuOpen}
		<div class="lg:hidden bg-blue-700 border-t border-blue-500/30 shadow-lg">
			<div class="px-2 py-3 space-y-1">
				{#each mainNav as item}
					<a
						href={item.href}
						onclick={() => navigate(item.href)}
						class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors
							{isActive(item.href) ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}"
					>
						{item.label}
					</a>
				{/each}

				<!-- Chatbots Mobile -->
				<button
					onclick={() => toggleDropdown('chatbots')}
					class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors"
				>
					<span>{chatbotMenu.label}</span>
					<ChevronDown class="h-4 w-4 transition-transform {openDropdown === 'chatbots' ? 'rotate-180' : ''}" />
				</button>
				{#if openDropdown === 'chatbots'}
					<div class="ml-4 pl-3 border-l-2 border-white/20 space-y-1">
						{#each chatbotMenu.items as item}
							<a
								href={item.href}
								onclick={() => navigate(item.href)}
								class="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-md transition-colors"
							>
								{item.label}
							</a>
						{/each}
					</div>
				{/if}

				<!-- System Mobile -->
				<button
					onclick={() => toggleDropdown('system')}
					class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors"
				>
					<span>{systemMenu.label}</span>
					<ChevronDown class="h-4 w-4 transition-transform {openDropdown === 'system' ? 'rotate-180' : ''}" />
				</button>
				{#if openDropdown === 'system'}
					<div class="ml-4 pl-3 border-l-2 border-white/20 space-y-1">
						{#each systemMenu.items as item}
							<a
								href={item.href}
								onclick={() => navigate(item.href)}
								class="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-md transition-colors"
							>
								{item.label}
							</a>
						{/each}
					</div>
				{/if}

					<!-- Integrations Mobile -->
				<button
					onclick={() => toggleDropdown('integrations')}
					class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors"
				>
					<span>{integrationsMenu.label}</span>
					<ChevronDown class="h-4 w-4 transition-transform {openDropdown === 'integrations' ? 'rotate-180' : ''}" />
				</button>
				{#if openDropdown === 'integrations'}
					<div class="ml-4 pl-3 border-l-2 border-white/20 space-y-1">
						{#each integrationsMenu.items as item}
							<a href={item.href} onclick={() => navigate(item.href)} class="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-md transition-colors">{item.label}</a>
						{/each}
					</div>
				{/if}

				<!-- AI Mobile -->
				<button
					onclick={() => toggleDropdown('ai')}
					class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors"
				>
					<span>{aiMenu.label}</span>
					<ChevronDown class="h-4 w-4 transition-transform {openDropdown === 'ai' ? 'rotate-180' : ''}" />
				</button>
				{#if openDropdown === 'ai'}
					<div class="ml-4 pl-3 border-l-2 border-white/20 space-y-1">
						{#each aiMenu.items as item}
							<a href={item.href} onclick={() => navigate(item.href)} class="block px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-md transition-colors">{item.label}</a>
						{/each}
					</div>
				{/if}

			<!-- Mobile Bottom Section -->
				<div class="border-t border-white/20 pt-2 mt-2 space-y-1">
					<button
						onclick={toggleTheme}
						class="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors"
					>
						<span>{#if isDark} Light Mode {:else} Dark Mode {/if}</span>
						<span class="text-xs px-1.5 py-0.5 rounded-full {isDark ? 'bg-yellow-400/20 text-yellow-200' : 'bg-white/10 text-white/70'}">
							{isDark ? 'ON' : 'OFF'}
						</span>
					</button>
					<button
						onclick={logout}
						class="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium rounded-md text-red-300 hover:bg-white/10 hover:text-red-200 transition-colors"
					>
						<LogOut class="h-4 w-4" />
						Logout
					</button>
				</div>
			</div>
		</div>
	{/if}
</nav>

<!-- Click outside to close dropdowns -->
<svelte:window onclick={(e) => {
	if (!(e.target as HTMLElement).closest('nav')) closeDropdowns();
}} />
