<script lang="ts">
	// Dashboard page - Overview of system status
	let stats = $state({
		activeAgents: 0,
		pendingTasks: 0,
		activeSessions: 0,
		totalTasks: 0
	});
</script>

<div class="dashboard">
	<h2>Dashboard</h2>
	
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-value">{stats.activeAgents}</div>
			<div class="stat-label">Active Agents</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{stats.pendingTasks}</div>
			<div class="stat-label">Pending Tasks</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{stats.activeSessions}</div>
			<div class="stat-label">Active Sessions</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{stats.totalTasks}</div>
			<div class="stat-label">Total Tasks</div>
		</div>
	</div>

	<div class="section">
		<h3>System Status</h3>
		<div class="status-card">
			<span class="status-indicator offline"></span>
			<span>System Ready</span>
		</div>
	</div>
</div>

<style>
	.dashboard {
		max-width: 1200px;
	}

	h2 {
		font-size: 2rem;
		margin-bottom: 30px;
		color: #fff;
	}

	h3 {
		font-size: 1.25rem;
		margin-bottom: 15px;
		color: #a0a0a0;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 20px;
		margin-bottom: 40px;
	}

	.stat-card {
		background: #16213e;
		padding: 25px;
		border-radius: 12px;
		border: 1px solid #0f3460;
	}

	.stat-value {
		font-size: 2.5rem;
		font-weight: bold;
		color: #e94560;
	}

	.stat-label {
		color: #a0a0a0;
		margin-top: 5px;
	}

	.section {
		margin-top: 30px;
	}

	.status-card {
		background: #16213e;
		padding: 20px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.status-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}

	.status-indicator.offline {
		background: #e94560;
	}

	.status-indicator.online {
		background: #4ade80;
	}
</style>
