# Monitoring

This document describes recommended monitoring practices for FreeAgent components. **No active monitoring agents are included in this repository.**

## What to Monitor

- **Runtime health**: service uptime, process health, and heartbeat signals.
- **Execution metrics**: trade execution counts, paper‑trading performance, error rates.
- **Agent status**: liveness of orchestrator and specialized agents.
- **Resource utilization**: CPU, memory, and I/O for long‑running processes.
- **Security events**: failed authentication attempts, unexpected configuration changes.

## Logging Recommendations

- Use structured JSON logging for machine readability.
- Include request IDs or correlation IDs where possible.
- Separate logs by component (orchestrator, agents, web UI, etc.).
- Retain logs according to your operational and compliance requirements.

## Observability Tools

- Use existing APM/monitoring solutions (e.g., Prometheus, Grafana, ELK) as appropriate.
- For local development, simple stdout logging and process managers may suffice.
- For production deployments, integrate with centralized logging and alerting systems.

## Alerts

- Configure alerts for critical failures (e.g., agent crashes, repeated execution errors).
- Set up thresholds for resource usage that may indicate instability.
- Route alerts to appropriate on‑call channels.

## Continuity and Governance

- The continuity decision machinery is **inert** and not actively monitoring runtime state.
- Monitoring should not be confused with enforcement — enforcement remains external to FreeAgent (see governance documents).

## Notes

- This is a guidance document only. Implementation of monitoring is deployment‑specific.
- No monitoring agents or runtime instrumentation are included in this repository.

--

*Last updated: 2026-04-28*