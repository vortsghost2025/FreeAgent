# RUNTIME_EXECUTION_LAYER.md  
**Role:** Operational substrate that makes the architecture run safely and smoothly on real hardware (16GB profile).

---

## 1. Position in the stack

- Above: **RESILIENCE_LAYER_SPEC.md** (liveness, heartbeats, retries)  
- Below: **COCKPIT_ORCHESTRATION_LAYER.md** (control plane, UI, agent wiring)

**Runtime Layer = "How this whole thing actually behaves under load."**

---

## 2. Responsibilities

- **Resource orchestration:** RAM, CPU, processes, services  
- **Phased execution:** don't run everything at once; schedule modes over time  
- **Local vs cloud routing:** when to use LM Studio vs Groq/Together/etc.  
- **Context shaping:** truncation, sliding windows, memory layer loading  
- **Process hygiene:** port killers, zombie cleanup, deterministic resets  
- **Runtime telemetry:** RAM monitoring, thresholds, cockpit display  
- **Operator ergonomics:** keep the machine usable while the swarm runs

---

## 3. Core concepts

### 3.1 Phased