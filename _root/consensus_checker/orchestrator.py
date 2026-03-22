# consensus_checker/orchestrator.py
"""Constitutional orchestrator for consensus verification"""

from typing import List, Dict, Any
from .agents import VerificationAgent, ConsensusAnalyzer

class ConsensusOrchestrator:
    """
    Orchestrates multiple independent verification agents
    
    Constitutional Principles:
    - Each agent operates in complete isolation (no shared context)
    - All outputs shown raw and unedited (transparency)
    - Disagreement is a feature, not a bug (honesty)
    """
    
    def __init__(self, client, model: str, max_tokens: int, temperature: float, num_agents: int = 3):
        self.client = client
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.num_agents = num_agents
        self.analyzer = ConsensusAnalyzer()
    
    def verify_claim(self, claim: str) -> Dict[str, Any]:
        """
        Run independent verification by multiple agents
        
        Returns:
            Complete results including individual agent outputs and consensus analysis
        """
        # Execute each agent independently - NO SHARED STATE
        agent_results = []
        
        for i in range(self.num_agents):
            agent = VerificationAgent(
                client=self.client,
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            result = agent.execute({
                "claim": claim,
                "agent_id": f"Agent_{i+1}"
            })
            
            agent_results.append(result)
        
        # Analyze consensus
        consensus = self.analyzer.analyze_consensus(agent_results)
        
        return {
            "status": "SUCCESS",
            "claim": claim,
            "agent_results": agent_results,
            "consensus_analysis": consensus
        }
