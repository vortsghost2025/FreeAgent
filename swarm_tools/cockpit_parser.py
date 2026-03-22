import re
import json
from typing import Dict, Any

COCKPIT_PATTERN = re.compile(r"```json\n(.*?)\n```", re.DOTALL)


def parse_cockpit(text: str) -> Dict[str, Any]:
    """Parse a cockpit text block and return a dictionary.

    The cockpit exported by the interface may be a raw JSON object or
    embedded within markdown fences; this helper searches for a JSON
    object and loads it.
    """
    # try to extract json inside triple backticks
    match = COCKPIT_PATTERN.search(text)
    if match:
        json_str = match.group(1)
    else:
        # fallback: assume the whole string is json
        json_str = text
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"failed to decode cockpit json: {e}")
    return data


def get_metrics(cockpit: Dict[str, Any]) -> Dict[str, Any]:
    """Extract a small set of numeric metrics from the cockpit state."""
    metrics = {
        "total_agents": cockpit.get("Total Agents", None),
        "throughput": cockpit.get("Throughput", None),
        "efficiency": cockpit.get("Efficiency", None),
        "pending_tasks": cockpit.get("Task Queue", {}).get("Pending", None),
        "running_tasks": cockpit.get("Task Queue", {}).get("Running", None),
        "completed_tasks": cockpit.get("Task Queue", {}).get("Completed", None),
        "errors": cockpit.get("Diagnostics", {}).get("Errors", None),
    }
    return metrics
