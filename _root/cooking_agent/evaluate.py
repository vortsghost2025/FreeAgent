import json
import os
import asyncio
from typing import List

from agent import create_agent


def load_prompts(path: str) -> List[dict]:
    prompts = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                prompts.append(json.loads(line))
    return prompts


async def run_evaluation(agent, prompts: List[dict]) -> None:
    thread = agent.get_new_thread()
    correct = 0
    total = len(prompts)

    for entry in prompts:
        prompt = entry["prompt"]
        expected = entry.get("expected_contains", "")

        print(f"Prompt: {prompt}")
        result = await agent.run(prompt, thread=thread)
        text = result.text.strip()
        print(f"Response: {text}\n")

        if expected and expected.lower() in text.lower():
            correct += 1

    print("--- Evaluation Summary ---")
    print(f"Total: {total}, Correct: {correct}, Accuracy: {correct/total:.2%}")


async def main() -> None:
    token = os.environ.get("GITHUB_API_KEY")
    if not token:
        print("Please set GITHUB_API_KEY in environment before running.")
        return

    agent = create_agent(github_token=token)
    prompts = load_prompts("cooking_agent/sample_prompts.jsonl")
    await run_evaluation(agent, prompts)


if __name__ == "__main__":
    asyncio.run(main())
