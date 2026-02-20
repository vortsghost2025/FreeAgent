"""
MULTI_AGENT_COORDINATOR.PY
Enhanced Multi-Agent Coordination System for VS Code

This system enables seamless communication between research, coding, and verification agents
within VS Code, creating a cohesive AI ensemble that works together efficiently.
"""

import asyncio
import json
import os
import threading
from typing import Dict, List, Any, Callable, Optional
import uuid
from dataclasses import dataclass
import time
from datetime import datetime
from pathlib import Path

@dataclass
class AgentMessage:
    """Represents a message between agents in the system"""
    id: str
    sender: str
    receiver: str
    type: str  # "request", "response", "status", "error"
    content: str
    timestamp: datetime
    metadata: Dict[str, Any] = None
    
    def to_dict(self):
        return {
            "id": self.id,
            "sender": self.sender,
            "receiver": self.receiver,
            "type": self.type,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata or {}
        }

class AgentCoordinator:
    """
    Central coordinator for managing multiple AI agents in VS Code
    Enables seamless communication between research, coding, and verification agents
    """
    
    def __init__(self, workspace_path: str = "./workspace"):
        self.workspace_path = Path(workspace_path)
        self.workspace_path.mkdir(exist_ok=True)
        
        # Agent registry
        self.agents: Dict[str, Dict[str, Any]] = {}
        
        # Message queue
        self.message_queue: List[AgentMessage] = []
        
        # Task tracking
        self.tasks: Dict[str, Dict[str, Any]] = {}
        
        # Status tracking
        self.status: Dict[str, str] = {}
        
        # Initialize with default agents
        self._register_default_agents()
        
        # Start background processing
        self._stop_flag = threading.Event()
        self.processing_thread = threading.Thread(target=self._process_messages, daemon=True)
        self.processing_thread.start()
        
        print("🧠 Multi-Agent Coordinator initialized")
    
    def _register_default_agents(self):
        """Register default agents in the system"""
        default_agents = [
            {"id": "lingma", "type": "research", "name": "Lingma Research Agent"},
            {"id": "claude_code", "type": "coding", "name": "Claude Code Agent"},
            {"id": "gpt_codex", "type": "verification", "name": "GPT Codex Verifier"}
        ]
        
        for agent in default_agents:
            self.agents[agent["id"]] = {
                "type": agent["type"],
                "name": agent["name"],
                "status": "idle",
                "last_active": datetime.now(),
                "capabilities": self._get_capabilities(agent["type"])
            }
            self.status[agent["id"]] = "idle"
        
        print(f"📋 Registered {len(default_agents)} default agents")
    
    def _get_capabilities(self, agent_type: str) -> List[str]:
        """Get capabilities based on agent type"""
        capabilities = ["basic_communication"]
        
        if agent_type == "research":
            capabilities.extend(["research", "analysis", "synthesis", "context_understanding"])
        elif agent_type == "coding":
            capabilities.extend(["code_generation", "debugging", "refactoring", "testing"])
        elif agent_type == "verification":
            capabilities.extend(["code_review", "security_analysis", "performance_evaluation", "compliance_check"])
        
        return capabilities
    
    def add_agent(self, agent_id: str, agent_type: str, name: str):
        """Add a new agent to the system"""
        if agent_id in self.agents:
            print(f"⚠️ Agent {agent_id} already exists")
            return
        
        self.agents[agent_id] = {
            "type": agent_type,
            "name": name,
            "status": "idle",
            "last_active": datetime.now(),
            "capabilities": self._get_capabilities(agent_type)
        }
        
        self.status[agent_id] = "idle"
        print(f"➕ Added new agent: {name} ({agent_type})")
    
    def send_message(self, sender: str, receiver: str, content: str, 
                    message_type: str = "request", metadata: Dict[str, Any] = None) -> str:
        """Send a message from one agent to another"""
        if sender not in self.agents:
            raise ValueError(f"Sender agent {sender} not found")
        
        if receiver not in self.agents:
            raise ValueError(f"Receiver agent {receiver} not found")
        
        # Create message
        message = AgentMessage(
            id=f"msg_{uuid.uuid4()}",
            sender=sender,
            receiver=receiver,
            type=message_type,
            content=content,
            timestamp=datetime.now(),
            metadata=metadata or {}
        )
        
        # Add to message queue
        self.message_queue.append(message)
        
        # Update agent status
        self.agents[sender]["last_active"] = datetime.now()
        self.status[sender] = "sending"
        
        print(f"📤 Sent message from {sender} to {receiver}: {content[:50]}...")
        
        return message.id
    
    def _process_messages(self):
        """Background thread to process messages in the queue"""
        while not self._stop_flag.is_set():
            if self.message_queue:
                message = self.message_queue.pop(0)
                
                # Process the message
                self._handle_message(message)
                
                # Update receiver status
                if message.receiver in self.agents:
                    self.agents[message.receiver]["last_active"] = datetime.now()
                    self.status[message.receiver] = "processing"
                    
                    # Send response if needed
                    if message.type == "request":
                        self._send_response(message)
            time.sleep(0.05)
    
    def _handle_message(self, message: AgentMessage):
        """Handle an incoming message"""
        print(f"📥 Handling message from {message.sender} to {message.receiver}")
        
        # Process based on message type
        if message.type == "request":
            self._process_request(message)
        elif message.type == "response":
            self._process_response(message)
        elif message.type == "status":
            self._process_status(message)
        else:
            print(f"❓ Unknown message type: {message.type}")
    
    def _process_request(self, message: AgentMessage):
        """Process a request message"""
        print(f"🔄 Processing request from {message.sender} to {message.receiver}")
        
        # Simulate processing time
        time.sleep(0.2)
        
        # Generate response based on receiver type
        if message.receiver == "claude_code":
            response_content = f"Generated code for request: {message.content}"
        elif message.receiver == "gpt_codex":
            response_content = f"Code review completed: {message.content}"
        else:
            response_content = f"Research analysis completed: {message.content}"
        
        # Send response
        self.send_message(
            sender=message.receiver,
            receiver=message.sender,
            content=response_content,
            message_type="response",
            metadata={"processed_at": datetime.now().isoformat()}
        )
    
    def _process_response(self, message: AgentMessage):
        """Process a response message"""
        print(f"✅ Received response from {message.sender} to {message.receiver}")
        
        # Update task status
        if message.metadata and "task_id" in message.metadata:
            task_id = message.metadata["task_id"]
            if task_id in self.tasks:
                self.tasks[task_id]["status"] = "completed"
                self.tasks[task_id]["response"] = message.content
    
    def _process_status(self, message: AgentMessage):
        """Process a status message"""
        print(f"📊 Received status update from {message.sender}")
        
        # Update agent status
        if message.sender in self.status:
            self.status[message.sender] = message.content
    
    def _send_response(self, original_message: AgentMessage):
        """Send a response to a message"""
        response_content = f"Response to request: {original_message.content}"
        
        self.send_message(
            sender=original_message.receiver,
            receiver=original_message.sender,
            content=response_content,
            message_type="response",
            metadata={"correlation_id": original_message.id}
        )
    
    def create_task(self, task_name: str, description: str, 
                   priority: str = "normal") -> str:
        """Create a new task in the system"""
        task_id = f"task_{uuid.uuid4()}"
        task = {
            "id": task_id,
            "name": task_name,
            "description": description,
            "priority": priority,
            "status": "queued",
            "created_at": datetime.now().isoformat()
        }
        self.tasks[task_id] = task
        print(f"📥 Created task {task_id}: {task_name}")
        return task_id
    
    def stop(self):
        """Stop background processing"""
        self._stop_flag.set()
        self.processing_thread.join(timeout=1)


def _demo():
    coord = AgentCoordinator()
    # create a task
    tid = coord.create_task("demo","Demo task for multi-agent coordinator")
    # send a message
    coord.send_message("lingma","claude_code","Please generate starter code for demo", message_type="request", metadata={"task_id": tid})
    # allow processing
    time.sleep(1)
    print("Status:", coord.status)
    print("Tasks:", json.dumps(coord.tasks, indent=2, default=str))
    coord.stop()

if __name__ == "__main__":
    _demo()
