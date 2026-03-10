<script lang="ts">
	// Agents page - Manage and view agents
	let agents = $state([
		{ id: 'agent-1', name: 'Code Agent', status: 'idle', tasks: 0 },
		{ id: 'agent-2', name: 'Data Agent', status: 'idle', tasks: 0 },
		{ id: 'agent-3', name: 'DevOps Agent', status: 'idle', tasks: 0 }
	]);
</script>

<div class="agents-page">
	<h2>Agents</h2>
	
	<div class="agents-grid">
		{#each agents as agent}
			<div class="agent-card">
				<div class="agent-header">
					<h3>{agent.name}</h3>
					<span class="status {agent.status}">{agent.status}</span>
				</div>
				<div class="agent-info">
					<p>ID: {agent.id}</p>
					<p>Tasks Completed: {agent.tasks}</p>
				</div>
				<div class="agent-actions">
					<button class="btn">Start</button>
					<button class="btn secondary">Configure</button>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.agents-page {
		max-width: 1200px;
	}

	h2 {
		font-size: 2rem;
		margin-bottom: 30px;
		color: #fff;
	}

	.agents-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 20px;
	}

	.agent-card {
		background: #16213e;
		padding: 25px;
		border-radius: 12px;
		border: 1px solid #0f3460;
	}

	.agent-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
	}

	.agent-header h3 {
		color: #fff;
		font-size: 1.25rem;
	}

	.status {
		padding: 4px 12px;
		border-radius: 20px;
		font-size: 0.85rem;
		text-transform: capitalize;
	}

	.status.idle {
		background: #0f3460;
		color: #a0a0a0;
	}

	.status.active {
		background: #4ade80;
		color: #000;
	}

	.agent-info {
		color: #a0a0a0;
		margin-bottom: 20px;
	}

	.agent-info p {
		margin-bottom: 5px;
	}

	.agent-actions {
		display: flex;
		gap: 10px;
	}

	.btn {
		padding: 10px 20px;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.btn:not(.secondary) {
		background: #e94560;
		color: #fff;
	}

	.btn.secondary {
		background: #0f3460;
		color: #fff;
	}

	.btn:hover {
		opacity: 0.9;
	}
</style>
