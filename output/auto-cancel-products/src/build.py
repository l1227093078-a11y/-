from pathlib import Path
import json
r=Path(__file__).resolve().parent
s=(r/'shell.html').read_text()
for key,content in [('STYLE',(r/'style.css').read_text()),('STATUS',(r/'status.html').read_text()),('ICONS',(r/'icons.json').read_text()),('DATA',(r/'data.json').read_text()),('APP',(r/'app.js').read_text())]:s=s.replace('__'+key+'__',content)
(r.parent/'index.html').write_text(s)
print('Built standalone index.html')
