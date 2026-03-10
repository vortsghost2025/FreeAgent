<script lang="ts">
	let sessions = $state([
		{ id: 'session-001', name: 'Main Session', status: 'active', started: '2024-03-10 10:00' },
		{ id: 'session-002', name: 'Dev Session', status: 'inactive', started: '2024-03-09 15:30' }
	]);
</script>

<div class="sessions-page">
	<h2>Sessions</h2>
	
	<div class="sessions-list">
		{#each sessions as session}
			<div class="session-card">
				<div class="session-info">
					<h3>{session.name}</h3>
					<p>ID: {session.id}</p>
					<p>Started: {session.started}</p>
				</div>
				<span class="session-status status-{session.status}">{session.status}</span>
			</div>
		{/each}
	</div>
</div>
