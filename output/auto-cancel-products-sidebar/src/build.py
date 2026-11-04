from pathlib import Path
import json
r=Path(__file__).resolve().parent
s=(r/'shell.html').read_text()
for key,content in [('STYLE',(r/'style.css').read_text()+'\n'+(r/'requirements.css').read_text()),('STATUS',(r/'status.html').read_text()),('ICONS',(r/'icons.json').read_text()),('DATA',(r/'data.json').read_text()),('APP',(r/'app.js').read_text()),('REQUIREMENTS',(r/'requirements.html').read_text())]:s=s.replace('__'+key+'__',content)
(r.parent/'stats.html').write_text(s)
reports=(r/'reports-shell.html').read_text().replace('</style>',(r/'requirements.css').read_text()+'\n</style>').replace('</div></div>\n<script>','</div>'+ (r/'requirements.html').read_text()+'</div>\n<script>')
(r.parent/'index.html').write_text(reports)
print('Built reports index.html and standalone stats.html')
