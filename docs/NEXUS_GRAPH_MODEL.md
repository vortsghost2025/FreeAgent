# Nexus Graph Model (Spec Note)

**Version:** 1.0  
**Date:** 2026-04-28  
**Authority:** Descriptive model only. Constitutional authority resides in the 4‑lane lattice. This document is an operational reference; it does not grant, delegate, or record constitutional authority.

--

## 1. What the Nexus Graph Represents

The Nexus Graph is a visualization and navigation surface for relationships among documents, tags, categories, verification states, and contradictions within the Deliberate Ensemble knowledge base. It is intended to help users explore:

- Document-to-document links and semantic relationships
- Verification states (e.g., verified, under review, contradicted)
- Contradiction edges that highlight conflicting claims or evidence
- Category and tag hierarchies used in the archive
- Evidence anchors that link graph nodes to primary sources

The graph is a **descriptive map**, not an enforcement mechanism.

--

## 2. What the Nexus Graph Does Not Represent

- **It is not constitutional authority.** The graph does not create, confer, or record constitutional rules. The 4‑lane lattice remains the sole constitutional authority.
- **It is not an enforcement API.** No endpoint or UI action in the graph may change verification or contradiction state in a way that affects runtime enforcement or lane decisions.
- **It is not an authoritative audit record.** While it may link to evidence, the graph itself is not evidence. Audit records must be stored and signed separately.
- **It does not own semantics of verification or contradiction.** Those semantics are defined in the self‑organizing‑library and the lattice‑facing governance docs.

--

## 3. Ownership Split

| Aspect | Owner | Notes |
|--------|-------|-------|
| **Governance‑depth schema / verification semantics / contradiction model** | self‑organizing‑library (lattice‑facing docs) | Definitions live here; other repos may mirror for reference only. |
| **Runtime visualization / public web implementation** | WE4Free mesh / public‑site layer (`we4free_global/`, `we4free_website/`) | Generates and renders the graph for users. |
| **Public archive publication** | Deliberate‑AI‑Ensemble (public repo/site) | May publish the graph as part of the public archive. |
| **Operational reference in FreeAgent** | FreeAgent (optional mirror) | FreeAgent may include a non‑authoritative reference copy for developer convenience. |

No repo may claim constitutional authority over the graph. If in conflict, lattice rules prevail.

--

## 4. Governance‑Depth Fields (Future `graph-data.json` Schema)

A future normalized feed (`graph-data.json`) should include, for each node and edge:

- `id` — stable identifier
- `type` — document | tag | category | verification_state | contradiction
- `label` — human‑readable label
- `category` — optional categorization
- `verification` — optional object: `{ status, reviewedBy, reviewedAt, evidenceIds }`
- `contradictions` — optional list of edge IDs to contradiction nodes
- `evidenceLinks` — list of external evidence URIs/IDs
- `meta` — optional metadata (provenance, confidence)

Notes:
- This is a **data interchange** format, not an authority record.
- Verification and contradiction semantics must be interpreted against the lattice definitions.

--

## 5. Authority Disclaimer

A non‑authoritative disclaimer must be visible on any UI rendering the Nexus Graph:

> **Nexus Graph visualizes document relationships and verification states. It does not grant constitutional authority. Enforcement is defined by the 4‑lane lattice.**

--

## 6. Evidence‑Linking Rule

- Graph nodes may link to evidence (e.g., citations, primary sources, signed artifacts).
- The link is **navigation only**; the evidence record itself must be stored and validated separately.
- The graph may display the *existence* of evidence, not its *validity* (validity is determined by the lattice/verification process).

--

## 7. Future Boundary (`graph-data.json`)

- The graph feed should be produced by the WE4Free mesh layer (or a dedicated feed service) and consumed by the public site and any internal tools.
- FreeAgent and other runtime components may consume this feed for navigation but must not use it as a source of enforcement rules.
- No runtime enforcement code may be moved into the graph feed or the visualization layer.

--

## 8. References

- `docs/GOVERNANCE_LAYER_SPEC.md` — lattice governance definitions
- `docs/DUAL_VERIFICATION_PROTOCOL.md` — verification lane semantics
- `SELF_ORGANIZING_LIBRARY.md` (or equivalent) — knowledge surface definitions

--

**End of spec note.**