import argparse
import json
import os
from pathlib import Path
from typing import Dict, Any

from swarm_tools.event_slicer import slice_by_days
from swarm_tools.event_filter import filter_events
from swarm_tools.auto_feed import feed_directory

STATE_FILE = Path("swarm_tools/state.json")
CONFIG_FILE = Path("swarm_tools/config.json")


def load_config() -> Dict[str, Any]:
    if not CONFIG_FILE.exists():
        raise FileNotFoundError(f"Config file not found: {CONFIG_FILE}")
    return json.loads(CONFIG_FILE.read_text())


def load_state() -> Dict[str, Any]:
    if not STATE_FILE.exists():
        return {}
    return json.loads(STATE_FILE.read_text())


def save_state(state: Dict[str, Any]) -> None:
    STATE_FILE.parent.mkdir(exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


def process_domain(domain: str) -> None:
    """Run the slice/filter/feed pipeline for a specific domain as
    defined in the config file.  Checkpointing keeps track of the
    last-sent file so restart resumes automatically.
    """
    cfg = load_config()
    if domain not in cfg:
        raise ValueError(f"domain {domain} not in config")
    domcfg = cfg[domain]
    input_file = Path(domcfg.get("input"))
    if not input_file.exists():
        raise FileNotFoundError(f"input file not found: {input_file}")
    # slicing
    slices_dir = Path(domcfg.get("slices_dir", "swarm_tools/slices")) / domain
    slice_by_days(input_file, slices_dir)
    # optional filtering
    keywords = domcfg.get("filter_keywords", [])
    filtered_dir = slices_dir / "filtered"
    for slice_file in sorted(slices_dir.glob("*.jsonl")):
        if keywords:
            out = filtered_dir / slice_file.name
            filter_events(slice_file, out, keywords)
    feed_dir = filtered_dir if keywords else slices_dir
    endpoint = domcfg.get("endpoint")
    state = load_state()
    last_sent = state.get(domain, {}).get("last_file")
    # feed files in alphabetical order, skipping up to last_sent
    for fname in sorted(feed_dir.glob("*.jsonl")):
        if last_sent and fname.name <= last_sent:
            continue
        print(f"feeding {fname} into swarm endpoint {endpoint}")
        feed_directory(feed_dir, endpoint)
        state.setdefault(domain, {})["last_file"] = fname.name
        save_state(state)


def run_workflow(domain: str, workflow_id: str, payload: Dict[str, Any]) -> None:
    # send a workflow trigger to the configured endpoint
    cfg = load_config()
    domcfg = cfg.get(domain, {})
    endpoint = domcfg.get("workflow_endpoint")
    if not endpoint:
        raise ValueError(f"no workflow_endpoint defined for {domain}")
    import requests

    resp = requests.post(endpoint, json={"workflowId": workflow_id, **payload})
    resp.raise_for_status()
    print("workflow started", resp.text)


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd")

    parser_process = sub.add_parser("process")
    parser_process.add_argument("domain")

    parser_run = sub.add_parser("run-workflow")
    parser_run.add_argument("domain")
    parser_run.add_argument("workflow_id")
    parser_run.add_argument("payload", help="JSON string of payload")

    parser_ck = sub.add_parser("checkpoint")
    parser_ck.add_argument("domain")
    parser_ck.add_argument("file")

    args = parser.parse_args()
    if args.cmd == "process":
        process_domain(args.domain)
    elif args.cmd == "run-workflow":
        payload = json.loads(args.payload)
        run_workflow(args.domain, args.workflow_id, payload)
    elif args.cmd == "checkpoint":
        state = load_state()
        state.setdefault(args.domain, {})["last_file"] = args.file
        save_state(state)
        print("checkpoint saved")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
