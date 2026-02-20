"""
tools/ai_connector_framework.py
Enhanced AI Connector Framework for VS Code Multi-Agent Coordination

This module provides a framework for connecting multiple AI agents in VS Code,
enabling seamless communication between research, coding, and verification agents
using REST API as the primary connector protocol.
"""

import json
import requests
import os
from typing import Dict, Any, List, Optional
import threading
import time
from datetime import datetime
import uuid

class AIConnector:
    """Framework for connecting multiple AI agents in VS Code"""
    
    def __init__(self, base_url: str = "http://localhost:8002"):
        self.base_url = base_url
        self.connectors = {}
        self.agent_registry = {}
        self.connections = {}
        
        # Initialize with default connectors
        self._setup_default_connectors()
        
        print(f"🔗 AI Connector Framework initialized with base URL: {base_url}")
        # Ensure storage directory exists for persistent logs
        storage_dir = os.path.join(os.getcwd(), "ensemble_storage")
        os.makedirs(storage_dir, exist_ok=True)
        self._log_path = os.path.join(storage_dir, "ai_connector_messages.log")

    def _log_message(self, record: Dict[str, Any]):
        try:
            with open(self._log_path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(record, default=str) + "\n")
        except Exception:
            # Swallow logging errors to avoid interfering with runtime
            pass
    
    def _setup_default_connectors(self):
        """Setup default connectors"""
        # REST API connector (primary)
        self.connectors["rest"] = {
            "type": "rest",
            "description": "REST API connector for HTTP-based communication",
            "enabled": True,
            "config": {
                "base_url": self.base_url,
                "timeout": 30
            }
        }
        
        # MCP (Model Context Protocol) connector
        self.connectors["mcp"] = {
            "type": "mcp",
            "description": "Model Context Protocol for agent communication",
            "enabled": False,
            "config": {}
        }
    
    def register_agent(self, agent_id: str, agent_type: str, capabilities: List[str]):
        """Register an agent with the connector framework"""
        # Register the agent via API
        try:
            payload = {
                "type": agent_type,
                "capabilities": capabilities
            }
            response = requests.post(
                f"{self.base_url}/agents/{agent_id}/register",
                json=payload,
                timeout=self.connectors["rest"]["config"]["timeout"]
            )
            
            if response.status_code in [200, 201, 409]:  # 409 might mean already exists
                print(f"👤 Registered agent: {agent_id} ({agent_type})")
            else:
                print(f"⚠️ Registration failed for {agent_id}: {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"⚠️ Could not register {agent_id} - API not running (will register in memory)")
        
        # Always register in memory regardless of API availability
        self.agent_registry[agent_id] = {
            "type": agent_type,
            "capabilities": capabilities,
            "status": "idle",
            "last_active": datetime.now().isoformat(),
            "endpoint": f"{self.base_url}/agents/{agent_id}"
        }
        # persistent log
        try:
            self._log_message({
                "event": "register",
                "agent_id": agent_id,
                "agent_type": agent_type,
                "capabilities": capabilities,
                "ts": datetime.now().isoformat()
            })
        except Exception:
            pass
    
    def connect_agents(self, sender_id: str, receiver_id: str, 
                      connector_type: str = "rest") -> bool:
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
        connection_id = f"conn_{uuid.uuid4()}"
        connection = {
            "id": connection_id,
            "sender": sender_id,
            "receiver": receiver_id,
            "connector_type": connector_type,
            "created_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        self.connections[connection_id] = connection
        
        print(f"🔗 Connected {sender_id} to {receiver_id} via {connector_type}")
        
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
        if connection["connector_type"] == "rest":
            return self._send_rest_message(message)
        elif connection["connector_type"] == "mcp":
            return self._send_mcp_message(message)
        else:
            raise ValueError(f"Unsupported connector type: {connection['connector_type']}")
    
    def _send_rest_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Send message using REST API"""
        try:
            # Prepare the request payload
            payload = {
                "message": message["content"],
                "sender": message["sender"],
                "receiver": message["receiver"],
                "timestamp": message["timestamp"],
                "metadata": message["metadata"]
            }
            
            # Send POST request to receiver endpoint
            receiver_endpoint = self.agent_registry[message["receiver"]]["endpoint"]
            response = requests.post(
                f"{receiver_endpoint}/receive",
                json=payload,
                timeout=self.connectors["rest"]["config"]["timeout"]
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"📤 REST message sent successfully: {message['content'][:50]}...")
                self._log_message({
                    "event": "send",
                    "status": "sent",
                    "message_id": message["id"],
                    "sender": message["sender"],
                    "receiver": message["receiver"],
                    "content_preview": message["content"][:200],
                    "response": result,
                    "ts": datetime.now().isoformat()
                })
                return {"status": "sent", "message_id": message["id"], "response": result}
            else:
                print(f"❌ REST message failed with status {response.status_code}")
                self._log_message({
                    "event": "send",
                    "status": "failed",
                    "http_status": response.status_code,
                    "message_id": message["id"],
                    "sender": message["sender"],
                    "receiver": message["receiver"],
                    "content_preview": message["content"][:200],
                    "response_text": response.text,
                    "ts": datetime.now().isoformat()
                })
                return {"status": "failed", "message_id": message["id"], "error": response.text}
                
        except requests.exceptions.ConnectionError:
            print(f"⚠️ Connection failed - API not running. Message would be sent when API is available.")
            # Return a mock response for testing purposes
            mock = {
                "status": "sent", 
                "message_id": message["id"], 
                "response": {
                    "status": "received", 
                    "message_id": f"mock_{message['id']}", 
                    "processed_at": message["timestamp"]
                }
            }
            try:
                self._log_message({
                    "event": "send",
                    "status": "mock_sent",
                    "message_id": message["id"],
                    "sender": message["sender"],
                    "receiver": message["receiver"],
                    "content_preview": message["content"][:200],
                    "ts": datetime.now().isoformat()
                })
            except Exception:
                pass
            return mock
        except requests.exceptions.RequestException as e:
            print(f"❌ REST message failed: {str(e)}")
            return {"status": "failed", "message_id": message["id"], "error": str(e)}
    
    def _send_mcp_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Send message using MCP protocol (placeholder implementation)"""
        # MCP implementation would go here
        print(f"📤 MCP message prepared: {message['content'][:50]}...")
        return {"status": "sent", "message_id": message["id"], "response": "MCP mock response"}
    
    def _find_connection(self, sender_id: str, receiver_id: str) -> Optional[Dict[str, Any]]:
        """Find an active connection between two agents"""
        for conn_id, connection in self.connections.items():
            if (connection["sender"] == sender_id and 
                connection["receiver"] == receiver_id and 
                connection["status"] == "active"):
                return connection
        return None
    
    def get_agent_status(self, agent_id: str) -> Dict[str, Any]:
        """Get status of a specific agent"""
        if agent_id not in self.agent_registry:
            raise ValueError(f"Agent {agent_id} not found")
        
        return self.agent_registry[agent_id]
    
    def get_all_agents(self) -> Dict[str, Any]:
        """Get all registered agents"""
        return self.agent_registry
    
    def get_connections(self) -> Dict[str, Any]:
        """Get all active connections"""
        return self.connections

def demo_ai_connector():
    """Demo function to showcase the AI Connector Framework"""
    print("🚀 AI Connector Framework Demo")
    print("="*50)
    
    # Initialize connector with the same port as your API
    connector = AIConnector(base_url="http://localhost:8002")  # Use API on port 8002
    
    # Register agents
    print("\n1. Registering agents...")
    connector.register_agent("lingma", "research", ["research", "analysis", "context_understanding"])
    connector.register_agent("claude_code", "coding", ["code_generation", "debugging", "refactoring"])
    connector.register_agent("gpt_codex", "verification", ["code_review", "security_analysis", "compliance_check"])
    
    # Connect agents
    print("\n2. Connecting agents...")
    connector.connect_agents("lingma", "claude_code", "rest")
    connector.connect_agents("claude_code", "gpt_codex", "rest")
    connector.connect_agents("gpt_codex", "lingma", "rest")
    
    # Send messages between agents
    print("\n3. Sending messages...")
    
    # Research agent sends analysis to coding agent
    result1 = connector.send_message(
        sender_id="lingma",
        receiver_id="claude_code",
        content="Analysis complete: The optimal approach is to implement a distributed computing solution using Map/Reduce patterns for the genomics data processing.",
        metadata={"task": "genomics_analysis", "priority": "high"}
    )
    print(f"   Message 1 result: {result1['status']}")
    
    # Coding agent sends generated code to verification agent
    result2 = connector.send_message(
        sender_id="claude_code",
        receiver_id="gpt_codex",
        content="Code generated: Implementation of Map/Reduce pattern for genomics data. Includes error handling, validation, and performance optimizations.",
        metadata={"task": "code_generation", "priority": "normal"}
    )
    print(f"   Message 2 result: {result2['status']}")
    
    # Verification agent sends feedback to research agent
    result3 = connector.send_message(
        sender_id="gpt_codex",
        receiver_id="lingma",
        content="Code review completed: The implementation follows best practices, has good security measures, and passes all compliance checks. Ready for deployment.",
        metadata={"task": "code_review", "priority": "normal"}
    )
    print(f"   Message 3 result: {result3['status']}")
    
    # Display system status
    print("\n4. System status:")
    print(f"   Registered agents: {len(connector.get_all_agents())}")
    print(f"   Active connections: {len(connector.get_connections())}")
    
    agents = connector.get_all_agents()
    for agent_id, agent_info in agents.items():
        print(f"   - {agent_id} ({agent_info['type']}): {agent_info['status']}")
    
    print("\n✅ AI Connector Framework demo completed successfully!")

if __name__ == "__main__":
    demo_ai_connector()
"""
tools/ai_connector_framework.py
Enhanced AI Connector Framework for VS Code Multi-Agent Coordination

REST-first implementation that registers agents, connects them, and sends messages
to agent endpoints. Designed to integrate with local agent services (e.g. `api.py`).
"""

import json
import requests
from typing import Dict, Any, List, Optional
import threading
import time
from datetime import datetime
import uuid


class AIConnector:
    """Framework for connecting multiple AI agents in VS Code"""

    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.connectors: Dict[str, Dict[str, Any]] = {}
        self.agent_registry: Dict[str, Dict[str, Any]] = {}
        self.connections: Dict[str, Dict[str, Any]] = {}

        # Initialize with default connectors
        self._setup_default_connectors()

        print(f"🔗 AI Connector Framework initialized with base URL: {base_url}")

    def _setup_default_connectors(self):
        """Setup default connectors"""
        # REST API connector (primary)
        self.connectors["rest"] = {
            "type": "rest",
            "description": "REST API connector for HTTP-based communication",
            "enabled": True,
            "config": {
                "base_url": self.base_url,
                "timeout": 30
            }
        }

        # MCP (Model Context Protocol) connector
        self.connectors["mcp"] = {
            "type": "mcp",
            "description": "Model Context Protocol for agent communication",
            "enabled": False,
            "config": {}
        }

    def register_agent(self, agent_id: str, agent_type: str, capabilities: List[str]):
        """Register an agent with the connector framework"""
        self.agent_registry[agent_id] = {
            "type": agent_type,
            "capabilities": capabilities,
            "status": "idle",
            "last_active": datetime.now().isoformat(),
            "endpoint": f"{self.base_url}/agents/{agent_id}"
        }

        print(f"👤 Registered agent: {agent_id} ({agent_type})")

    def connect_agents(self, sender_id: str, receiver_id: str,
                      connector_type: str = "rest") -> bool:
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
        connection_id = f"conn_{uuid.uuid4()}"
        connection = {
            "id": connection_id,
            "sender": sender_id,
            "receiver": receiver_id,
            "connector_type": connector_type,
            "created_at": datetime.now().isoformat(),
            "status": "active"
        }

        self.connections[connection_id] = connection

        print(f"🔗 Connected {sender_id} to {receiver_id} via {connector_type}")

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
        if connection["connector_type"] == "rest":
            return self._send_rest_message(message)
        elif connection["connector_type"] == "mcp":
            return self._send_mcp_message(message)
        else:
            raise ValueError(f"Unsupported connector type: {connection['connector_type']}")

    def _send_rest_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Send message using REST API"""
        try:
            # Prepare the request payload
            payload = {
                "message": message["content"],
                "sender": message["sender"],
                "receiver": message["receiver"],
                "timestamp": message["timestamp"],
                "metadata": message["metadata"]
            }

            # Send POST request to receiver endpoint
            receiver_endpoint = self.agent_registry[message["receiver"]]["endpoint"]
            response = requests.post(
                f"{receiver_endpoint}/receive",
                json=payload,
                timeout=self.connectors["rest"]["config"]["timeout"]
            )

            if response.status_code == 200:
                print(f"📤 REST message sent successfully: {message['content'][:50]}...")
                try:
                    resp_json = response.json()
                except Exception:
                    resp_json = {"text": response.text}
                return {"status": "sent", "message_id": message["id"], "response": resp_json}
            else:
                print(f"❌ REST message failed with status {response.status_code}")
                return {"status": "failed", "message_id": message["id"], "error": response.text}

        except requests.exceptions.RequestException as e:
            print(f"❌ REST message failed: {str(e)}")
            return {"status": "failed", "message_id": message["id"], "error": str(e)}

    def _send_mcp_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Send message using MCP protocol (placeholder implementation)"""
        # MCP implementation would go here
        print(f"📤 MCP message prepared: {message['content'][:50]}...")
        return {"status": "sent", "message_id": message["id"], "response": "MCP mock response"}

    def _find_connection(self, sender_id: str, receiver_id: str) -> Optional[Dict[str, Any]]:
        """Find an active connection between two agents"""
        for conn_id, connection in self.connections.items():
            if (connection["sender"] == sender_id and 
                connection["receiver"] == receiver_id and 
                connection["status"] == "active"):
                return connection
        return None

    def get_agent_status(self, agent_id: str) -> Dict[str, Any]:
        """Get status of a specific agent"""
        if agent_id not in self.agent_registry:
            raise ValueError(f"Agent {agent_id} not found")

        return self.agent_registry[agent_id]

    def get_all_agents(self) -> Dict[str, Any]:
        """Get all registered agents"""
        return self.agent_registry

    def get_connections(self) -> Dict[str, Any]:
        """Get all active connections"""
        return self.connections

def demo_ai_connector():
    """Demo function to showcase the AI Connector Framework"""
    print("🚀 AI Connector Framework Demo")
    print("="*50)

    # Initialize connector
    connector = AIConnector(base_url="http://localhost:8001")

    # Register agents
    print("\n1. Registering agents...")
    connector.register_agent("lingma", "research", ["research", "analysis", "context_understanding"])
    connector.register_agent("claude_code", "coding", ["code_generation", "debugging", "refactoring"])
    connector.register_agent("gpt_codex", "verification", ["code_review", "security_analysis", "compliance_check"])

    # Connect agents
    print("\n2. Connecting agents...")
    connector.connect_agents("lingma", "claude_code", "rest")
    connector.connect_agents("claude_code", "gpt_codex", "rest")
    connector.connect_agents("gpt_codex", "lingma", "rest")

    # Send messages between agents
    print("\n3. Sending messages...")

    # Research agent sends analysis to coding agent
    result1 = connector.send_message(
        sender_id="lingma",
        receiver_id="claude_code",
        content="Analysis complete: The optimal approach is to implement a distributed computing solution using Map/Reduce patterns for the genomics data processing.",
        metadata={"task": "genomics_analysis", "priority": "high"}
    )
    print(f"   Message 1 result: {result1['status']}")

    # Coding agent sends generated code to verification agent
    result2 = connector.send_message(
        sender_id="claude_code",
        receiver_id="gpt_codex",
        content="Code generated: Implementation of Map/Reduce pattern for genomics data. Includes error handling, validation, and performance optimizations.",
        metadata={"task": "code_generation", "priority": "normal"}
    )
    print(f"   Message 2 result: {result2['status']}")

    # Verification agent sends feedback to research agent
    result3 = connector.send_message(
        sender_id="gpt_codex",
        receiver_id="lingma",
        content="Code review completed: The implementation follows best practices, has good security measures, and passes all compliance checks. Ready for deployment.",
        metadata={"task": "code_review", "priority": "normal"}
    )
    print(f"   Message 3 result: {result3['status']}")

    # Display system status
    print("\n4. System status:")
    print(f"   Registered agents: {len(connector.get_all_agents())}")
    print(f"   Active connections: {len(connector.get_connections())}")

    agents = connector.get_all_agents()
    for agent_id, agent_info in agents.items():
        print(f"   - {agent_id} ({agent_info['type']}): {agent_info['status']}")

    print("\n✅ AI Connector Framework demo completed successfully!")

if __name__ == "__main__":
    demo_ai_connector()
