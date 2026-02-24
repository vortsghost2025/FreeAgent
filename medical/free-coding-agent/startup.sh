#!/bin/bash

echo "Starting Federation..."

node server.js &
node swarm.js &
node cockpit.js &
node websocket-router.js &

echo "All systems online."
