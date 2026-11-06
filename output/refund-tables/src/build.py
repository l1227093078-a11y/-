from pathlib import Path
import json
s=Path(__file__).resolve().parent
icons=json.loads((s/'table-icons.json').read_text())
logic='Object.assign(ICONS,'+json.dumps(icons,ensure_ascii=False)+');\n'+(s/'table.js').read_text()
html=(s/'template.html').read_text().replace('__TABLE_LOGIC__',logic).replace('__TABLE_STYLES__',(s/'table.css').read_text())
(s.parent/'index.html').write_text(html)
print('Built standalone table-preview index.html')
