# Cooking AI Agent

This is a simple interactive console application demonstrating a
Cooking Assistant agent built with the Microsoft Agent Framework and a
GitHub-hosted model.

## Setup

1. Create and activate a Python virtual environment in the repository
   root:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install requirements:

   ```powershell
   pip install -r cooking_agent/requirements.txt
   ```

3. Obtain a GitHub models API token and export it:

   ```powershell
   setx GITHUB_API_KEY "<your-token>"
   # reopen your shell or use $env:GITHUB_API_KEY to set for current session
   ```

4. Run the console:

   ```powershell
   python cooking_agent/console_app.py
   ```

## Features

* `search_recipe` tool looks up a hard‑coded recipe by query.
* `extract_ingredients` tool scans a block of text for known
  ingredients.
* Conversation state is preserved in a thread for multi‑turn dialogs.

You can extend the tools or swap the model to common OpenAI/Foundry
deployments by editing `agent.create_agent`.  Enjoy!
