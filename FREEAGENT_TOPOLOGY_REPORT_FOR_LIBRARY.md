# FreeAgent Topology Report for Library

**Status:** CANDIDATE / SELF-REPORTED / NON-AUTHORITATIVE  
**Created:** 2026-04-28T08:52:53-04:00  
**Hard boundaries:**
- FreeAgent is **not** a lane.
- FreeAgent may describe its internal structure.
- FreeAgent may **not** assign constitutional authority.
- Library must verify this report before it becomes part of the Nexus Graph meaning layer.
- Archivist/lattice must ratify anything governance-relevant.

--

## 1. Executive Summary

FreeAgent is an **application/runtime/orchestration workspace** that implements multi-agent orchestration, trading automation, and developer tooling. It is **not** a constitutional lane and does not hold governance authority. Its primary role is execution, coordination, and developer experience. While FreeAgent hosts documentation, runtime modules, and deployment helpers, it defers constitutional authority to the 4‑lane lattice. This report is a non‑authoritative self‑description intended to help Library classify nodes, edges, and artifacts for the Nexus Graph meaning layer.

--

## 2. Top‑Level Domain Map

| Domain | Description |
|--------|-------------|
| **freeagent-core** | Core runtime: agents, orchestrator, memory, coordination, service orchestration, core utilities. |
| **cockpit-ui** | Web UI/dashboard (Next.js + Node backend) for operator control and observation. |
| **agent-runtime** | Python trading bots and orchestrators; specialized agents (risk, execution, analysis, etc.). |
| **trading-bot / MEV / finance logic** | Live/paper trading, arbitrage, continuous trading, position management. |
| **we4free-web** | Public static PWA website (`we4free_website/`) for mental health resources. |
| **we4free-mesh** | Mesh coordination and PWA builder (`we4free_global/`, mesh coordinator, health signals). |
| **medical-demos** | Node.js multi‑agent medical demos, synthetic data pipelines, and clinical‑intelligence prototypes. |
| **shared-infra** | Extracted shared utilities, CI, scripts, tools (extracted in Phase 1). |
| **federation-creative** | Extracted creative/federation simulations and weather server (extracted in Phase 1). |
| **connection-bridge** | Extracted Netlify bridge app (extracted in Phase 1). |
| **governance-local-operational-docs** | FreeAgent‑local governance/operational docs (AGENTS.md, SAFETY_INVARIANTS.md, DUAL_VERIFICATION_PROTOCOL.md, etc.). |
| **compact-continuity** | Compact phenotype continuity policy and evidence index (inert machinery). |
| **assistant-sync / handoff** | Assistant sync packet and handoff documentation. |
| **tests** | Unit/integration tests for core, agents, continuity, and federation components. |
| **scripts/tools** | Helper scripts (boot, deploy, health‑check, watchdog, export, etc.). |
| **unknown/quarantine** | Unclassified or high‑risk content awaiting review. |

--

## 3. Path Map

| Domain | Current Paths | Purpose | Runtime code? | Docs? | Tests? | Coupled to FreeAgent core? | Public/deployment impact? | Safety/compliance risk? | Recommended Library classification |
|--------|---------------|---------|---------------|-------|--------|-----------------------------|----------------------------|------------------------|-------------------------------|
| **freeagent-core** | `agents/`, `core/`, `coordination/`, `service_orchestration/`, `src/` | Orchestration, agent runtime, memory, coordination | Yes | Yes (architecture) | Yes | Yes | Medium (internal) | Medium (trades, agent actions) | `application_adjacent/runtime` |
| **cockpit-ui** | `cockpit/` | Operator dashboard & UI | Yes (Node + React) | Yes (blueprint, guide) | Partial | Yes (API calls to core) | Medium (exposes ops) | Low‑Medium (ops safety) | `application_adjacent/ui` |
| **agent-runtime** | `agents/`, `trading_handler.py`, `live_trading.py` | Trading & agent execution | Yes | Yes | Yes | Yes | High (trades real or paper) | High (financial risk) | `runtime/finance` |
| **trading-bot / MEV / finance** | `arbitrage_engine.py`, `continuous_trading.py` | Automated trading strategies | Yes | Yes | Yes | Yes | High | High | `runtime/finance` |
| **we4free-web** | `we4free_website/` | Public mental‑health resource site | No (static) | Yes | Minimal | No | High (public) | Low (informational) | `public/site` |
| **we4free-mesh** | `we4free_global/` (mesh‑coordinator.js, etc.) | PWA builder, mesh networking, health signals | Yes (Node) | Yes | Minimal | Partial (API deps) | Medium‑High (public deployment) | Medium (health claims) | `public/mesh` |
| **medical-demos** | `medical/`, `phase-6/medical_data_poc/` | Medical multi‑agent demos, synthetic data | Yes | Yes | Yes | Partial | Low (internal only) | High (PHI/sensitivity) | `demo/medical` |
| **shared-infra** | Extracted repo `shared-infra/` | Shared CI, scripts, utils | Minimal | Yes | Yes | No | Low | Low | `infra/shared` |
| **federation-creative** | Extracted repo `federation-creative/` | Creative simulations / federation game | Yes (HTML/JS/Python) | Yes | Yes | No | Low | Low | `demo/creative` |
| **connection-bridge** | Extracted repo `connection-bridge/` | Netlify bridge / serverless receive | Yes (Node) | Yes | Minimal | No | Medium (public endpoint) | Low | `infra/bridge` |
| **governance-local-operational-docs** | `AGENTS.md`, `SAFETY_INVARIANTS.md`, `docs/` | Operational governance docs; NOT constitutional | No | Yes | No | No | Low | Low | `docs/operational` |
| **compact-continuity** | `core/continuity_*.js`, `tests/`, `COMPACT_*` docs | Continuity decision machinery (inert) | Yes (inert) | Yes | Yes | No (inert) | Low | Low | `policy/compact_continuity` |
| **assistant-sync / handoff** | `ASSISTANT_SYNC_PACKET.md`, `PHASE1_EXECUTION_LOG.md` | Assistant handoff & evidence index | No | Yes | No | No | Low | Low | `docs/handoff` |
| **tests** | `tests/`, `PHASE1_EXECUTION_LOG.md` | Test suites for core, continuity, etc. | No | Yes | Yes | N/A | Low | Low | `tests` |
| **scripts/tools** | `scripts/`, `tools/`, `ci/` | Helper utilities for devops & operations | Minimal | Yes | Yes | No | Low | Low | `infra/scripts` |
| **unknown/quarantine** | Various unclassified files or experiments | Unreviewed content | Variable | Variable | Variable | Variable | Variable | Variable | `quarantine` |

--

## 4. Graph Classification Proposal

For each domain, propose metadata to be used by Library/Nexus Graph:

| Domain | governance_layer | authority_depth | bridge_state | enforcement_reachability | contradiction_kind | artifact_type |
|--------|------------------|-----------------|--------------|--------------------------|-------------------|---------------|
| freeagent-core | lattice-facing (operational) | shallow (runtime) | internal | none (no enforcement) | operational vs constitutional | runtime_component |
| cockpit-ui | lattice-facing (operational) | shallow | internal | none | informational | ui_component |
| agent-runtime | lattice-facing (operational) | shallow | internal | none (inert) | none | runtime_component |
| trading-bot / finance | lattice-facing | deep (financial risk) | internal | none runtime gate | financial_contradiction | runtime_component |
| we4free-web | public | surface | external (public site) | none | display | public_site |
| we4free-mesh | public | surface | external (mesh) | none | display | public_mesh |
| medical-demos | public/lattice-facing | deep (PHI) | internal | none | compliance_risk | demo |
| shared-infra | infra | shallow | internal | none | infra_risk | infra_component |
| federation-creative | public | shallow | external (game/sim) | none | display | demo |
| connection-bridge | infra | shallow | external (bridge) | none | infra_risk | infra_component |
| governance-local-operational-docs | lattice | shallow | internal | none | governance_semantic | doc |
| compact-continuity | lattice (policy) | shallow (inert) | internal | none | policy_none | policy_doc |
| assistant-sync | lattice (handoff) | shallow | internal | none | handoff | handoff_doc |
| tests | lattice (verification) | shallow | internal | none | test | test_suite |
| scripts/tools | infra | shallow | internal | none | infra | script |

Note: `governance_layer` indicates where authority/law sits (lattice). `authority_depth` indicates potential impact depth. `bridge_state` = internal/external. `enforcement_reachability` = whether this component can enforce constraints (none in FreeAgent). `contradiction_kind` is a suggested tag for the Nexus Graph.

--

## 5. Cross‑Boundary Edges

| From → To | Relationship type | Evidence path | Risk | Edge category |
|-----------|-------------------|---------------|------|---------------|
| FreeAgent → 4‑lane lattice | defers to / constrained by | `docs/DUAL_VERIFICATION_PROTOCOL.md`, `GOVERNANCE_LAYER_SPEC.md`, `AGENTS.md` header | Low (correctness of interpretation) | semantic/governance |
| FreeAgent → Deliberate-AI-Ensemble | public archive / research site; historical commits | `session_checkpoint.md`, `deliberateensemble.works` references | Low (archive drift) | historical/public |
| FreeAgent → WE4Free public site | runtime may push to public site (deploy script) | `deploy_website.ps1`, `we4free_website/` content | Medium (public content integrity) | deployment/publication |
| FreeAgent → shared-infra | dependency (package) | `shared-infra/package.json`, imports if added | Low (dependency integrity) | package |
| FreeAgent → federation-creative | no runtime dependency (extracted) | none | Low | independent |
| FreeAgent → connection-bridge | no runtime dependency (extracted) | none | Low | independent |
| FreeAgent → medical | potential data/control dependencies (internal) | `medical/` imports core modules in local tests | Medium (PHI/compliance) | internal_coupling |
| FreeAgent → Nexus Graph / Library | self‑report (this doc) | `FREEAGENT_TOPOLOGY_REPORT_FOR_LIBRARY.md`, evidence index | Low (misclassification) | semantic/report |

--

## 6. Enforcement Reality

Summary from `FREEAGENT_ENFORCEMENT_REALITY_REGISTER.md`:

- No controls are marked **ENFORCED** because none have a runtime call site, execution trace, blocked failure case, and bypass analysis.
- Compact phenotype continuity gate has **inert tested machinery** but no runtime hook or enabled feature flag.
- Autonomous constraint discovery is **candidate/advisory** — ratification requires explicit lattice approval.
- Governance docs are **operational references only**; constitutional authority remains in the lattice.

Conclusion: FreeAgent currently has **zero live enforcement** of lattice‑level constraints. All enforcement‑related code is either inert, disabled, or absent.

--

## 7. Extraction Readiness

| Domain | Status |
|--------|--------|
| shared-infra | **already extracted** (Phase 1) |
| federation-creative | **already extracted** (Phase 1) |
| connection-bridge | **already extracted** (Phase 1) |
| freeagent-core | keep in FreeAgent (runtime) |
| cockpit-ui | keep in FreeAgent (runtime) |
| agent-runtime | keep in FreeAgent (runtime) |
| trading-bot / finance | keep in FreeAgent (runtime) |
| we4free-web | keep in FreeAgent (public site) |
| we4free-mesh | keep in FreeAgent (mesh) |
| medical-demos | **blocked by safety/compliance** (PHI audit required) |
| governance-local-operational-docs | keep in FreeAgent (operational) |
| compact-continuity | keep in FreeAgent (inert policy) |
| assistant-sync / handoff | keep in FreeAgent (documentation) |
| tests | keep in FreeAgent (tests) |
| scripts/tools | keep in FreeAgent (scripts) |
| unknown/quarantine | **quarantine** — needs review |

--

## 8. Library Review Requests

1. Which domains in this report should become **Nexus subdomains** (i.e., carry meaning in the Nexus Graph)?
2. Which listed **edges** need verification by Library before being accepted into the meaning layer?
3. For artifacts that are both **evidence and display** (e.g., `session_checkpoint.md`, mesh visualizations), which should be treated as evidence, which as display, and which as authority?
4. Which FreeAgent nodes should remain marked `application_adjacent` (i.e., not part of the constitutional graph but allowed in the application layer)?
5. Does Library require additional artifact evidence (e.g., signed manifests) before ratifying any FreeAgent‑originated meaning?
6. Are there any proposed `contradiction_kind` values in this report that Library rejects or renames?
7. For **medical-demos**, does Library require a specific PHI‑handling proof before allowing any edge into the meaning layer?
8. Any recommended changes to the **governance_local_operational_docs** classification to ensure they are not accidentally treated as constitutional?

--

*End of self‑report. Library verification required before inclusion in Nexus Graph meaning layer.*