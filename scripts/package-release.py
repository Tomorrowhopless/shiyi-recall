#!/usr/bin/env python3
"""Package public build files only, validate assets, and record file hashes."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
OUTPUT = ROOT / 'Cloudflare发布'
OUTPUT.mkdir(exist_ok=True)
VERSION = json.loads((ROOT / 'package.json').read_text())['version']
PACKAGE = OUTPUT / f'拾忆-Cloudflare上传包-v{VERSION}.zip'
assert (DIST / 'index.html').is_file(), 'Run npm run build first.'
files = sorted(p for p in DIST.rglob('*') if p.is_file())
assert len(files) < 1000
assert all(p.stat().st_size < 25 * 1024 * 1024 for p in files)
html = (DIST / 'index.html').read_text()
for asset in re.findall(r'(?:src|href)="(/[^"#]+)"', html):
    assert (DIST / asset.lstrip('/')).is_file(), f'Missing entry asset: {asset}'
for css in DIST.rglob('*.css'):
    for asset in re.findall(r'url\(([^)]+)\)', css.read_text()):
        asset = asset.strip('\'"')
        if not asset.startswith(('data:', 'https:', 'http:')):
            target = DIST / asset.lstrip('/') if asset.startswith('/') else css.parent / asset
            assert target.is_file(), f'Missing CSS asset: {asset}'
assert (DIST / 'THIRD_PARTY_NOTICES.txt').is_file()
assert not any(p.suffix in ('.env', '.map') or '备份' in p.name for p in files)
with zipfile.ZipFile(PACKAGE, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, path.relative_to(DIST).as_posix())
with zipfile.ZipFile(PACKAGE) as archive:
    assert archive.testzip() is None
    assert 'index.html' in archive.namelist()
    assert all(not n.startswith('dist/') for n in archive.namelist())
sha = lambda content: hashlib.sha256(content).hexdigest()
manifest = {
    'name': '拾忆', 'version': VERSION, 'hosting': 'Cloudflare Pages Direct Upload',
    'deployed': False, 'archive': PACKAGE.name, 'archiveBytes': PACKAGE.stat().st_size,
    'archiveSha256': sha(PACKAGE.read_bytes()),
    'files': {p.relative_to(DIST).as_posix(): sha(p.read_bytes()) for p in files},
}
(OUTPUT / '发布校验.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'archive': str(PACKAGE), 'files': len(files), 'bytes': PACKAGE.stat().st_size, 'sha256': manifest['archiveSha256'], 'asset_checks': 'passed', 'zip_checks': 'passed'}, ensure_ascii=False))
