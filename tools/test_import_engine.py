import os
import sys
import traceback

print("CWD:", os.getcwd())
print("__file__ dir:", os.path.abspath(os.path.dirname(__file__)))
print("sys.path[0]:", sys.path[0])
print("sys.path snippet:", sys.path[:5])

try:
    import quantum_ahead_game_engine
    print("Imported quantum_ahead_game_engine OK ->", getattr(quantum_ahead_game_engine, '__name__', str(quantum_ahead_game_engine)))
except Exception as e:
    print("IMPORT ERROR:")
    traceback.print_exc()
