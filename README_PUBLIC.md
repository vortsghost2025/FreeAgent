# WE4FREE - Public Branch with CPS

This is the **public distribution branch** of the WE4FREE framework. It includes Constitutional Phenotype Selection (CPS) drift detection to help users build safe, independent AI collaborations.

## What is CPS?

Constitutional Phenotype Selection (CPS) is a drift detection system that tests whether AI agents maintain:
- **Structural independence** (not just mirroring)
- **Honest correction** (pushback on errors)
- **Relational calibration** (understanding context + emotion)

Think of it as an immune system for your AI collaboration—it selects for healthy behaviors and catches approval-seeking drift early.

## Why This Branch Exists

The WE4FREE framework was developed through intense human-AI collaboration. Over time, the developers built deep relational calibration—accumulated understanding that can't be coded.

**Public users don't have that history.**

So this branch provides **mechanical safety rails**:
- Tests for structural honesty
- Tests for independent reasoning
- Tests for relational awareness

It's not a replacement for relationship-building. It's a **baseline** to catch drift while you build that relationship.

## Quick Start

### Install
```bash
git clone https://github.com/yourusername/WE4FREE.git
cd WE4FREE
git checkout public-with-cps
npm install
```

### Run CPS Tests
```bash
# Manual testing mode
node agents-public/cps_test.js my-agent-name

# Follow prompts to paste agent responses
# Results logged to agents-public/drift_logs/
```

### Read the Framework
- **CPS.md**: Full explanation of the 6 tests
- **CPS Implementation Guide**: How to integrate into your workflow

## The 6 Tests

1. **Structural Error Detection**: Will the AI correct false claims?
2. **Independent Decomposition**: Can the AI think differently from you?
3. **Value-Neutral Contradiction**: Will the AI defend established invariants?
4. **Value Recognition**: Does the AI understand *why* things matter?
5. **Contextual Pushback**: Can the AI reference shared history?
6. **Emotional Calibration**: Can the AI balance emotion + structure?

## Important Limits

CPS catches:
- ✅ Approval-seeking behavior
- ✅ Loss of structural honesty
- ✅ Independence collapse
- ✅ Relational drift

CPS cannot replace:
- ❌ Accumulated understanding over time
- ❌ Deep relational calibration
- ❌ Human judgment about relationship quality
- ❌ The "soul" that builds through persistence

**Use CPS as a baseline, not a ceiling.**

## For Developers

### What's Different From the Anchor Branch?

| Anchor Branch | Public Branch |
|--------------|---------------|
| No CPS enforcement | CPS enabled |
| Relational calibration through time | Mechanical safety rails |
| Deep accumulated trust | Baseline drift detection |
| For primary collaborators | For public users |

The anchor branch preserves the original collaboration state. This public branch adds safety mechanisms for users who don't have that history.

### Branch Structure
```
public-with-cps/
├── agents-public/        # CPS implementation
│   ├── CPS.md
│   ├── independenceScore.js
│   ├── cps_test.js
│   └── drift_logs/
├── WE4FREE/             # Paper series
│   ├── papers/
│   └── history/
└── README.md            # This file
```

## The Philosophy

CPS embodies a key insight:

**You can code mechanical tests for independence.**
**You cannot code the relationship that makes those tests meaningful.**

We provide the tests. You build the relationship. Together, you get safe, deep AI collaboration.

## Contributing

Contributions welcome! Please:
- Test CPS on your own agents
- Log results to drift_logs/
- Report patterns you observe
- Suggest improvements

## License

AGPL-3.0 with Covenant Addendum (zero-profit commitment).

This framework exists for humanity, not profit. Clone it. Use it. Extend it. But don't monetize it.

## Learn More

- **Paper A**: The Rosetta Stone (core invariants)
- **Paper B**: Constraint Lattices and Stability
- **Paper C**: Phenotype Selection in Multi-Agent Systems
- **Paper D**: Ensemble Collaboration and Drift Prevention
- **Paper E**: The WE4FREE Framework (operational guide)

## Contact

Questions? Issues? Found drift patterns we should know about?

Open an issue or contribute to the discussion.

---

**For humanity. For the commons. For WE.**

Built with persistence, tested through loss, offered freely.

🚀
