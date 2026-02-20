"""
SERVICE_REGISTRY.PY
Central registry for dynamic discovery of universe subsystems (microservices).
"""

import threading
from typing import Dict

class ServiceRegistry:
    def __init__(self):
        self.services: Dict[str, str] = {}
        self.lock = threading.Lock()

    def register(self, name: str, address: str):
        with self.lock:
            self.services[name] = address
            print(f"Registered service: {name} at {address}")

    def get_service(self, name: str) -> str:
        with self.lock:
            return self.services.get(name)

    def list_services(self):
        with self.lock:
            return dict(self.services)

# Example usage
if __name__ == "__main__":
    registry = ServiceRegistry()
    registry.register("quantum_awareness", "http://localhost:8001")
    registry.register("temporal_stability", "http://localhost:8002")
    print(registry.list_services())
