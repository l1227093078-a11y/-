from pathlib import Path
import subprocess,zipfile,json,hashlib
root=Path(__file__).resolve().parent.parent
subprocess.run(['python3',str(root/'src/build.py')],check=True)
files=sorted(p for p in root.rglob('*') if p.is_file())
zip_path=root.parent/'refund-tables-h5.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as archive:
 for p in files:archive.write(p,p.relative_to(root))
 archive.writestr('SHA256SUMS.json',json.dumps({str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},indent=2))
with zipfile.ZipFile(zip_path) as archive:assert archive.testzip() is None
print('Packaged refund-tables-h5.zip')
