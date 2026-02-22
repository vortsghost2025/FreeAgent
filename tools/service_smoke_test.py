import sys
import os
import re
import time
import shutil
import tempfile
import subprocess
import requests

BASE = r"C:\workspace\DISTRIBUTED_MICROSERVICES_UNIVERSE"
SERVICES = [
    "consciousness-service",
    "narrative-service",
    "operator-gateway",
    "orchestrator-service",
    "reality-service",
    "temporal-service",
]

VENV_PY = os.path.join(r"C:\workspace\.venv-py312\Scripts", "python.exe")

def find_entrypoint_files(root):
    """Find probable ASGI/entrypoint Python files.

    Heuristics:
    - filenames: main.py, app.py, server.py, run.py, index.py
    - file contains indicators: FastAPI, Starlette, uvicorn.run, app =, create_app
    """
    matches = []
    candidate_names = {'main.py', 'app.py', 'server.py', 'run.py', 'index.py'}
    indicators = ['FastAPI(', 'from fastapi import', 'from starlette', 'uvicorn.run', 'app =', 'create_app', 'asgi_app', 'ASGI']
    for dirpath, _, files in os.walk(root):
        for f in files:
            if not f.endswith('.py'):
                continue
            path = os.path.join(dirpath, f)
            try:
                with open(path, 'r', encoding='utf-8') as fh:
                    txt = fh.read()
            except Exception:
                continue
            lowered = txt.lower()
            # filename heuristic
            if f in candidate_names:
                matches.append(path)
                continue
            # content heuristics
            for ind in indicators:
                if ind.lower() in lowered:
                    matches.append(path)
                    break
    # dedupe while preserving order
    seen = set()
    out = []
    for p in matches:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out

def start_uvicorn_runner(py_path, port, runner_path):
    # runner is a small script that imports the target file and runs uvicorn.run(m.app)
    runner_src = f"""
import importlib.util, uvicorn
spec = importlib.util.spec_from_file_location('mod', r'{py_path}')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
uvicorn.run(mod.app, host='127.0.0.1', port={port}, log_level='warning')
"""
    with open(runner_path, 'w', encoding='utf-8') as fh:
        fh.write(runner_src)
    return subprocess.Popen([VENV_PY, runner_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

def wait_for_http(url, timeout=6.0):
    deadline = time.time() + timeout
    last_exc = None
    while time.time() < deadline:
        try:
            r = requests.get(url, timeout=1.0)
            return (True, r.status_code, r.text[:1000])
        except Exception as e:
            last_exc = e
            time.sleep(0.3)
    return (False, None, repr(last_exc))

def main():
    results = []
    tmpdir = tempfile.mkdtemp(prefix='svc-smoke-')
    port_base = 9001
    try:
        for idx, svc in enumerate(SERVICES):
            svc_path = os.path.join(BASE, svc)
            print('\n===', svc, '===')
            if not os.path.isdir(svc_path):
                print('MISSING:', svc_path)
                results.append((svc, 'missing'))
                continue
            matches = find_entrypoint_files(svc_path)
            if not matches:
                print('NO FastAPI files found (skipping)')
                results.append((svc, 'no_fastapi'))
                continue
            # choose first match
            target = matches[0]
            port = port_base + idx
            runner_path = os.path.join(tmpdir, f'runner_{svc}_{idx}.py')
            print('Starting', target, 'on port', port)
            proc = start_uvicorn_runner(target, port, runner_path)
            ok, status, body = wait_for_http(f'http://127.0.0.1:{port}/', timeout=8.0)
            if ok:
                print('HTTP OK', status)
                results.append((svc, 'ok', port))
            else:
                print('HTTP FAILED', body)
                # capture stderr for debugging
                try:
                    stderr = proc.stderr.read().decode('utf-8', errors='ignore')
                except Exception:
                    stderr = '<no-stderr>'
                results.append((svc, 'failed', stderr))
            # terminate process
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except Exception:
                proc.kill()
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    print('\nSummary:')
    for r in results:
        print(r)

    # return non-zero if any failed starting FastAPI
    failed = [r for r in results if r[1] not in ('ok', 'no_fastapi')]
    sys.exit(0 if not failed else 2)

if __name__ == '__main__':
    main()
