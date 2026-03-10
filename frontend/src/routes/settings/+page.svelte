<script lang="ts">
	let settings = $state({
		theme: 'dark',
		port: 5173,
		autoSave: true,
		logLevel: 'info'
	});
</script>

<div class="settings-page">
	<h2>Settings</h2>
	
	<div class="settings-section">
		<h3>General</h3>
		<div class="setting-item">
			<label>Theme</label>
			<select bind:value={settings.theme}>
				<option value="dark">Dark</option>
				<option value="light">Light</option>
			</select>
		</div>
		<div class="setting-item">
			<label>Port</label>
			<input type="number" bind:value={settings.port} />
		</div>
	</div>

	<div class="settings-section">
		<h3>Editor</h3>
		<div class="setting-item">
			<label>Auto-save</label>
			<input type="checkbox" bind:checked={settings.autoSave} />
		</div>
		<div class="setting-item">
			<label>Log Level</label>
			<select bind:value={settings.logLevel}>
				<option value="debug">Debug</option>
				<option value="info">Info</option>
				<option value="warn">Warn</option>
				<option value="error">Error</option>
			</select>
		</div>
	</div>

	<div class="actions">
		<button class="btn">Save Settings</button>
	</div>
</div>
