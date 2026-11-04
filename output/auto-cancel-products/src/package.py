from pathlib import Path
import subprocess,zipfile,hashlib,json
r=Path(__file__).resolve().parent.parent
subprocess.run(['python3',str(r/'src/build.py')],check=True)
files=sorted(p for p in r.rglob('*') if p.is_file())
with zipfile.ZipFile(r.parent/'auto-cancel-products-h5.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,p.relative_to(r))
 z.writestr('SHA256SUMS.json',json.dumps({str(p.relative_to(r)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},indent=2))
with zipfile.ZipFile(r.parent/'auto-cancel-products-h5.zip') as z:assert z.testzip() is None
print('Packaged auto-cancel-products-h5.zip')
