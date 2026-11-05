"""Run independent Blender jobs and retain per-item logs for resumable batches."""
import concurrent.futures
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent
manifest = root / 'manifest.json'
items = json.loads(manifest.read_text())['items']

def render(item):
    if Path(item['image']).exists():
        return {'id': item['id'], 'status': 'ready'}
    try:
        with (root / (item['id'] + '.log')).open('w') as log:
            subprocess.run(['blender', '-b', '-t', '2', '--python', str(root / 'render.py'),
                            '--', str(manifest), item['id']], stdout=log, stderr=subprocess.STDOUT,
                           timeout=240, check=True)
        if not Path(item['image']).exists():
            raise RuntimeError('Image was not written')
        return {'id': item['id'], 'status': 'ready'}
    except Exception as error:
        return {'id': item['id'], 'status': 'failed', 'error': str(error)}

results = []
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for result in pool.map(render, items):
        results.append(result)
        (root / 'render-status.json').write_text(json.dumps(results, indent=2))
        print(result['id'], result['status'], flush=True)
