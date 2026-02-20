"""
FREE_AGENT_SWARM_ORCHESTRATOR.PY
The framework that lets free coding agents work on your multi-AI ensemble
without needing to execute on infrastructure directly.
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Callable, Optional
from dataclasses import dataclass, field
import subprocess
import tempfile

@dataclass
class AgentTask:
    """A task for a free coding agent to work on"""
    task_id: str
    agent_name: str
    description: str
    requirements: List[str]
    code_files: List[str]
    config_files: List[str]
    documentation_files: List[str]
    status: str = "pending"
    assigned_at: datetime = None
    completed_at: datetime = None
    output_files: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

@dataclass
class AgentResult:
    """Result from a free coding agent"""
    task_id: str
    agent_name: str
    generated_files: List[Dict[str, str]]  # {filename: content}
    generated_configs: List[Dict[str, Any]]
    documentation: str
    success: bool
    error_message: str = ""

class FreeAgentSwarmOrchestrator:
        def auto_assign_and_activate(self, task: AgentTask):
            """Automatically assign a task to available agents based on capabilities and activate them if needed."""
            # Find agents with matching capabilities
            assigned = False
            for agent_name, agent_info in self.agent_registry.items():
                if agent_info.get("active", False):
                    # Simple match: if any requirement matches agent capabilities
                    if any(req.lower() in [c.lower() for c in agent_info["capabilities"]] for req in task.requirements):
                        self.assign_task_to_free_agent(task.task_id, agent_name)
                        assigned = True
            if not assigned and self.agent_registry:
                # Fallback: assign to any active agent
                for agent_name, agent_info in self.agent_registry.items():
                    if agent_info.get("active", False):
                        self.assign_task_to_free_agent(task.task_id, agent_name)
                        assigned = True
                        break
            if assigned:
                print(f"🚦 AUTO-ASSIGNED TASK: {task.task_id} to available agent(s)")
            else:
                print(f"⚠️ NO AVAILABLE AGENT for task {task.task_id}")

    """
    The orchestrator that manages free coding agents working on your multi-AI ensemble
    without needing them to execute on infrastructure directly.
    """
    
    def __init__(self):
        self.tasks = []
        self.agents = []
        self.agent_registry = {}  # agent_name -> agent_info
        self.results = []
        self.task_dependencies = {}  # task_id -> list of dependent task_ids
        self.swarm_state = {
            "total_tasks": 0,
            "completed_tasks": 0,
            "active_agents": 0,
            "system_health": 1.0,
            "ensemble_coherence": 0.95
        }

    def register_agent(self, agent_name: str, capabilities: List[str], info: Optional[Dict[str, Any]] = None):
        """Register a new agent with its capabilities and info."""
        self.agent_registry[agent_name] = {
            "capabilities": capabilities,
            "info": info or {},
            "active": True
        }
        print(f"🗂️ REGISTERED AGENT: {agent_name} with capabilities {capabilities}")

    def share_task(self, task: AgentTask, agent_names: List[str]):
        """Share a task among multiple agents (for collaboration or parallel work)."""
        for agent in agent_names:
            self.assign_task_to_free_agent(task.task_id, agent)
        print(f"🔗 SHARED TASK: {task.task_id} among agents {agent_names}")

    def set_task_dependency(self, task_id: str, depends_on: List[str]):
        """Declare that a task depends on completion of other tasks."""
        self.task_dependencies[task_id] = depends_on
        print(f"⛓️ SET DEPENDENCY: Task {task_id} depends on {depends_on}")

    def can_start_task(self, task_id: str) -> bool:
        """Check if all dependencies for a task are completed."""
        deps = self.task_dependencies.get(task_id, [])
        for dep_id in deps:
            dep_task = next((t for t in self.tasks if t.task_id == dep_id), None)
            if not dep_task or dep_task.status != "completed":
                return False
        return True

    def coordinated_response(self, task_ids: List[str]) -> Dict[str, Any]:
        """Aggregate results from multiple agents for coordinated output."""
        responses = {}
        for tid in task_ids:
            result = next((r for r in self.results if r.task_id == tid), None)
            if result:
                responses[tid] = {
                    "agent": result.agent_name,
                    "files": result.generated_files,
                    "success": result.success,
                    "error": result.error_message
                }
        print(f"🤝 COORDINATED RESPONSE for tasks {task_ids}")
        return responses
    
    def add_task(self, task: AgentTask, auto_assign: bool = True):
        """Add a task for free agents to work on and optionally auto-assign to agents."""
        task.assigned_at = datetime.now()
        self.tasks.append(task)
        self.swarm_state["total_tasks"] += 1
        print(f"📋 ADDED TASK: {task.task_id} for agent {task.agent_name}")
        if auto_assign:
            self.auto_assign_and_activate(task)
    
    def assign_task_to_free_agent(self, task_id: str, agent_name: str) -> AgentTask:
        """Assign a task to a free agent (schematic work only)"""
        task = next((t for t in self.tasks if t.task_id == task_id), None)
        if task:
            task.agent_name = agent_name
            task.status = "assigned"
            self.agents.append(agent_name)
            print(f"🤖 ASSIGNED TASK: {task_id} to free agent {agent_name}")
        return task
    
    def process_agent_result(self, result: AgentResult) -> bool:
        """Process result from a free coding agent"""
        # Validate the result (schematic only, no execution)
        if result.success:
            # Save generated files locally for later use
            for filename, content in result.generated_files.items():
                # Save to temporary location for review
                temp_dir = tempfile.mkdtemp()
                filepath = os.path.join(temp_dir, filename)
                with open(filepath, 'w') as f:
                    f.write(content)
                
                # Add to task results
                for task in self.tasks:
                    if task.task_id == result.task_id:
                        task.output_files.append(filepath)
                        task.status = "completed"
                        task.completed_at = datetime.now()
                        break
            
            self.results.append(result)
            self.swarm_state["completed_tasks"] += 1
            
            print(f"✅ PROCESSED RESULT: Task {result.task_id} completed by {result.agent_name}")
            return True
        else:
            # Handle error case
            for task in self.tasks:
                if task.task_id == result.task_id:
                    task.errors.append(result.error_message)
                    task.status = "failed"
                    break
            
            print(f"❌ FAILED RESULT: Task {result.task_id} failed: {result.error_message}")
            return False
    
    def generate_task_instructions(self, task: AgentTask) -> str:
        """Generate detailed instructions for a free agent to work on a task"""
        instructions = f"""
# TASK INSTRUCTIONS FOR FREE CODING AGENT
Task ID: {task.description}
Agent: {task.agent_name}

## REQUIREMENTS:
{chr(10).join(f"- {req}" for req in task.requirements)}

## FILES TO GENERATE:
### Code Files:
{chr(10).join(f"- {f}" for f in task.code_files)}

### Configuration Files:
{chr(10).join(f"- {f}" for f in task.config_files)}

### Documentation Files:
{chr(10).join(f"- {f}" for f in task.documentation_files)}

## INSTRUCTIONS:
1. Generate the specified files with proper code, configurations, and documentation
2. Follow best practices and standards
3. Include proper error handling and validation
4. Add comprehensive comments and documentation
5. Ensure files are ready for deployment in orchestration system
6. DO NOT execute or deploy - only generate schematic files

## OUTPUT FORMAT:
Return as structured result with:
- generated_files: {filename: content}
- generated_configs: [configuration_objects]
- documentation: "comprehensive documentation"
- success: boolean
- error_message: "if applicable"

Remember: You are generating SCHEMATIC files only - no actual execution or deployment.
        """
        return instructions
    
    def run_swarm_simulation(self) -> Dict[str, Any]:
        """Simulate the swarm operation for demonstration"""
        print("🤖 INITIATING FREE AGENT SWARM SIMULATION...")
        
        # Create sample tasks for demonstration
        sample_tasks = [
            AgentTask(
                task_id="task_1",
                agent_name="free_agent_1",
                description="Generate Kubernetes manifests for microservices",
                requirements=["Kubernetes", "microservices", "deployment"],
                code_files=["deployment.yaml", "service.yaml"],
                config_files=["configmap.yaml"],
                documentation_files=["README.md"]
            ),
            AgentTask(
                task_id="task_2", 
                agent_name="free_agent_2",
                description="Create CI/CD pipeline configuration",
                requirements=["GitHub Actions", "CI/CD", "automation"],
                code_files=["workflow.yaml"],
                config_files=["secrets.yaml"],
                documentation_files=["pipeline_guide.md"]
            ),
            AgentTask(
                task_id="task_3",
                agent_name="free_agent_3", 
                description="Build monitoring and logging setup",
                requirements=["Prometheus", "Grafana", "ELK"],
                code_files=["prometheus-config.yaml", "grafana-dashboard.json"],
                config_files=["elasticsearch-pod.yaml"],
                documentation_files=["monitoring_guide.md"]
            )
        ]
        
        for task in sample_tasks:
            self.add_task(task)
            instructions = self.generate_task_instructions(task)
            
            # Simulate free agent working on task
            print(f"\n📝 SIMULATING FREE AGENT WORK ON {task.task_id}")
            print(f"Instructions provided to agent:")
            print(instructions[:200] + "..." if len(instructions) > 200 else instructions)
            
            # Generate simulated result
            simulated_result = AgentResult(
                task_id=task.task_id,
                agent_name=task.agent_name,
                generated_files={
                    f"generated_{task.task_id}_manifest.yaml": f"# Generated manifest for {task.description}\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: {task.task_id}\ndata:\n  config: |\n    # Configuration for {task.description}",
                    f"generated_{task.task_id}_docs.md": f"# Documentation for {task.description}\n\nThis documents the {task.description} component."
                },
                generated_configs=[{"name": f"config_{task.task_id}", "value": "generated_value"}],
                documentation=f"Comprehensive documentation for {task.description}",
                success=True
            )
            
            self.process_agent_result(simulated_result)
        
        return self.get_swarm_status()
    
    def get_swarm_status(self) -> Dict[str, Any]:
        """Get current status of the free agent swarm"""
        status = {
            "swarm_state": self.swarm_state.copy(),
            "active_agents": len(set(self.agents)),
            "pending_tasks": len([t for t in self.tasks if t.status in ["pending", "assigned"]]),
            "completed_tasks": len([t for t in self.tasks if t.status == "completed"]),
            "failed_tasks": len([t for t in self.tasks if t.status == "failed"]),
            "total_agents_used": len(self.agents),
            "average_completion_time": self._calculate_avg_completion_time()
        }
        return status
    
    def _calculate_avg_completion_time(self) -> float:
        """Calculate average task completion time"""
        completed_tasks = [t for t in self.tasks if t.completed_at and t.assigned_at]
        if not completed_tasks:
            return 0.0
        
        total_time = sum(
            (t.completed_at - t.assigned_at).total_seconds() 
            for t in completed_tasks
        )
        return total_time / len(completed_tasks)

# Example usage functions
def demonstrate_free_agent_orchestration():
    """Demonstrate how to use the free agent orchestrator"""
    orchestrator = FreeAgentSwarmOrchestrator()

    print("🚀 INITIATING FREE AGENT SWARM ORCHESTRATION DEMONSTRATION 🚀")
    print("Setting up system to work with free coding agents...")

    # Register agents with capabilities
    orchestrator.register_agent("free_agent_1", ["k8s", "yaml", "python"])
    orchestrator.register_agent("free_agent_2", ["ci", "github-actions", "yaml"])
    orchestrator.register_agent("free_agent_3", ["monitoring", "prometheus", "grafana", "elk"])

    # Run simulation
    status = orchestrator.run_swarm_simulation()

    # Example: Share a task among agents and set dependencies
    if orchestrator.tasks:
        orchestrator.share_task(orchestrator.tasks[0], ["free_agent_1", "free_agent_2"])
        orchestrator.set_task_dependency(orchestrator.tasks[1].task_id, [orchestrator.tasks[0].task_id])
        can_start = orchestrator.can_start_task(orchestrator.tasks[1].task_id)
        print(f"Dependency check for {orchestrator.tasks[1].task_id}: {can_start}")
        # Aggregate results for coordinated response
        resp = orchestrator.coordinated_response([t.task_id for t in orchestrator.tasks])
        print(f"Coordinated response: {json.dumps(resp, indent=2)}")

    print(f"\n📊 SWARM STATUS REPORT:")
    print(f"  Active Agents: {status['active_agents']}")
    print(f"  Pending Tasks: {status['pending_tasks']}")
    print(f"  Completed Tasks: {status['completed_tasks']}")
    print(f"  Failed Tasks: {status['failed_tasks']}")
    print(f"  Average Completion Time: {status['average_completion_time']:.2f}s")

    return orchestrator

if __name__ == "__main__":
    orchestrator = demonstrate_free_agent_orchestration()
