"""Generate the standalone, offline-capable H5 without installing dependencies."""
from pathlib import Path
import json
SOURCE=Path(__file__).resolve().parent
html=(SOURCE/'shell.html').read_text()
for key,content in {'STYLE':(SOURCE/'style.css').read_text(),'STATUS':(SOURCE/'status.html').read_text(),'ASSETS':json.dumps(json.loads((SOURCE/'assets.json').read_text()),ensure_ascii=False,separators=(',',':')),'SCRIPT':(SOURCE/'app.js').read_text()}.items():html=html.replace('__'+key+'__',content)
(SOURCE.parent/'index.html').write_text(html)
print('Built',SOURCE.parent/'index.html')
