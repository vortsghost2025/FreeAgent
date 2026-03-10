<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Cockpit</title>
</svelte:head>

<div class="app">
	<nav class="sidebar">
		<div class="logo">
			<h1>Cockpit</h1>
		</div>
		<ul class="nav-links">
			<li><a href="/">Dashboard</a></li>
			<li><a href="/agents">Agents</a></li>
			<li><a href="/tasks">Tasks</a></li>
			<li><a href="/sessions">Sessions</a></li>
			<li><a href="/settings">Settings</a></li>
		</ul>
	</nav>
	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
		background: #1a1a2e;
		color: #eee;
	}

	.app {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 240px;
		background: #16213e;
		padding: 20px;
		border-right: 1px solid #0f3460;
	}

	.logo h1 {
		font-size: 1.5rem;
		color: #e94560;
		margin-bottom: 30px;
	}

	.nav-links {
		list-style: none;
	}

	.nav-links li {
		margin-bottom: 10px;
	}

	.nav-links a {
		display: block;
		padding: 12px 16px;
		color: #a0a0a0;
		text-decoration: none;
		border-radius: 8px;
		transition: all 0.2s;
	}

	.nav-links a:hover {
		background: #0f3460;
		color: #fff;
	}

	.content {
		flex: 1;
		padding: 30px;
		overflow-y: auto;
	}
</style>
