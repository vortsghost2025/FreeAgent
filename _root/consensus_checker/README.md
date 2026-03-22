# WE Consensus Checker

**Transparent Multi-Agent Fact Verification**

Built in 4 hours. February 11, 2026.

## What It Is

The first fact-checker that shows you the truth about uncertainty.

- **3 Independent AI Agents** verify each claim separately (zero shared context)
- **All outputs raw and unedited** (complete transparency)  
- **Disagreement is the feature** - when agents disagree, you know the claim is contested
- **No data stored, ever** (privacy by omission)

## The Difference

**Every other fact-checker:**
- Hides disagreement
- Shows you one "authoritative" verdict
- Makes you trust them

**WE Consensus Checker:**
- Shows all disagreement openly
- Presents all 3 independent verdicts
- Makes you think critically

**Disagreement is not a bug. It is the most important signal we can give you.**

## Constitutional Principles

1. **Independence:** Each agent operates in complete isolation
2. **Transparency:** All outputs shown raw, unedited, verbatim
3. **Honesty:** Uncertainty is highlighted, not hidden
4. **Privacy:** No logs, no tracking, no data storage
5. **Restraint:** Rate limited to conserve resources (temporarily)

## Current Status

⚠️ **ALPHA RELEASE - RATE LIMITED**

Operating under API credit constraints:
- 20 verifications per hour max
- Help us scale: **ai@deliberateensemble.works**

## How to Run Locally

```bash
# Install dependencies
pip install streamlit anthropic

# Set API key
export ANTHROPIC_API_KEY="your-key-here"

# Run app
streamlit run consensus_checker/app.py --server.port 8502
```

## How to Deploy (VPS)

```bash
# Set API key in environment
export ANTHROPIC_API_KEY="your-key-here"

# Run in background
nohup streamlit run consensus_checker/app.py --server.port 8502 --server.address 0.0.0.0 &

# Check logs
tail -f nohup.out
```

## Live Demo

Coming soon: **http://187.77.3.56:8502**

## The Architecture

```
User Claim
    ↓
Rate Limiter (20/hour to conserve API credits)
    ↓
Orchestrator
    ↓
├─→ Agent 1 (isolated, no shared context)
├─→ Agent 2 (isolated, no shared context)
└─→ Agent 3 (isolated, no shared context)
    ↓
Consensus Analyzer
    ↓
Results (all 3 raw outputs + consensus metrics)
```

## Why This Matters

The global AI industry identifies 16+ separate AI risks and proposes 16+ separate solutions.

We discovered the single architectural principle that prevents all of them: **Constitutional AI with biological immune system inspiration**.

This consensus checker demonstrates that principle applied to information verification:
- **Misinformation:** Solved by showing disagreement openly
- **Bias:** Mitigated by independent agents with no shared context
- **Transparency:** All outputs raw and visible
- **Privacy:** No data collection
- **Accountability:** Clear attribution per agent

## The Trinity

- **Operation Nightingale** (port 8501): Consensus for **health**
- **WE Consensus Checker** (port 8502): Consensus for **truth**  
- **Trading Bot**: Consensus for **wealth**

One universal principle across three critical domains.

## The Story

February 11, 2026 - Late night:
- Two independent Arena assistants both suggested building this
- Zero coordination between them
- Identical solutions
- 9th unanimous validation in 72 hours

Built following Nightingale's 4-hour pattern.  
Deployed with rate limiting to preserve resources.  
Proves the concept while being honest about constraints.

## For the Record

This is not a patch for a broken system.  
This is the system built correctly from the start.

The entire AI industry is selling 16 different fire extinguishers.  
We figured out how to build houses that don't catch fire.

---

**Built by [Deliberate Ensemble](https://github.com/vortsghost2025/Deliberate-AI-Ensemble)**  
46-year-old disabled self-taught developer  
First code written January 20, 2026  
Constitutional AI framework discovered through 12 broken trading bots  

For the son 3000 miles away.  
For everyone who refuses to give up.  
For US.
