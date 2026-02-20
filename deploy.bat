@echo off
REM Automated deployment script
python -m venv .venv
call .venv\Scripts\activate
pip install -r requirements.txt
python run_game.py
