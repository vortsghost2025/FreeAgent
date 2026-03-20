# consensus_checker/config.py
"""Configuration for WE Consensus Checker"""

import os
from pathlib import Path

# API Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Rate Limiting Configuration
MAX_CHECKS_PER_HOUR = 20  # Conservative to preserve API credits
CHECK_COOLDOWN_SECONDS = 180  # 3 minutes between checks per user

# Application Configuration
APP_TITLE = "WE Consensus Checker"
APP_ICON = "🔎"
PORT = 8502

# Model Configuration
LLM_MODEL = "claude-3-haiku-20240307"  # Fast and cost-effective
MAX_TOKENS = 800
TEMPERATURE = 0.3  # Lower temperature for more consistent fact-checking

# Paths
BASE_DIR = Path(__file__).parent
RATE_LIMIT_FILE = BASE_DIR / "rate_limits.json"

# Constitutional Principles
TRANSPARENCY_DISCLAIMER = """
⚠️ **CONSTITUTIONAL TRANSPARENCY**
- This tool uses AI to assess claims from multiple independent perspectives
- All agent outputs shown raw and unedited
- Disagreement between agents is a critical signal, not a failure
- No data is stored, logged, or tracked. Ever.
- This is not a replacement for critical thinking or trusted human fact-checkers
"""

RESOURCE_NOTICE = """
🚧 **ALPHA RELEASE - RATE LIMITED**
We are currently operating under API credit constraints. 
Verifications limited to {max_checks} per hour to conserve resources.

If you can help scale this tool: **ai@deliberateensemble.works**
"""
