<script lang="ts">
	// Tasks page - View and manage tasks
	let tasks = $state([
		{ id: 'task-001', title: 'Initialize system', status: 'pending', priority: 'high' },
		{ id: 'task-002', title: 'Configure agents', status: 'pending', priority: 'medium' },
		{ id: 'task-003', title: 'Setup monitoring', status: 'pending', priority: 'low' }
	]);
</script>

<div class="tasks-page">
	<h2>Tasks</h2>
	
	<div class="tasks-header">
		<button class="btn">Create Task</button>
	</div>

	<div class="tasks-list">
		{#each tasks as task}
			<div class="task-card">
				<div class="priority priority-{task.priority}"></div>
				<div class="task-content">
					<h3>{task.title}</h3>
					<p>ID: {task.id}</p>
				</div>
				<span class="task-status status-{task.status}">{task.status}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.tasks-page {
		max-width: 1200px;
	}

	h2 {
		font-size: 2rem;
		margin-bottom: 30px;
		color: #fff;
	}

	.tasks-header {
		margin-bottom: 25px;
	}

	.btn {
		padding: 12px 24px;
		background: #e94560;
		color: #fff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.btn:hover {
		opacity: 0.9;
	}

	.tasks-list {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.task-card {
		background: #16213e;
		padding: 20px;
		border-radius: 12px;
		border: 1px solid #0f3460;
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.priority {
		width: 8px;
		height: 40px;
		border-radius: 4px;
	}

	.priority-high {
		background: #e94560;
	}

	.priority-medium {
		background: #f59e0b;
	}

	.priority-low {
		background: #4ade80;
	}

	.task-content {
		flex: 1;
	}

	.task-content h3 {
		color: #fff;
		font-size: 1.1rem;
		margin-bottom: 5px;
	}

	.task-content p {
		color: #a0a0a0;
		font-size: 0.9rem;
	}

	.task-status {
		padding: 6px 16px;
		border-radius: 20px;
		font-size: 0.85rem;
		text-transform: capitalize;
	}

	.status-pending {
		background: #0f3460;
		color: #a0a0a0;
	}

	.status-completed {
		background: #4ade80;
		color: #000;
	}

	.status-running {
		background: #f59e0b;
		color: #000;
	}
</style>
