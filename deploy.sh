#!/bin/bash
# Automated deployment script
set -e
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run_game.py
