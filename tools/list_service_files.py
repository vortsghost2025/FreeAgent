import os

SERVICES_DIR = r"C:\workspace\DISTRIBUTED_MICROSERVICES_UNIVERSE"
SERVICES = [
    "consciousness-service",
    "narrative-service",
    "operator-gateway",
    "orchestrator-service",
    "reality-service",
    "temporal-service",
]

for svc in SERVICES:
    base = os.path.join(SERVICES_DIR, svc)
    print('\n===', svc, '===')
    if not os.path.isdir(base):
        print('MISSING:', base)
        continue
    found = False
    for root, dirs, files in os.walk(base):
        for f in files:
            if f.endswith('.py'):
                found = True
                print(os.path.join(root, f))
    if not found:
        print('NO .py FILES FOUND')
