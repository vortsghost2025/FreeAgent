import asyncio
import os

from agent import create_agent


async def main() -> None:
    token = os.environ.get("GITHUB_API_KEY")
    if not token:
        print("Please set GITHUB_API_KEY in environment before running.")
        return

    agent = create_agent(github_token=token)
    thread = agent.get_new_thread()

    print("Cooking AI console. Type 'exit' to quit.")
    while True:
        prompt = input("You: ")
        if prompt.lower().strip() == "exit":
            break

        print("Assistant: ", end="", flush=True)
        async for chunk in agent.run_stream(prompt, thread=thread):
            if chunk.text:
                print(chunk.text, end="", flush=True)
        print("\n")

    print("Goodbye!")


if __name__ == "__main__":
    asyncio.run(main())
