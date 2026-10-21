"""Build native editable Sketch layers from browser-computed scene geometry."""
from pathlib import Path
import json,copy,uuid,re,math,hashlib,base64,zipfile
from collections import Counter
from PIL import Image,ImageDraw,ImageFont
from svgpathtools import parse_path,Line,CubicBezier,QuadraticBezier,Arc
ROOT=Path(__file__).resolve().parent.parent
T=json.loads((ROOT/'source/templates.json').read_text())
S=json.loads((ROOT/'source/scenes.json').read_text())
images={};counts=Counter()
def uid():return str(uuid.uuid4()).upper()
def fresh(k):
 d=copy.deepcopy(T[k])
 def fix(v):
  if isinstance(v,dict):
   for k,x in v.items():
    if k=='do_objectID':v[k]=uid()
    elif k=='isVisible':v[k]=True
    elif k=='resizingConstraint':v[k]=63
    elif k in ('opacity','contrast','saturation'):v[k]=1
    else:fix(x)
  elif isinstance(v,list):
   for x in v:fix(x)
 fix(d);return d
def num(v,default=0):
 try:return float(re.search(r'-?[\d.]+',str(v))[0])
 except:return default
def col(v):
 if not v or v in ('none','transparent'):return dict(_class='color',red=0,green=0,blue=0,alpha=0)
 if v.startswith('#'):
  h=v[1:];h=''.join(c*2 for c in h) if len(h) in (3,4) else h;return dict(_class='color',red=int(h[0:2],16)/255,green=int(h[2:4],16)/255,blue=int(h[4:6],16)/255,alpha=int(h[6:8],16)/255 if len(h)==8 else 1)
 a=[float(x) for x in re.findall(r'[\d.]+',v)]
 if len(a)<3:raise ValueError(v)
 return dict(_class='color',red=a[0]/255,green=a[1]/255,blue=a[2]/255,alpha=a[3] if len(a)>3 else 1)
def frame(x,y,w,h):return dict(_class='rect',constrainProportions=False,x=x,y=y,width=max(w,.001),height=max(h,.001))
def pt(z,cf=None,ct=None,r=0):
 def p(z):return '{%.9g, %.9g}'%(z.real,z.imag)
 d=fresh('CurvePoint');d.update(point=p(z),curveFrom=p(cf if cf is not None else z),curveTo=p(ct if ct is not None else z),hasCurveFrom=cf is not None,hasCurveTo=ct is not None,curveMode=4 if cf is not None or ct is not None else 1,cornerRadius=r);return d
def style(fill=None,stroke=None,width=0):
 s=fresh('Style');s['fills']=[];s['borders']=[];s['shadows']=[];s['miterLimit']=10;s['contextSettings']={'_class':'graphicsContextSettings','blendMode':0,'opacity':1}
 if fill and col(fill)['alpha']:
  f=fresh('Fill');f.update(color=col(fill),fillType=0,isEnabled=True);s['fills']=[f]
 if stroke and col(stroke)['alpha'] and width>0:
  f=fresh('Fill');allowed={'isEnabled','color','fillType','contextSettings','gradient'};b={k:v for k,v in f.items() if k in allowed};b.update(_class='border',color=col(stroke),fillType=0,isEnabled=True,position=0,thickness=width);s['borders']=[b]
 return s
def rect(name,x,y,w,h,fill=None,radii=None,stroke=None,bw=0):
 d=fresh('Rectangle');rs=radii or [0]*4;d.update(name=name,frame=frame(x,y,w,h),style=style(fill,stroke,bw),fixedRadius=rs[0],isClosed=True,pointRadiusBehaviour=1,hasConvertedToNewRoundCorners=True,needsConvertionToNewRoundCorners=False,points=[pt(z,r=r) for z,r in zip([0j,1+0j,1+1j,1j],rs)]);return d
def radii(st,w,h):return [min(w/2,h/2,num(st.get('border'+c+'Radius'))*(min(w,h)/100 if '%' in st.get('border'+c+'Radius','') else 1)) for c in ['TopLeft','TopRight','BottomRight','BottomLeft']]
def bitmap(data,name,x,y,w,h,hidden=False):
 key='images/'+hashlib.sha1(data).hexdigest()+'.png';images[key]=data
 allowed=set(T['Group'])-{'layers','hasClickThrough'}
 d={k:v for k,v in fresh('Group').items() if k in allowed};d.update(_class='bitmap',name=name,frame=frame(x,y,w,h),image={'_class':'MSJSONFileReference','_ref_class':'MSImageData','_ref':key},intendedDPI=144,clippingMask='{{0, 0}, {1, 0}, {1, 1}, {0, 1}}',fillReplacesImage=False,isVisible=not hidden,isLocked=hidden);return d
arts={s['id']:fresh('Artboard') for s in S['scenes']}
def vectors(n,ox,oy):
 a=n['attrs'];tag=n['tag'];st=n['style'];m=n['matrix']
 def tr(z):return complex(m[0]*z.real+m[2]*z.imag+m[4],m[1]*z.real+m[3]*z.imag+m[5])
 if tag=='path':data=a.get('d','')
 elif tag=='line':data='M %s %s L %s %s'%(a.get('x1',0),a.get('y1',0),a.get('x2',0),a.get('y2',0))
 elif tag in ('polyline','polygon'):data='M '+a.get('points','')+(' Z' if tag=='polygon' else '')
 elif tag in ('circle','ellipse'):
  x=num(a.get('cx'));y=num(a.get('cy'));rx=num(a.get('r',a.get('rx')));ry=num(a.get('r',a.get('ry')));data=f'M {x-rx} {y} A {rx} {ry} 0 1 0 {x+rx} {y} A {rx} {ry} 0 1 0 {x-rx} {y} Z'
 elif tag=='rect':
  x=num(a.get('x'));y=num(a.get('y'));w=num(a.get('width'));h=num(a.get('height'));data=f'M{x} {y}h{w}v{h}h{-w}Z'
 else:return []
 if not data:return []
 path=parse_path(data);out=[]
 for sub in path.continuous_subpaths():
  segs=[]
  for v in sub:
   if isinstance(v,Arc):segs.extend(v.as_cubic_curves(max(1,math.ceil(abs(v.delta)/45))))
   elif isinstance(v,QuadraticBezier):segs.append(CubicBezier(v.start,v.start+2/3*(v.control-v.start),v.end+2/3*(v.control-v.end),v.end))
   else:segs.append(v)
  if not segs:continue
  nodes=[{'p':tr(segs[0].start)}]
  for seg in segs:
   if isinstance(seg,CubicBezier):nodes[-1]['out']=tr(seg.control1)
   nodes.append({'p':tr(seg.end),**({'in':tr(seg.control2)} if isinstance(seg,CubicBezier) else {})})
  closed=abs(nodes[-1]['p']-nodes[0]['p'])<1e-6
  if closed:nodes[0].update({'in':nodes[-1]['in']} if 'in' in nodes[-1] else {});nodes.pop()
  vals=[v for node in nodes for v in node.values()];x=min(v.real for v in vals);y=min(v.imag for v in vals);w=max(.001,max(v.real for v in vals)-x);h=max(.001,max(v.imag for v in vals)-y)
  def norm(z):return complex((z.real-x)/w,(z.imag-y)/h)
  d=fresh('ShapePath');s=style(st.get('fill'),st.get('stroke'),num(st.get('strokeWidth'),1)*math.sqrt(abs(m[0]*m[3]-m[1]*m[2])))
  s['borderOptions'].update(isEnabled=True,dashPattern=[num(v) for v in re.findall(r'[\d.]+',st.get('strokeDasharray',''))],lineCapStyle=1 if st.get('strokeLinecap')=='round' else 0,lineJoinStyle=1 if st.get('strokeLinejoin')=='round' else 0)
  d.update(name=n['name'],frame=frame(x-ox,y-oy,w,h),isClosed=closed,points=[pt(norm(v['p']),norm(v['in']) if 'in' in v else None,norm(v['out']) if 'out' in v else None) for v in nodes],style=s);out.append(d)
 return out

def build(n,ox=0,oy=0):
 r=n['rect'];x,y,w,h=r['x'],r['y'],r['w'],r['h'];st=n.get('style',{});kind=n['kind'];name=n['name']
 if kind=='vector':return vectors(n,ox,oy)
 if kind=='image':return [bitmap(base64.b64decode(n['png'].split(',')[1]),name,x-ox,y-oy,w,h)]
 if kind=='text':
  size=num(st.get('fontSize'),15);lh=num(st.get('lineHeight'),size*1.2);weight=num(st.get('fontWeight'),400)
  attrs={'MSAttributedStringFontAttribute':{'_class':'fontDescriptor','attributes':{'name':'PingFangSC-Semibold' if weight>=600 else 'PingFangSC-Regular','size':size}},'MSAttributedStringColorAttribute':col(st.get('fill') if n.get('svg') else st.get('color')),'paragraphStyle':{'_class':'paragraphStyle','alignment':0,'minimumLineHeight':lh,'maximumLineHeight':lh},'kerning':num(st.get('letterSpacing'))}
  d=fresh('Text');s=style();s['textStyle']={'_class':'textStyle','verticalAlignment':0,'encodedAttributes':attrs};d.update(name=name,frame=frame(x-ox,y-oy,w+1,h+1),glyphBounds='{{0, 0}, {%s, %s}}'%(w,h),textBehaviour=1,style=s,attributedString={'_class':'attributedString','string':n['text'],'attributes':[{'_class':'stringAttribute','location':0,'length':len(n['text'].encode('utf-16-le'))//2,'attributes':attrs}]});return [d]
 g=fresh('Group');g.update(name=name,frame=frame(x-ox,y-oy,w,h));g['style']=style();g['style']['contextSettings']['opacity']=num(st.get('opacity'),1);layers=[]
 rs=radii(st,w,h);bg=rect('背景',0,0,w,h,st.get('backgroundColor'),rs)
 # CSS shadows, including multi-shadow values.
 for match in re.finditer(r'(rgba?\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+(-?[\d.]+)px)?',st.get('boxShadow','')):
  c,dx,dy,blur,spread=match.groups();sh=fresh('Shadow');sh.update(isEnabled=True,color=col(c),offsetX=float(dx),offsetY=float(dy),blurRadius=float(blur),spread=float(spread or 0));bg['style']['shadows'].append(sh)
 blur=re.search(r'blur\(([\d.]+)px',st.get('backdropFilter',''))
 if blur:bg['style']['blur']={'_class':'blur','isEnabled':True,'center':'{0.5, 0.5}','saturation':1,'type':3,'radius':float(blur[1]),'motionAngle':0}
 widths=[num(st.get('border'+side+'Width')) for side in ['Top','Right','Bottom','Left']];colors=[st.get('border'+side+'Color') for side in ['Top','Right','Bottom','Left']]
 if widths[0]>0 and len(set(widths))==1 and len(set(colors))==1:
  bg['style']['borders']=style(stroke=colors[0],width=widths[0])['borders'];bg['style']['borders'][0]['position']=1
 if n.get('clip'):
  mask=rect('内容裁切',0,0,w,h,'rgb(255,255,255)',rs);mask.update(hasClippingMask=True,clippingMaskMode=0);mask['style']['fills']=[];layers.append(mask)
 if bg['style']['fills'] or bg['style']['borders'] or bg['style']['shadows'] or blur:layers.append(bg)
 if len(set(widths))!=1 or len(set(colors))!=1:
  for i,b in enumerate(widths):
   if b:
    coords=[(0,0,w,b),(w-b,0,b,h),(0,h-b,w,b),(0,0,b,h)][i];layers.append(rect('边线',*coords,colors[i]))
 for child in n.get('children',[]):layers.extend(build(child,x,y))
 g['layers']=layers
 target=n.get('target') or {};target=({'pm':'manager','store':'market'}.get(target.get('key'),target.get('key')) if target.get('type')=='detail' else target.get('key','date-filter' if target.get('type')=='date' else None));target={'product':'product','category':'category','pm':'manager','bar':'home-bar','line':'home-line',**{s['id']:s['id'] for s in S['scenes']}}.get(target)
 if target in arts:g['flow']={'_class':'MSImmutableFlowConnection','destinationArtboardID':arts[target]['do_objectID'],'animationType':0}
 return [g] if layers else []

rowy=0
for i,scene in enumerate(S['scenes']):
 if i and i%4==0:rowy+=max(s['height'] for s in S['scenes'][i-4:i])+140
 art=arts[scene['id']];art.update(name=scene['name'],frame=frame((i%4)*475,rowy,375,math.ceil(scene['height'])),hasBackgroundColor=True,backgroundColor=col('rgb(244,248,245)'),includeBackgroundColorInExport=True,layers=build(scene['tree']))
 art['layers'].insert(0,bitmap((ROOT/scene['preview']).read_bytes(),'HTML参考截图（隐藏，仅供对照）',0,0,375,scene['height'],True))
page=fresh('Page');page.update(name='退款金额统计 · 可编辑设计',frame=frame(0,0,1800,rowy+1100),layers=list(arts.values()))
doc=fresh('Document');doc.update(colorSpace=0,pages=[{'_class':'MSJSONFileReference','_ref_class':'MSImmutablePage','_ref':'pages/'+page['do_objectID']}])
meta=fresh('Meta');meta.update(version=146,appVersion='78',build=0,commit='',app='com.bohemiancoding.sketch3',variant='NONAPPSTORE',pagesAndArtboards={page['do_objectID']:{'name':page['name'],'artboards':{a['do_objectID']:{'name':a['name']} for a in arts.values()}}});meta['created'].update(version=146,appVersion='78',build=0,commit='',app='com.bohemiancoding.sketch3',compatibilityVersion=99,variant='NONAPPSTORE')
user={'document':{'pageListHeight':120,'pageListCollapsed':0},page['do_objectID']:{'scrollOrigin':'{0, 0}','zoomValue':.5}}
# Contact sheet is explicitly a browser reference, not a Sketch-rendered preview.
font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',16,index=2)
contact=Image.new('RGB',(1280,4*960),'#e8efea');draw=ImageDraw.Draw(contact)
for i,scene in enumerate(S['scenes']):
 im=Image.open(ROOT/scene['preview']).convert('RGB');im.thumbnail((280,880));x=(i%4)*320+20;y=(i//4)*960+52;contact.paste(im,(x,y));draw.text((x,y-30),scene['name'],font=font,fill='#20382c')
contact.save(ROOT/'previews/overview.png',optimize=True)
parts={'document.json':doc,'meta.json':meta,'user.json':user,'pages/'+page['do_objectID']+'.json':page}
with zipfile.ZipFile(ROOT/'refund-report-mobile.sketch','w',zipfile.ZIP_DEFLATED) as z:
 for name,obj in parts.items():z.writestr(name,json.dumps(obj,ensure_ascii=False,separators=(',',':')))
 for name,data in images.items():z.writestr(name,data)
 z.write(ROOT/'previews/overview.png','previews/preview.png')
def walk(n):
 counts[n['_class']]+=1
 for c in n.get('layers',[]):walk(c)
walk(page)
(ROOT/'source/manifest.json').write_text(json.dumps({'sourceSha256':S['sourceSha256'],'artboards':len(arts),'layers':dict(counts),'embeddedImages':len(images)},ensure_ascii=False,indent=2)+'\n')
print(dict(counts));print(ROOT/'refund-report-mobile.sketch')
