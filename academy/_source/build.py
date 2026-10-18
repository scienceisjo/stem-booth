"""Rebuild only academy/index.html from the versioned local source.
Run: python academy/_source/build.py
PDFs and assets are already versioned beside index.html; no external PDF_ROOT.
"""
from pathlib import Path
import json, hashlib
HERE=Path(__file__).resolve().parent
DEST=HERE.parent
data=json.loads((HERE/'course.json').read_text(encoding='utf8'))
for resource in data['resources']:
 p=DEST/'resources'/resource['file']
 if not p.exists():raise FileNotFoundError(p)
 if hashlib.sha256(p.read_bytes()).hexdigest()!=resource['sha256']:
  raise ValueError('PDF changed: update course.json manifest before rebuilding: '+resource['file'])
text=(HERE/'shell.html').read_text(encoding='utf8')
for token,name in [('/*STYLE*/','hub.css'),('/*APP*/','hub.js'),('/*VOICE*/','hub-voice.js'),('/*AUDIO*/','audio.js'),('/*RAM_CIRCUIT*/','ram-circuit.js')]:
 assert text.count(token)==1,token
 text=text.replace(token,(HERE/name).read_text(encoding='utf8'))
assert text.count('/*CONTENT*/')==1
text=text.replace('/*CONTENT*/',json.dumps(data,ensure_ascii=False).replace('<','\\u003c'))
(DEST/'index.html').write_text(text,encoding='utf8')
print('Built '+str(DEST/'index.html'))
