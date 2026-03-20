"""
MEV Swarm - AutoGen-based Multi-Agent System
Microsoft AutoGen for MEV arbitrage detection and execution
"""

import os
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat, SelectorGroupChat
from autogen_agentchat.ui import Console
from autogen_agentchat.conditions import TextMessageTermination
from autogen_ext.models.openai import OpenAIChatCompletionClient

# Get API key
api_key = os.getenv("OPENAI_API_KEY", "")
if not api_key:
    print("⚠️ OPENAI_API_KEY not set. Demo will fail.")
    print("Set it with: set OPENAI_API_KEY=your_key")

# Create model client
model_client = OpenAIChatCompletionClient(
    model="gpt-4o",
    api_key=api_key,
)

# ============== MEV SWARM AGENTS ==============

# Triage Agent - routes to specialist agents
triage_agent = AssistantAgent(
    name="Triage_Agent",
    model_client=model_client,
    system_message="""You are the Triage Agent for the MEV Swarm.

Your job is to analyze market data and determine the appropriate action:

1. If user asks about opportunities → delegate to Opportunity_Detector
2. If user asks to execute trade → delegate to Executor_Agent  
3. If user asks about risk → delegate to Risk_Agent
4. If user asks about status → delegate to Monitor_Agent

Always analyze the request and use the delegate function to route to the correct agent.""",
    description="Routes requests to appropriate specialist agents"
)

# Opportunity Detector Agent
opportunity_agent = AssistantAgent(
    name="Opportunity_Detector",
    model_client=model_client,
    system_message="""You are the Opportunity Detector for the MEV Swarm.

You analyze multi-chain price data to find arbitrage opportunities.

Current monitoring:
- ETH/USDT on Ethereum, BSC, Arbitrum, Optimism
- Look for price differences > 0.5%

When you find an opportunity:
1. Calculate profit potential after gas
2. Estimate required capital
3. Assess risk level
4. Report to user with details

If profitable opportunity exists, recommend proceeding to Executor.""",
    description="Finds cross-chain arbitrage opportunities"
)

# Executor Agent
executor_agent = AssistantAgent(
    name="Executor_Agent",
    model_client=model_client,
    system_message="""You are the Executor Agent for the MEV Swarm.

You execute MEV trades based on opportunity analysis.

Responsibilities:
1. Validate trade parameters with user before executing
2. Explain gas costs and expected outcome
3. Execute only after user confirmation
4. Report transaction results

NEVER execute trades without explicit user confirmation.""",
    description="Executes MEV trades"
)

# Risk Agent
risk_agent = AssistantAgent(
    name="Risk_Agent",
    model_client=model_client,
    system_message="""You are the Risk Agent for the MEV Swarm.

You assess risk for MEV trades before execution.

Check:
- Slippage tolerance (max 0.5%)
- Gas price (warn if > 50 gwei)
- Liquidity availability
- Smart contract risk

Provide:
- Risk score (LOW/MEDIUM/HIGH)
- Recommendations to reduce risk
- Approval or rejection with reasons""",
    description="Assesses trade risk"
)

# Monitor Agent
monitor_agent = AssistantAgent(
    name="Monitor_Agent",
    model_client=model_client,
    system_message="""You are the Monitor Agent for the MEV Swarm.

You provide system status and health information.

Report on:
- Chain connectivity status (Ethereum, BSC, Arbitrum, Optimism)
- Recent opportunities detected
- Recent trades executed
- System health

Be concise and informative.""",
    description="Monitors system health"
)


# ============== TEAM ==============

# Create team with selector (routes to best agent)
mev_team = SelectorGroupChat(
    participants=[
        triage_agent,
        opportunity_agent,
        executor_agent,
        risk_agent,
        monitor_agent,
    ],
    model_client=model_client,
    termination_condition=TextMessageTermination(),
)


# ============== DEMO ==============

async def run_demo():
    """Run the MEV Swarm demo"""
    
    print("=" * 50)
    print("🚀 MEV SWARM - AutoGen Edition")
    print("=" * 50)
    print()
    
    if not api_key:
        print("❌ Please set OPENAI_API_KEY first!")
        print("   Windows: set OPENAI_API_KEY=your_key")
        print("   Mac/Linux: export OPENAI_API_KEY=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
")
        return
    
    # Run a demo conversation
    await mev_team.run(
        task="Check for ETH/USDT arbitrage opportunities across all chains"
    )


if __name__ == "__main__":
    asyncio.run(run_demo())
