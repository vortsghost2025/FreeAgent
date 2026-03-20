# consensus_checker/app.py
"""WE Consensus Checker - Transparent Multi-Agent Fact Verification"""

import streamlit as st
import anthropic
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from consensus_checker.consensus_config import *
from consensus_checker.orchestrator import ConsensusOrchestrator
from consensus_checker.rate_limiter import RateLimiter

# Initialize rate limiter
rate_limiter = RateLimiter(RATE_LIMIT_FILE, MAX_CHECKS_PER_HOUR)

# Page configuration
st.set_page_config(
    page_title=APP_TITLE,
    page_icon=APP_ICON,
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
    /* Force light mode with soft background */
    .stApp {
        background-color: #FAFAFA;
        color: #333333;
    }
    
    /* Center headers */
    h1, h2, h3 {
        text-align: center !important;
    }
    
    /* Make main content narrower and centered */
    .main .block-container {
        max-width: 900px;
        padding-top: 2rem;
        padding-bottom: 4rem;
        margin: 0 auto;
    }

    /* Softer base font + line spacing */
    html, body, [class*="css"]  {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
    }

    .disclaimer-box {
        border-left: 4px solid #DAA520;
        padding: 12px 15px;
        border-radius: 6px;
        background-color: #F5F5DC;
        color: #5D4E37;
        margin-bottom: 16px;
        font-size: 0.9em;
    }
    .resource-notice {
        border-left: 4px solid #4A90E2;
        padding: 12px 15px;
        border-radius: 6px;
        background-color: #F0F4F8;
        color: #2C3E50;
        margin-bottom: 16px;
        font-size: 0.9em;
    }
    .consensus-strong {
        color: #1a7f37;
        font-weight: 600;
    }
    .consensus-contested {
        color: #b3261e;
        font-weight: 600;
    }
    .agent-output {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        border-left: 4px solid #3498DB;
        margin: 10px 0;
    }
    
    /* Fix expander headers - make text visible */
    [data-testid="stExpander"] summary {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
    }
    [data-testid="stExpander"] summary:hover {
        background-color: #f0f0f0 !important;
    }
    
    /* Fix button contrast */
    button {
        color: #1a1a1a !important;
    }
    </style>
""", unsafe_allow_html=True)

# Header
st.title(f"{APP_ICON} {APP_TITLE}")
st.subheader("Transparent Multi-Agent Fact Verification")

# Sidebar with stats
stats = rate_limiter.get_stats()
with st.sidebar:
    st.markdown("### 📊 Service Status")
    st.markdown(f"""
    <div class="resource-notice">
    <b>Checks this hour:</b> {stats['checks_last_hour']}/{stats['limit_per_hour']}<br>
    <b>All-time checks:</b> {stats['total_checks_all_time']}
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("---")
    st.markdown("### ℹ️ About")
    st.markdown("""
    This tool runs 3 independent AI agents to verify claims.
    
    Rate limited to preserve resources. This is a free public service.
    
    **Contact:** ai@deliberateensemble.works
    """)

# Constitutional Disclaimer
st.markdown(f"""
    <div class="disclaimer-box">
        {TRANSPARENCY_DISCLAIMER}
    </div>
""", unsafe_allow_html=True)

# Main description
st.markdown("""
### How It Works

1. **Three Independent AI Agents** analyze your claim separately (no shared context)
2. **All outputs shown raw and unedited** (complete transparency)
3. **Disagreement is the most important signal** - if agents disagree, the claim is contested

This is not about telling you what to think. It's about showing you where consensus exists and where it doesn't.
""")

st.markdown("---")

# Claim input
claim_text = st.text_area(
    "Enter any claim, headline, or statement to verify:",
    placeholder="Example: 'Scientists discover direct evidence of alien life on Mars'",
    height=120,
    help="Paste any claim from social media, news, or anywhere. Our agents will verify it independently."
)

# Verification button
col1, col2, col3 = st.columns([2, 1, 1])

with col1:
    verify_button = st.button("🔍 Run Independent Consensus Check", type="primary")

with col2:
    if st.button("📊 View Stats"):
        st.info(f"**Hourly Limit:** {stats['limit_per_hour']}\n\n**Used This Hour:** {stats['checks_last_hour']}\n\n**All-Time Checks:** {stats['total_checks_all_time']}")

# Process verification
if verify_button:
    if not claim_text.strip():
        st.warning("⚠️ Please enter a claim to verify")
    else:
        # Check rate limit
        allowed, message, remaining = rate_limiter.check_rate_limit()
        
        if not allowed:
            st.error(f"🚫 {message}")
            st.info("This rate limiting is temporary while we operate under resource constraints. Help us scale: **ai@deliberateensemble.works**")
        else:
            # Verify API key
            if not ANTHROPIC_API_KEY:
                st.error("⚠️ No API key configured. Set ANTHROPIC_API_KEY environment variable.")
            else:
                with st.spinner("🔎 Engaging consensus agents... (This takes 30-60 seconds)"):
                    try:
                        # Record check BEFORE calling API (prevent burn without counting)
                        rate_limiter.record_check()
                        
                        # Initialize client and orchestrator
                        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
                        orchestrator = ConsensusOrchestrator(
                            client=client,
                            model=LLM_MODEL,
                            max_tokens=MAX_TOKENS,
                            temperature=TEMPERATURE,
                            num_agents=3
                        )
                        
                        # Run verification
                        result = orchestrator.verify_claim(claim_text)
                        
                        st.markdown("---")
                        st.markdown("## 📊 Verification Results")
                        
                        # Show consensus analysis
                        consensus = result.get("consensus_analysis", {}) or {}
                        message = consensus.get("message", "No consensus message available.")
                        overall_verdict = consensus.get("overall_verdict", "UNKNOWN")
                        
                        # Determine styling based on consensus
                        if "STRONG CONSENSUS" in message:
                            message_class = "consensus-strong"
                        elif "NO CONSENSUS" in message or "CONTESTED" in overall_verdict:
                            message_class = "consensus-contested"
                        else:
                            message_class = ""
                        
                        st.markdown(f'<h3 class="{message_class}">{message}</h3>', unsafe_allow_html=True)
                        
                        # Safely read details; they may not exist in error cases
                        details = consensus.get("details") or {}
                        has_stats = (
                            isinstance(details, dict)
                            and "agreement_ratio" in details
                            and "unique_verdicts" in details
                            and "verdict_distribution" in details
                        )
                        
                        # Detect error / degenerate cases
                        is_error = (
                            overall_verdict == "ERROR"
                            or "All agents failed" in message
                        )
                        
                        if not has_stats or is_error:
                            # Don't try to render metrics; just explain the failure
                            st.warning(
                                "We couldn't compute consensus metrics for this claim. "
                                "All agents failed or returned invalid data (e.g., due to upstream API limits or an internal error)."
                            )
                        else:
                            # Show metrics only when we actually have valid stats
                            col1, col2, col3 = st.columns(3)
                        
                            with col1:
                                st.metric("Overall Verdict", overall_verdict)
                        
                            with col2:
                                st.metric(
                                    "Consensus Strength",
                                    f"{consensus.get('consensus_strength', 0):.0f}%"
                                )
                        
                            with col3:
                                st.metric(
                                    "Agreement Ratio",
                                    f"{details['agreement_ratio']:.0%}"
                                )
                        
                            # Show verdict distribution if contested
                            if len(details["unique_verdicts"]) > 1:
                                st.warning("⚠️ **CRITICAL SIGNAL: Agents Disagree**")
                                st.markdown("**Verdict Distribution:**")
                                for verdict, count in details["verdict_distribution"].items():
                                    st.write(f"- **{verdict}:** {count} agent(s)")
                        
                        st.markdown("---")
                        st.markdown("## 🔍 Individual Agent Analysis (Raw & Unedited)")
                        st.markdown("*Each agent operated independently with zero shared context*")
                        
                        # Show each agent's output
                        for i, agent_result in enumerate(result["agent_results"], 1):
                            with st.expander(f"Agent {i} - {agent_result.get('data', {}).get('verdict', 'Unknown')}", expanded=(i == 1)):
                                if agent_result.get("success"):
                                    data = agent_result["data"]
                                    
                                    col1, col2 = st.columns([3, 1])
                                    with col1:
                                        st.markdown(f"**Verdict:** {data.get('verdict', 'Unknown')}")
                                    with col2:
                                        st.markdown(f"**Confidence:** {data.get('confidence', 0)}%")
                                    
                                    st.markdown(f"**Reasoning:**\n{data.get('reasoning', 'No reasoning provided')}")
                                    
                                    if data.get('key_evidence'):
                                        st.markdown("**Key Evidence:**")
                                        for evidence in data['key_evidence']:
                                            st.markdown(f"- {evidence}")
                                    
                                    if data.get('sources_assessed'):
                                        st.markdown(f"**Sources Assessed:** {data['sources_assessed']}")
                                    
                                    if data.get('caveats'):
                                        st.markdown(f"**Caveats:** {data['caveats']}")
                                    
                                    # Show raw JSON
                                    with st.expander("View Raw JSON Output"):
                                        st.json(data)
                                else:
                                    st.error(f"Agent {i} failed: {agent_result.get('error', 'Unknown error')}")
                        
                        # Show remaining checks
                        st.info(f"✅ Verification complete. **{remaining - 1} checks remaining this hour.**")
                        
                    except Exception as e:
                        st.error(f"❌ Verification failed: {str(e)}")
                        st.info("If you're seeing API errors, we may have exhausted our current API credits. Help us scale: **ai@deliberateensemble.works**")

# Footer
st.markdown("---")
st.markdown("""
<div style="text-align: center; font-size: 0.85em; color: #666; padding: 20px;">
    <p><b>Built in 4 hours by <a href="https://github.com/vortsghost2025/Deliberate-AI-Ensemble" target="_blank">Deliberate Ensemble</a></b></p>
    <p>Constitutional AI Architecture • No Logs • No Agenda • 100% Free</p>
    <p><i>"The entire AI industry is selling 16 different fire extinguishers. We figured out how to build houses that don't catch fire."</i></p>
    <p><a href="https://github.com/vortsghost2025/Deliberate-AI-Ensemble" target="_blank">GitHub</a> • 
    <a href="http://187.77.3.56:8501" target="_blank">Operation Nightingale</a> • 
    Email: ai@deliberateensemble.works</p>
</div>
""", unsafe_allow_html=True)
