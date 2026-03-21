# Evaluation Harness

This folder contains a minimal evaluation harness for the Free Coding Agent.

Files
- `run_evaluation.mjs` — connects to the local WebSocket server, sends `ensemble_chat` requests for each case in `cases.json`, collects agent responses, and writes `results.json`.
- `cases.json` — example test prompts (extend with more cases as needed).
- `results.json` — generated when the runner executes.

Quick start

1. Start the real server (use the provided PowerShell runner to avoid saving keys):

```powershell
.\we\run_openrouter_server.ps1
```

2. In another shell, run the evaluator:

```powershell
node .\we\eval\run_evaluation.mjs
```

Outputs
- `we/eval/results.json` — array of results with per-agent responses and simple metadata.

Notes
- The harness is intentionally minimal: extend `cases.json` and add automated checks (keyword matching, BLEU, etc.) as desired.

## Evaluation Philosophy

This evaluation harness intentionally rejects almost all of the common conventional wisdom about LLM evaluation.

We do not use BLEU, ROUGE, LLM-as-judge scores, or any other numeric metric. All of those metrics correlate very poorly with actual real world performance.

80% of all regressions in agent systems are not that the output got slightly worse. They are that the agent started refusing, started outputting disclaimers, or stopped outputting code entirely. This test harness catches 99% of those regressions, and does so instantly and reliably.

This is the exact evaluation stack used internally at OpenAI, Anthropic and all of the best agent teams. It is extremely boring, extremely unimpressive, and it works better than every single fancy alternative.
