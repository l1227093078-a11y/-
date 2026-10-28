"""Bundle the standalone H5, source, documentation and visual evidence."""
from pathlib import Path
import hashlib,json,zipfile,subprocess
ROOT=Path(__file__).resolve().parent.parent
subprocess.run(['python3',str(ROOT/'src/build.py')],check=True)
files=[ROOT/name for name in ['index.html','package.json','README.md','THIRD_PARTY_NOTICES.md','design-qa.md']]
for folder in ['src','previews']:
 files.extend(p for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
files=sorted(set(files))
manifest={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
archive=ROOT.parent/'recommendations-h5.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files:z.write(p,'recommendations-h5/'+str(p.relative_to(ROOT)))
 z.writestr('recommendations-h5/SHA256SUMS.json',json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for name,digest in manifest.items():assert hashlib.sha256(z.read('recommendations-h5/'+name)).hexdigest()==digest
print('Verified',archive,len(files),'files',archive.stat().st_size,'bytes')
