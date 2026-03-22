# Consensus Engine Spec

> Domain-agnostic. Production-grade. Deterministic.

---

## 1. Consensus Model

### 1.1 Consensus Types

| Type | Use Case | Quorum | Latency |
|------|----------|--------|---------|
| **Simple Majority** | Low-impact decisions | 50% + 1 | Low |
| **Supermajority** | Medium-impact | 66% | Medium |
| **Unanimous** | High-impact / critical | 100% | High |
| **Dual-Lane** | Adversarial verification | 2 independent | Variable |

### 1.2 Consensus Interface

```typescript
interface ConsensusEngine {
  // Propose a decision
  propose(proposal: Proposal): Promise<ConsensusResult>;
  
  // Vote on a proposal
  vote(proposalId: string, voter: string, choice: Vote): Promise<void>;
  
  // Get current consensus state
  getState(proposalId: string): ConsensusState;
  
  // Cancel a proposal
  cancel(proposalId: string, reason: string): Promise<void>;
}
```

---

## 2. Proposal Structure

### 2.1 Proposal Definition

```typescript
interface Proposal {
  id: string;
  type: ProposalType;
  payload: any;
  proposer: string;
  timestamp: string;
  ttl: number; // ms
  quorum: number; // 0-1
  voters: string[];
  votes: Map<string, Vote>;
  status: ProposalStatus;
  result?: ConsensusResult;
}

type ProposalStatus = 
  | 'pending' 
  | 'voting' 
  | 'approved' 
  | 'rejected' 
  | 'expired' 
  | 'cancelled';

type Vote = 'approve' | 'reject' | 'abstain';
```

### 2.2 Impact Levels

```typescript
interface ImpactAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    scope: number; // 0-1 how many agents affected
    reversibility: number; // 0-1 how hard to undo
    urgency: number; // 0-1 time sensitivity
    resourceCost: number; // 0-1 compute/storage cost
  };
  requiredQuorum: number;
}
```

---

## 3. Consensus Algorithms

### 3.1 Simple Majority

```typescript
async function simpleMajority(proposal: Proposal): Promise<ConsensusResult> {
  const votes = Array.from(proposal.votes.values());
  const approve = votes.filter(v => v === 'approve').length;
  const total = votes.filter(v => v !== 'abstain').length;
  
  if (total < proposal.voters.length * proposal.quorum) {
    return { approved: false, reason: 'quorum_not_met' };
  }
  
  return {
    approved: approve > total / 2,
    votes: { approve, reject: votes.length - approve, abstain: 0 },
    consensus: approve / total
  };
}
```

### 3.2 Supermajority

```typescript
async function supermajority(proposal: Proposal): Promise<ConsensusResult> {
  const votes = Array.from(proposal.votes.values());
  const approve = votes.filter(v => v === 'approve').length;
  const total = votes.filter(v => v !== 'abstain').length;
  
  // Default: 66%
  const threshold = proposal.quorum || 0.66;
  
  return {
    approved: approve / total >= threshold,
    votes: { approve, reject: votes.length - approve, abstain: 0 },
    consensus: approve / total
  };
}
```

### 3.3 Dual-Lane Consensus

```typescript
interface DualLaneProposal {
  id: string;
  lanes: {
    conservative: Proposal;
    adversarial: Proposal;
  };
  mergeStrategy: 'conservative' | 'adversarial' | 'compromise';
}

async function dualLaneConsensus(proposal: DualLaneProposal): Promise<ConsensusResult> {
  const conservative = await runConsensus(proposal.lanes.conservative);
  const adversarial = await runConsensus(proposal.lanes.adversarial);
  
  switch (proposal.mergeStrategy) {
    case 'conservative':
      return conservative.approved ? conservative : { 
        approved: false, 
        reason: 'conservative_lane_rejected',
        lanes: { conservative, adversarial }
      };
    
    case 'adversarial':
      return adversarial.approved ? adversarial : {
        approved: false,
        reason: 'adversarial_lane_rejected',
        lanes: { conservative, adversarial }
      };
    
    case 'compromise':
      // Both must agree
      return (conservative.approved && adversarial.approved) 
        ? { approved: true, lanes: { conservative, adversarial } }
        : { approved: false, reason: 'compromise_not_reached', lanes: { conservative, adversarial } };
  }
}
```

---

## 4. Voting Mechanics

### 4.1 Voting Window

```typescript
interface VotingWindow {
  proposalId: string;
  startTime: number;
  endTime: number;
  voters: string[];
  votes: Map<string, Vote>;
  status: 'open' | 'closed' | 'expired';
}

function isVotingOpen(window: VotingWindow): boolean {
  const now = Date.now();
  return window.status === 'open' && now < window.endTime;
}

function canVote(window: VotingWindow, voter: string): boolean {
  return isVotingOpen(window) && 
         window.voters.includes(voter) && 
         !window.votes.has(voter);
}
```

### 4.2 Vote Collection

```typescript
async function submitVote(
  engine: ConsensusEngine,
  proposalId: string,
  voter: string,
  vote: Vote
): Promise<VoteReceipt> {
  const state = engine.getState(proposalId);
  
  if (!canVote(state, voter)) {
    throw new Error('Cannot vote at this time');
  }
  
  await engine.vote(proposalId, voter, vote);
  
  // Check if quorum met after this vote
  const newState = engine.getState(proposalId);
  if (hasQuorum(newState)) {
    return finalizeProposal(engine, proposalId);
  }
  
  return { status: 'voting', votes: newState.votes };
}
```

---

## 5. Conflict Resolution

### 5.1 Conflict Types

```typescript
type ConflictType = 
  | 'simultaneous_proposals'
  | 'competing_proposals'
  | 'contradictory_votes'
  | 'partition_inconsistency';

interface Conflict {
  type: ConflictType;
  proposals: string[];
  detected: string;
  resolution?: Resolution;
}
```

### 5.2 Resolution Strategies

```typescript
const resolutionStrategies = {
  simultaneous: (proposals: Proposal[]): Proposal => {
    // First proposal wins (by timestamp)
    return proposals.sort((a, b) => 
      a.timestamp.localeCompare(b.timestamp)
    )[0];
  },
  
  competing: (proposals: Proposal[]): Proposal => {
    // Highest impact wins
    return proposals.sort((a, b) => 
      b.impact.score - a.impact.score
    )[0];
  },
  
  partition: (states: Map<string, any>): Proposal => {
    // Merge via last-write-wins with vector clock
    return mergeByTimestamp(states);
  }
};
```

---

## 6. Consensus Metrics

### 6.1 Tracked Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `consensus.total` | Total proposals | N/A |
| `consensus.approved` | Approved proposals | N/A |
| `consensus.rejected` | Rejected proposals | > 40% |
| `consensus.expired` | Expired proposals | > 10% |
| `consensus.avgTime` | Average consensus time | > 5s |
| `consensus.conflicts` | Conflicts detected | > 5% |
| `consensus.quorumMiss` | Quorum not met | > 15% |

---

## 7. Configuration

### 7.1 Consensus Config

```typescript
interface ConsensusConfig {
  defaultQuorum: number; // 0-1
  votingTimeout: number; // ms
  enableDualLane: boolean;
  conflictResolution: 'first' | 'highest_impact' | 'merge';
  autoFinalize: boolean;
  maxConflicts: number;
}
```

---

## Related

- [DUAL_VERIFICATION_PROTOCOL.md](./DUAL_VERIFICATION_PROTOCOL.md)
- [GOVERNANCE_LAYER_SPEC.md](./GOVERNANCE_LAYER_SPEC.md)
- [RESILIENCE_LAYER_SPEC.md](./RESILIENCE_LAYER_SPEC.md)
