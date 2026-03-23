<script lang="ts">
	import '../app.css';
	import Navbar from '$components/layout/Navbar.svelte';
	import { page } from '$app/state';

	let { children } = $props();

	let isLoginPage = $derived(page.url.pathname === '/login');
</script>

{#if !isLoginPage}
	<Navbar />
{/if}
<main class="{isLoginPage ? '' : 'pt-14'}">
	{@render children()}
</main>
