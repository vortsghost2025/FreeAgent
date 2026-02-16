# Deliberate AI Ensemble - Universal Scientific Computing Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Domains: 3](https://img.shields.io/badge/Domains-3-blue.svg)](#supported-domains)
[![Architecture: Validated](https://img.shields.io/badge/Architecture-Validated-green.svg)](ARCHITECTURE_VALIDATION.md)

> **A domain-agnostic distributed computing platform for scientific research.**
> Built from a trading bot in 27 days. Now powering genomics, evolution, and climate science.

---

## 🚀 What This Is

A universal platform that runs **completely different scientific workflows** using the **same infrastructure**:

- 🧬 **Genomics** - GWAS analysis, variant calling, federated learning
- 🧬 **Evolution** - Phylogenetic trees, population genetics, selection detection
- 🌍 **Climate** - Emissions modeling, scenario projections, impact assessment

**One architecture. Multiple domains. Zero modifications to core system.**

---

## ⚡ Quick Start

### Prerequisites
- Node.js 16+ (for JavaScript modules)
- Modern web browser
- Git

### Run Your First Workflow

```bash
# Clone the repository
git clone https://github.com/vortsghost2025/Deliberate-AI-Ensemble.git
cd Deliberate-AI-Ensemble

# Open the genomics UI in your browser
# Serves from local IIS: http://localhost/genomics-ui.html

# Click "Run GWAS Analysis" - see results in 1-2 seconds
```

**Note**: Currently requires local web server setup. See [QUICKSTART.md](QUICKSTART.md) for full setup *(coming soon)*.

---

## 🎯 Why This Matters

### The Problem
Most scientific computing is **siloed**:
- Every lab builds custom pipelines
- Every domain reinvents the wheel
- No code reuse across fields
- Duplicated effort everywhere

### The Solution
**One architecture that handles all domains:**

```
Universal Infrastructure (653 lines - NEVER changes)
├── Task Queue - Distributed coordination
├── Swarm Coordinator - Agent lifecycle
└── Map/Reduce Engine - Parallel computation

Domain Layer (3,501 lines - domain-specific)
├── Genomics agents & workflows
├── Evolution agents & workflows
└── Climate agents & workflows
```

**Reuse Ratio: 5.4:1** = 84% efficiency when adding new domains

---

## 🏗️ Architecture

### Universal Patterns

Every scientific workflow follows the same structure:

1. **Decompose** problem into parallel tasks (map)
2. **Process** tasks independently
3. **Aggregate** results (reduce)

This pattern works for:
- Variant calling across samples → aggregate statistics
- Bootstrap phylogenetic trees → consensus tree
- Regional climate simulations → global projections

### Core Components

| Component | Purpose | Lines of Code |
|-----------|---------|---------------|
| `task-queue.js` | Task lifecycle management | 286 |
| `swarm-coordinator.js` | Agent registry & routing | 189 |
| `distributed-compute.js` | Map/reduce orchestration | 178 |
| **Total Infrastructure** | **Domain-agnostic core** | **653** |

**This layer never changes when adding new domains.**

---

## 🧬 Supported Domains

### 1. Genomics
**Files**: `genomics-agent-roles.js`, `genomics-workflows.js`

**Workflows**:
- **GWAS Analysis** - Genome-wide association studies with map/reduce
- **Variant Calling Pipeline** - Sequence → Variants → Clinical prioritization
- **Federated Learning** - Privacy-preserving distributed model training

**Validated Results**:
- 50 samples processed in 1.3 seconds
- Statistically valid p-values and effect sizes
- Real GWAS workflow patterns

### 2. Evolutionary Biology
**Files**: `evolution-agent-roles.js`, `evolution-workflows.js`

**Workflows**:
- **Phylogenetic Analysis** - Bootstrap phylogenetic trees (Newick format)
- **Population Structure** - FST matrices, admixture analysis
- **Selection Scan** - Sliding window dN/dS, positive/purifying selection
- **Molecular Clock** - Divergence time estimation

**Agent Roles**:
- Phylogenetic tree construction
- Population genetics (FST, heterozygosity)
- Selection pressure detection
- Ancestral state reconstruction

### 3. Climate Science
**Files**: `climate-agent-roles.js`, `climate-workflows.js`

**Workflows**:
- **Emissions Inventory** - Regional emissions across sectors (energy, transport, industry)
- **Climate Projection** - Multi-scenario projections (RCP 2.6, 4.5, 6.0, 8.5)
- **Impact Assessment** - Multi-sector vulnerability analysis
- **Mitigation Comparison** - Compare mitigation strategies globally

**Agent Roles**:
- Emissions modeling & carbon cycle
- Climate simulation (temperature, precipitation)
- Impact assessment (sea level, ecosystems, economics)
- Mitigation planning & adaptation strategies

---

## 📊 Validated Performance

| Metric | Result |
|--------|--------|
| **GWAS Workflow** | 50 samples → 1.3 seconds |
| **Domains Validated** | 3 (genomics, evolution, climate) |
| **Horizontal Scaling** | 4+ workers per domain |
| **Privacy Compliance** | Federated learning built-in |
| **Code Reuse** | 5.4:1 ratio (84% efficiency) |

See [ARCHITECTURE_VALIDATION.md](ARCHITECTURE_VALIDATION.md) for comprehensive proof.

---

## 🚀 Adding New Domains

The architecture is **proven to be universal**. Adding a new domain requires:

### 1. Define Agent Roles
```javascript
const NewDomainAgentRole = {
  SPECIALIST_1: 'specialist-1',
  SPECIALIST_2: 'specialist-2',
  MAP_WORKER: 'map-worker'
};
```

### 2. Implement Agents
```javascript
class SpecialistAgent extends BaseAgent {
  async processTask(task) {
    // Domain-specific logic here
    return { success: true, result: ... };
  }
}
```

### 3. Create Workflows
```javascript
async runWorkflow(data) {
  // Use distributedCompute.mapReduce()
  const result = await this.distributedCompute.mapReduce(
    data, mapFn, reduceFn
  );
  return result;
}
```

**That's it.** The infrastructure handles the rest.

---

## 🧠 Planned Domains

Next targets for validation:

- **Neuroscience** - fMRI analysis, brain connectivity, cognitive modeling
- **Drug Discovery** - Ligand screening, QSAR, molecular docking
- **Materials Science** - Molecular dynamics, crystal structure prediction
- **Astrophysics** - Gravitational wave detection, stellar population synthesis

**Any domain with parallelizable tasks can plug into this architecture.**

---

## 📖 Documentation

- **[ARCHITECTURE_VALIDATION.md](ARCHITECTURE_VALIDATION.md)** - Comprehensive proof of domain-agnostic design
- **[QUICKSTART.md](QUICKSTART.md)** - Get a workflow running in 5 minutes *(coming soon)*
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guide for collaborators *(coming soon)*
- **[CLAUDE.md](CLAUDE.md)** - AI agent instructions for this codebase

---

## 🤝 Collaboration

### Open Source & Free for Humanity

💚 **If your work benefits humanity**—whether it's cancer research, climate modeling, or drug discovery—and you need computational help, reach out.

**I'll collaborate freely. No cost, no strings.**

### How to Contribute

1. **Add a new domain** - Prove the architecture in your field
2. **Enhance existing workflows** - Add features to genomics/evolution/climate
3. **Improve documentation** - Help others understand the platform
4. **Report issues** - Found a bug? Open an issue
5. **Share results** - Used this for research? Let us know!

Contact: [ai@deliberateensemble.works](mailto:ai@deliberateensemble.works)

---

## 📜 License

MIT License - See [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

Built through **human-AI collaboration**:
- **Human**: Vision, execution, validation, domain expertise
- **AI (Claude Sonnet 4.5)**: Architecture, code generation, pattern recognition

**This platform proves what's possible when humans and AI work together.**

---

## 📈 Timeline

- **Jan 20, 2026**: Started building a multi-agent trading bot
- **~Feb 1-5**: Pivoted to genomics (GWAS, federated learning)
- **Feb 15**: Fixed orchestrator boundary, GWAS validated
- **Feb 16**: Added evolution & climate domains, platform announced

**27 days from trading bot to universal scientific computing platform.**

---

## 🌟 Star This Repo

If you find this useful, please ⭐ star the repository to help others discover it!

---

## 🔗 Links

- **GitHub**: [https://github.com/vortsghost2025/Deliberate-AI-Ensemble](https://github.com/vortsghost2025/Deliberate-AI-Ensemble)
- **Website**: [https://deliberateensemble.works](https://deliberateensemble.works)
- **Twitter**: [@WEFramework](https://twitter.com/WEFramework)

---

*Built with ❤️ for science. Made universal by design. Available for humanity.*
