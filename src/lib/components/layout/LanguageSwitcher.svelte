<script lang="ts">
	let { currentLang = $bindable('pt') }: { currentLang?: string } = $props();

	function setLang(lang: string) {
		currentLang = lang;
		localStorage.setItem('i18n_locale', lang);
	}
</script>

<div class="flex items-center gap-1">
	<button
		onclick={() => setLang('en')}
		class="px-2 py-1 text-xs font-semibold rounded transition-colors {currentLang === 'en' ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'}"
	>
		EN
	</button>
	<span class="text-white/40 text-xs">|</span>
	<button
		onclick={() => setLang('pt')}
		class="px-2 py-1 text-xs font-semibold rounded transition-colors {currentLang === 'pt' ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'}"
	>
		PT
	</button>
</div>
