"""
tools/ai_connector_framework.py
Cleaned AI Connector Framework for multi-agent demos.
"""

import requests
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid


class AIConnector:
    def __init__(self, base_url: str = "http://localhost:8100"):
        self.base_url = base_url.rstrip('/')
        self.connectors = {"rest": {"enabled": True, "config": {"timeout": 30}}}
        self.agent_registry: Dict[str, Dict[str, Any]] = {}
        self.connections: Dict[str, Dict[str, Any]] = {}

    def register_agent(self, agent_id: str, agent_type: str, capabilities: List[str]):
        payload = {"type": agent_type, "capabilities": capabilities}
        try:
            resp = requests.post(f"{self.base_url}/agents/{agent_id}/register", json=payload,
                                 timeout=self.connectors["rest"]["config"]["timeout"])
            if resp.status_code in (200, 201, 409):
                print(f"👤 Registered agent via API: {agent_id}")
            else:
                print(f"⚠️ API registration returned {resp.status_code} for {agent_id}")
        except requests.exceptions.RequestException:
            print(f"⚠️ API unreachable; registering {agent_id} locally")

        self.agent_registry[agent_id] = {
            "type": agent_type,
            "capabilities": capabilities,
            "status": "idle",
            "last_active": datetime.now().isoformat(),
            "endpoint": f"{self.base_url}/agents/{agent_id}"
        }

    def connect_agents(self, sender_id: str, receiver_id: str, connector_type: str = "rest") -> bool:
        if sender_id not in self.agent_registry or receiver_id not in self.agent_registry:
            raise ValueError("Both sender and receiver must be registered")
        connection_id = f"conn_{uuid.uuid4()}"
        conn = {
            "id": connection_id,
            "sender": sender_id,
            "receiver": receiver_id,
            "connector_type": connector_type,
            "created_at": datetime.now().isoformat(),
            "status": "active",
        }
        self.connections[connection_id] = conn
        print(f"🔗 Connected {sender_id} -> {receiver_id} via {connector_type}")
        return True

    def _find_connection(self, sender_id: str, receiver_id: str) -> Optional[Dict[str, Any]]:
        for c in self.connections.values():
            if c["sender"] == sender_id and c["receiver"] == receiver_id and c["status"] == "active":
                return c
        return None

    def send_message(self, sender_id: str, receiver_id: str, content: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        if sender_id not in self.agent_registry or receiver_id not in self.agent_registry:
            raise ValueError("Sender and receiver must be registered")
        connection = self._find_connection(sender_id, receiver_id)
        if not connection:
            raise ValueError("No active connection between sender and receiver")

        message = {
            "id": f"msg_{uuid.uuid4()}",
            "sender": sender_id,
            "receiver": receiver_id,
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat(),
        }

        if connection["connector_type"] == "rest":
            return self._send_rest_message(message)
        else:
            return {"status": "failed", "error": "unsupported connector"}

    def _send_rest_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        payload = {
            "message": message["content"],
            "sender": message["sender"],
            "receiver": message["receiver"],
            "timestamp": message["timestamp"],
            "metadata": message["metadata"],
        }
        receiver_endpoint = self.agent_registry[message["receiver"]]["endpoint"]
        try:
            resp = requests.post(f"{receiver_endpoint}/receive", json=payload,
                                 timeout=self.connectors["rest"]["config"]["timeout"])
            if resp.status_code == 200:
                print(f"📤 REST message sent: {message['id']}")
                return {"status": "sent", "message_id": message["id"], "response": resp.json()}
            else:
                print(f"❌ REST send failed: {resp.status_code}")
                return {"status": "failed", "error": resp.text}
        except requests.exceptions.RequestException as exc:
            print(f"⚠️ REST send exception: {exc}")
            return {"status": "failed", "error": str(exc)}

    def get_all_agents(self) -> Dict[str, Any]:
        try:
            resp = requests.get(f"{self.base_url}/agents", timeout=5)
            if resp.status_code == 200:
                return resp.json()
        except requests.exceptions.RequestException:
            pass
        return {"agents": list(self.agent_registry.keys())}

    def get_agent_messages(self, agent_id: str) -> List[Dict[str, Any]]:
        try:
            resp = requests.get(f"{self.base_url}/agents/{agent_id}/messages", timeout=5)
            if resp.status_code == 200:
                body = resp.json()
                return body.get("messages", [])
        except requests.exceptions.RequestException:
            pass
        return []


def demo_ai_connector():
    print("🚀 AI Connector Framework Demo")
    connector = AIConnector(base_url="http://localhost:8100")

    print("\n1. Registering agents")
    connector.register_agent("lingma", "research", ["research", "analysis"]) 
    connector.register_agent("claude_code", "coding", ["code_generation", "refactoring"]) 
    connector.register_agent("gpt_codex", "verification", ["code_review"]) 

    print("\n2. Connecting agents")
    connector.connect_agents("lingma", "claude_code")
    connector.connect_agents("claude_code", "gpt_codex")
    connector.connect_agents("gpt_codex", "lingma")

    print("\n3. Sending messages")
    r1 = connector.send_message("lingma", "claude_code", "Analysis: use MapReduce for genomics", {"task": "genomics"})
    print("   ", r1)
    r2 = connector.send_message("claude_code", "gpt_codex", "Please review generated code", {})
    print("   ", r2)
    r3 = connector.send_message("gpt_codex", "lingma", "Review complete: looks good", {})
    print("   ", r3)

    print("\n4. Checking persisted messages via API")
    for aid in ("lingma", "claude_code", "gpt_codex"):
        msgs = connector.get_agent_messages(aid)
        print(f"   {aid}: {len(msgs)} messages")

    print("\nDemo complete")


if __name__ == "__main__":
    demo_ai_connector()
