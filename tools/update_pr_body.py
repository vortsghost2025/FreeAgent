import os
import sys
import requests

TOKEN = os.environ.get('GITHUB_TOKEN')
if not TOKEN:
    print('ERROR: GITHUB_TOKEN not found in environment')
    sys.exit(2)

with open('PR_UPDATE_NOTES.md', 'r', encoding='utf-8') as f:
    body = f.read()

url = 'https://api.github.com/repos/vortsghost2025/Deliberate-AI-Ensemble/pulls/3'
headers = {
    'Authorization': f'token {TOKEN}',
    'Accept': 'application/vnd.github+json'
}

resp = requests.patch(url, headers=headers, json={'body': body})
print('status', resp.status_code)
print(resp.text)
