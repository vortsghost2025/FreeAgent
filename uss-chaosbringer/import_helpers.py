#!/usr/bin/env python3
"""
Shared import utilities for USS Chaosbringer ships
"""

import sys
import os
from dataclasses import dataclass
from typing import Dict, Any, List, Optional

# Setup path
_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)


# Define fallback DomainResult
@dataclass
class DomainResult:
    """Result from domain handler"""
    state_delta: Optional[Dict[str, Any]] = None
    domain_actions: Optional[List[Dict[str, Any]]] = None
    logs: Optional[List[str]] = None


# Try to import real DomainResult
try:
    from event_router import DomainResult as RealDomainResult
    DomainResult = RealDomainResult
except ImportError:
    pass


def get_domain_result():
    """Get DomainResult class (real or fallback)"""
    return DomainResult
