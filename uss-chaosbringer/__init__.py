"""
USS Chaosbringer - Starship Framework
Narrative-wrapped distributed systems architecture
"""

from .hull.bridge_control import get_bridge, ShipState, ProcessingMode
from .hull.warp_core import get_warp_core, ProcessingMode
from .starship_integration import get_integration

__version__ = "1.0.0-ALPHA"
__name__ = "USS CHAOSBRINGER"

__all__ = [
    'get_bridge',
    'get_warp_core',
    'get_integration',
    'ShipState',
    'ProcessingMode'
]
