import os
import sys
import traceback

print("CWD:", os.getcwd())
print("sys.path[0]:", sys.path[0])
print("sys.path snippet:", sys.path[:5])

try:
    import QUANTUM_AHEAD_GAME_API as api
    print("Imported QUANTUM_AHEAD_GAME_API OK")
    print("api module file:", getattr(api, '__file__', None))
except Exception:
    traceback.print_exc()
