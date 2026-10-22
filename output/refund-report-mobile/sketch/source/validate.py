"""Validate the archive and official Sketch schemas. Pass the npm package dist directory."""
import sys,json,zipfile,hashlib
from pathlib import Path
from collections import Counter
import jsonschema
ROOT=Path(__file__).resolve().parent.parent
schema_dir=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'source/node_modules/@sketch-hq/sketch-file-format/dist'
manifest=json.loads((ROOT/'source/manifest.json').read_text())
assert hashlib.sha256((ROOT.parent/'refund.html').read_bytes()).hexdigest()==manifest['sourceSha256']
with zipfile.ZipFile(ROOT/'refund-report-mobile.sketch') as z:
 assert z.testzip() is None
 objects={n:json.loads(z.read(n)) for n in z.namelist() if n.endswith('.json')}
 for name,obj in objects.items():
  kind='page' if name.startswith('pages/') else name[:-5]
  jsonschema.Draft7Validator(json.loads((schema_dir/(kind+'.schema.json')).read_text())).validate(obj)
 ids=[];flows=[];types=Counter();texts=[];visible_bitmaps=[]
 def walk(n,hidden=False):
  if isinstance(n,list):
   for v in n:walk(v,hidden)
  elif isinstance(n,dict):
   hidden=hidden or n.get('isVisible') is False
   if 'do_objectID' in n:ids.append(n['do_objectID'])
   if '_ref' in n:
    ref=n['_ref'];assert ref in z.namelist() or ref+'.json' in z.namelist(),ref
   if '_class' in n:types[n['_class']]+=1
   if n.get('_class')=='MSImmutableFlowConnection':flows.append(n['destinationArtboardID'])
   if n.get('_class')=='text':texts.append(n['attributedString']['string'])
   if n.get('_class')=='bitmap' and not hidden:visible_bitmaps.append(n['frame'])
   for k,v in n.items():
    if isinstance(v,(dict,list)):walk(v,hidden)
 for obj in objects.values():walk(obj)
 assert len(ids)==len(set(ids)), 'Duplicate IDs'
 boards={l['do_objectID'] for p in objects.values() if p.get('_class')=='page' for l in p['layers']}
 assert len(boards)==14
 assert all(f in boards for f in flows)
 assert all(b['width']<=60 and b['height']<=60 for b in visible_bitmaps),'Flattened visible UI'
 joined=''.join(texts).replace('\n','')
 for phrase in ['按商品统计','按商品分类统计','按产品经理统计','按市场/门店统计','规则说明','由门店店员手动超时退单、系统自动退单','已选 2 个商品','已选 3 个二级分类','已选 2 位产品经理']:
  assert phrase.replace(' ','') in joined.replace(' ',''),phrase
 for phrase in ['未选择商品，将查询全部商品','未选择分类，将查询全部分类','未选择，将查询全部产品经理','每日退款金额 · 与上方筛选同步']:
  assert phrase not in joined,phrase
 print(json.dumps({'schemaValidation':'passed','archiveCRC':'passed','uniqueIDs':len(ids),'artboards':len(boards),'nativeTextLayers':types['text'],'nativeVectorPaths':types['shapePath'],'prototypeLinks':len(flows),'visibleThumbnailBitmaps':len(visible_bitmaps),'sourceSha256':manifest['sourceSha256']},ensure_ascii=False,indent=2))
