"""
AI_CONNECTOR_FRAMEWORK.PY
Enhanced AI Connector Framework for VS Code

Lightweight connector framework with REST-first connector and demo.
"""

import uuid
import json
from typing import Dict, Any, Callable, Optional, List
from datetime import datetime
import asyncio


class AIConnector:
    """Framework for connecting multiple AI agents in VS Code"""

    def __init__(self):
        self.connectors: Dict[str, Dict[str, Any]] = {}
        self.agent_registry: Dict[str, Dict[str, Any]] = {}
        self._connections: List[Dict[str, Any]] = []

        # Initialize with default connectors
        self._setup_default_connectors()

    def _setup_default_connectors(self):
        """Setup default connectors"""
        # MCP (Model Context Protocol) connector (placeholder)
        self.connectors["mcp"] = {
            "type": "mcp",
            "description": "Model Context Protocol for agent communication",
            "enabled": True,
            "config": {}
        }

        # REST API connector
        self.connectors["rest"] = {
            "type": "rest",
            "description": "REST API connector for HTTP-based communication",
            "enabled": True,
            "config": {
                "base_url": "http://localhost:8001",
                "timeout": 30
            }
        }

        # WebSocket connector (disabled by default)
        self.connectors["websocket"] = {
            "type": "websocket",
            "description": "WebSocket connector for real-time communication",
            "enabled": False,
            "config": {
                "url": "ws://localhost:8002"
            }
        }

    def register_agent(self, agent_id: str, agent_type: str, capabilities: List[str]):
        """Register an agent with the connector framework"""
        self.agent_registry[agent_id] = {
            "type": agent_type,
            "capabilities": capabilities,
            "status": "idle",
            "last_active": datetime.now().isoformat()
        }

        print(f"🔗 Registered agent: {agent_id}")

    def connect_agents(self, sender_id: str, receiver_id: str,
                      connector_type: str = "mcp") -> bool:
        """Connect two agents using a specific connector"""
        if sender_id not in self.agent_registry:
            raise ValueError(f"Sender agent {sender_id} not found")

        if receiver_id not in self.agent_registry:
            raise ValueError(f"Receiver agent {receiver_id} not found")

        if connector_type not in self.connectors:
            raise ValueError(f"Connector type {connector_type} not supported")

        # Enable the connector
        self.connectors[connector_type]["enabled"] = True

        # Create connection
        connection = {
            "id": f"conn_{uuid.uuid4()}",
            "sender": sender_id,
            "receiver": receiver_id,
            "connector_type": connector_type,
            "created_at": datetime.now().isoformat(),
            "status": "active"
        }

        # Store connection
        self._connections.append(connection)

        print(f"🔌 Connected {sender_id} to {receiver_id} via {connector_type}")

        return True

    def send_message(self, sender_id: str, receiver_id: str, content: str,
                    metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send a message between connected agents"""
        if sender_id not in self.agent_registry:
            raise ValueError(f"Sender agent {sender_id} not found")

        if receiver_id not in self.agent_registry:
            raise ValueError(f"Receiver agent {receiver_id} not found")

        # Find active connection
        connection = self._find_connection(sender_id, receiver_id)
        if not connection:
            raise ValueError(f"No active connection between {sender_id} and {receiver_id}")

        # Send message through the connector
        message = {
            "id": f"msg_{uuid.uuid4()}",
            "sender": sender_id,
            "receiver": receiver_id,
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat()
        }

        # Process message based on connector type
        if connection["connector_type"] == "mcp":
            self._send_mcp_message(message)
        elif connection["connector_type"] == "rest":
            self._send_rest_message(message)
        elif connection["connector_type"] == "websocket":
            self._send_websocket_message(message)

        return {"status": "sent", "message_id": message["id"]}

    def _send_mcp_message(self, message: Dict[str, Any]):
        """Send message using MCP protocol (placeholder)"""
        print(f"📤 Sending MCP message: {message['content'][:50]}...")

    def _send_rest_message(self, message: Dict[str, Any]):
        """Send message using REST API (demo prints, user can extend with requests)"""
        cfg = self.connectors["rest"]["config"]
        print(f"📤 Sending REST message to {cfg.get('base_url')}: {message['content'][:50]}...")

    def _send_websocket_message(self, message: Dict[str, Any]):
        """Send message using WebSocket (placeholder)"""
        print(f"📤 Sending WebSocket message: {message['content'][:50]}...")

    def _find_connection(self, sender_id: str, receiver_id: str) -> Optional[Dict[str, Any]]:
        """Find an active connection between two agents"""
        for c in self._connections:
            if c["sender"] == sender_id and c["receiver"] == receiver_id and c["status"] == "active":
                return c
        return None


def demo():
    ac = AIConnector()
    ac.register_agent("lingma", "research", ["search", "summarize"])
    ac.register_agent("claude_code", "coding", ["generate_code", "refactor"])

    ac.connect_agents("lingma", "claude_code", connector_type="rest")
    r = ac.send_message("lingma", "claude_code", "Please generate starter code for a REST connector demo")
    print(json.dumps(r, indent=2))


if __name__ == "__main__":
    demo()
