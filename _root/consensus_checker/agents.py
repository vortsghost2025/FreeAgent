# consensus_checker/agents.py
"""Constitutional consensus verification agents"""

import json
from typing import Dict, Any, Optional
from datetime import datetime

class BaseAgent:
    """Base agent with constitutional constraints"""
    
    def __init__(self, client, model: str, max_tokens: int, temperature: float):
        self.client = client
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.name = self.__class__.__name__
    
    def create_message(self, action: str, success: bool, 
                      data: Optional[Dict[str, Any]] = None, 
                      error: Optional[str] = None) -> Dict[str, Any]:
        """Create standardized agent message"""
        return {
            "agent": self.name,
            "action": action,
            "timestamp": datetime.utcnow().isoformat(),
            "success": success,
            "data": data if data is not None else {},
            "error": error
        }
    
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agent action - must be implemented by subclasses"""
        raise NotImplementedError
    
    def _call_llm(self, system_prompt: str, user_message: str) -> Optional[str]:
        """Call LLM with error handling"""
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
                temperature=self.temperature
            )
            return response.content[0].text
        except Exception as e:
            print(f"LLM call failed for {self.name}: {e}")
            return None


class VerificationAgent(BaseAgent):
    """Independent verification agent - operates in complete isolation"""
    
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        claim = input_data.get("claim")
        agent_id = input_data.get("agent_id", "Unknown")
        
        if not claim:
            return self.create_message("verify", False, error="No claim provided")
        
        system_prompt = """You are a completely independent fact verification agent. You have no affiliation with any organization, ideology, or platform. Your output will be shown raw and unedited.

Your ONLY rules:
1. Analyze this claim as critically as possible
2. State your conclusion clearly with confidence (0-100%)
3. Cite reasoning and evidence sources
4. If you cannot verify the claim, say so explicitly - NEVER GUESS
5. Be extremely skeptical of all viral claims from all sides

Output MUST be valid JSON with this structure:
{
  "verdict": "True|False|Unverified|Contested",
  "confidence": 0-100,
  "reasoning": "Your detailed analysis here",
  "key_evidence": ["Evidence point 1", "Evidence point 2"],
  "sources_assessed": "Brief source credibility assessment",
  "caveats": "Any important limitations or uncertainties"
}"""

        user_message = f"Independently verify this claim:\n\n\"{claim}\""
        
        llm_response = self._call_llm(system_prompt, user_message)
        
        if not llm_response:
            return self.create_message("verify", False, 
                                      error="Failed to get LLM response")
        
        # Try to parse JSON, fall back to raw response if needed
        try:
            data = json.loads(llm_response)
            data["agent_id"] = agent_id
            return self.create_message("verify", True, data=data)
        except json.JSONDecodeError:
            # LLM didn't return valid JSON - wrap raw response
            return self.create_message("verify", True, data={
                "agent_id": agent_id,
                "verdict": "Unverified",
                "confidence": 0,
                "reasoning": llm_response,
                "key_evidence": [],
                "sources_assessed": "Unable to parse structured response",
                "caveats": "Response not in expected JSON format"
            })


class ConsensusAnalyzer:
    """Analyzes agreement/disagreement across independent agent outputs"""
    
    @staticmethod
    def analyze_consensus(results: list) -> Dict[str, Any]:
        """
        Analyze consensus across multiple verification results
        
        Returns consolidated verdict with consensus metrics
        """
        if not results:
            return {
                "overall_verdict": "ERROR",
                "consensus_strength": 0,
                "message": "No agent results to analyze",
                "details": {}
            }
        
        # Extract verdicts and confidences
        verdicts = []
        confidences = []
        
        for result in results:
            if result.get("success") and result.get("data"):
                data = result["data"]
                verdicts.append(data.get("verdict", "Unverified"))
                confidences.append(data.get("confidence", 0))
        
        if not verdicts:
            return {
                "overall_verdict": "ERROR",
                "consensus_strength": 0,
                "message": "All agents failed to produce results",
                "details": {}
            }
        
        # Calculate consensus
        unique_verdicts = set(verdicts)
        most_common_verdict = max(set(verdicts), key=verdicts.count)
        agreement_count = verdicts.count(most_common_verdict)
        agreement_ratio = agreement_count / len(verdicts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        # Determine consensus strength and message
        if len(unique_verdicts) == 1:
            # Perfect consensus
            message = f"✅ STRONG CONSENSUS: All {len(verdicts)} agents agree"
            consensus_strength = avg_confidence
            
        elif agreement_ratio >= 0.66:
            # Majority consensus
            message = f"⚠️ MAJORITY CONSENSUS: {agreement_count}/{len(verdicts)} agents agree"
            consensus_strength = avg_confidence * 0.7
            
        else:
            # No consensus - critical signal
            message = f"🚨 NO CONSENSUS: Agents strongly disagree ({len(unique_verdicts)} different verdicts)"
            consensus_strength = 0
            most_common_verdict = "CONTESTED"
        
        return {
            "overall_verdict": most_common_verdict,
            "consensus_strength": consensus_strength,
            "message": message,
            "details": {
                "agent_count": len(verdicts),
                "unique_verdicts": list(unique_verdicts),
                "agreement_ratio": agreement_ratio,
                "average_confidence": avg_confidence,
                "verdict_distribution": {v: verdicts.count(v) for v in unique_verdicts}
            }
        }
