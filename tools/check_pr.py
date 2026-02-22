import json
from urllib.request import urlopen

url = 'https://api.github.com/repos/vortsghost2025/Deliberate-AI-Ensemble/pulls/3'
with urlopen(url) as resp:
    pr = json.load(resp)

print('Number:', pr.get('number'))
print('Title:', pr.get('title'))
body = pr.get('body') or ''
print('Body chars:', len(body))
print('URL:', pr.get('html_url'))
print('Updated:', pr.get('updated_at'))
