// federation_dashboard.js
// Real-time federation visualization and controls

document.addEventListener('DOMContentLoaded', function() {
    // Example: Fetch federation data and update UI
    fetch('/api/federations')
        .then(res => res.json())
        .then(data => updateFederationUI(data));

    // Poll federation data every 2 seconds for real-time updates
    setInterval(() => {
        fetch('/api/federations')
            .then(res => res.json())
            .then(data => updateFederationUI(data));
    }, 2000);

    function updateFederationUI(data) {
        // Render federation nodes
        const nodesDiv = document.getElementById('federationNodes');
        nodesDiv.innerHTML = '';
        data.federations.forEach(fed => {
            const node = document.createElement('div');
            node.className = 'federation-node';
            node.innerHTML = `<strong>${fed.name}</strong><br>Status: ${fed.status}`;
            nodesDiv.appendChild(node);
        });
        // Render event log
        const logDiv = document.getElementById('eventLog');
        logDiv.innerHTML = data.events.map(e => `<div>${e}</div>`).join('');
    }

    // Example: Demo control
    document.getElementById('startDemo').addEventListener('click', function() {
        // Simulate federation event
        fetch('/api/federations/demo', {method: 'POST'})
            .then(() => alert('Demo started!'));
    });
});
