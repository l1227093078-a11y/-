"""Rebuild the native Sketch document and a reference PNG. Requires Pillow for PNG.
Templates follow @sketch-hq/sketch-file-format 6.5.0 (document version 146).
"""
from pathlib import Path
import copy, json, uuid, zipfile, math, io
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT=Path(__file__).resolve().parent.parent
T=json.loads((ROOT/'source/templates.json').read_text())
W,H=1239,1152
canvas=Image.new('RGBA',(W,H),'#eaf1ff')
stack=[]; groups=[]
def uid():return str(uuid.uuid4()).upper()
def fresh(n):
 d=copy.deepcopy(T[n])
 def fix(x):
  if isinstance(x,dict):
   for k,v in x.items():
    if k=='do_objectID':x[k]=uid()
    elif k=='isVisible':x[k]=True
    elif k=='resizingConstraint':x[k]=63
    elif k=='opacity':x[k]=1
    elif k=='contrast' or k=='saturation':x[k]=1
    else:fix(v)
  elif isinstance(x,list):
   for v in x:fix(v)
 fix(d);return d
def color(c):
 if isinstance(c,dict):return c
 c=c.lstrip('#');a=int(c[6:8],16)/255 if len(c)==8 else 1
 return dict(_class='color',red=int(c[:2],16)/255,green=int(c[2:4],16)/255,blue=int(c[4:6],16)/255,alpha=a)
def frame(x,y,w,h):return dict(_class='rect',constrainProportions=False,x=x,y=y,width=w,height=h)
def point(x,y,r=0):
 d=fresh('CurvePoint');d.update(point='{%s, %s}'%(x,y),curveFrom='{%s, %s}'%(x,y),curveTo='{%s, %s}'%(x,y),cornerRadius=r,curveMode=1);return d
def style(c,grad=None):
 s=fresh('Style');f=fresh('Fill');f.update(isEnabled=True,color=color(c),patternTileScale=1)
 if grad:
  f['fillType']=1;f['gradient'].update(gradientType=0,elipseLength=1,**{'from':'{0, 0.5}','to':'{1, 0.5}'},stops=[dict(_class='gradientStop',position=0,color=color(c)),dict(_class='gradientStop',position=1,color=color(grad))])
 s['fills']=[f];s['miterLimit']=10;return s
def group(name):
 g=fresh('Group');g.update(name=name,frame=frame(0,0,W,H));groups.append(g);stack.clear();stack.append(g['layers']);return g

def add(d):stack[-1].append(d)
def paint(mask,c,grad=None):
 global canvas
 if grad:
  lay=Image.new('RGBA',(W,H));pix=lay.load();b=mask.getbbox();x0,y0,x1,y1=b
  c0=tuple(bytes.fromhex(c.lstrip('#')[:6]));c1=tuple(bytes.fromhex(grad.lstrip('#')[:6]))
  dr=ImageDraw.Draw(lay)
  for x in range(x0,x1):
   t=(x-x0)/max(1,x1-x0-1);dr.line((x,y0,x,y1),fill=tuple(round(a+(b-a)*t) for a,b in zip(c0,c1))+(255,))
 else:lay=Image.new('RGBA',(W,H),c)
 if len(c.lstrip('#'))==8:
  alpha=int(c[-2:],16);mask=mask.point(lambda v:round(v*alpha/255));lay.putalpha(255)
 canvas.alpha_composite(Image.composite(lay,Image.new('RGBA',(W,H)),mask))
def shape(name,x,y,w,h,c,r=0,oval=False,grad=None,shadow=False):
 d=fresh('Oval' if oval else 'Rectangle');d.update(name=name,frame=frame(x,y,w,h),style=style(c,grad),isClosed=True,pointRadiusBehaviour=1)
 if oval:
  # Four cubic Bezier quarters in normalized shape coordinates.
  k=.2761423749
  d['points']=[]
  for p,cf,ct in [((.5,0),(.5-k,0),(.5+k,0)),((1,.5),(1,.5-k),(1,.5+k)),((.5,1),(.5+k,1),(.5-k,1)),((0,.5),(0,.5+k),(0,.5-k))]:
   q=point(*p);q.update(curveMode=2,hasCurveFrom=True,hasCurveTo=True,curveFrom=str(cf).replace('(','{').replace(')','}'),curveTo=str(ct).replace('(','{').replace(')','}'));d['points'].append(q)
 else:
  d.update(fixedRadius=r,hasConvertedToNewRoundCorners=True,needsConvertionToNewRoundCorners=False,points=[point(0,0,r),point(1,0,r),point(1,1,r),point(0,1,r)])
 mask=Image.new('L',(W,H));dr=ImageDraw.Draw(mask)
 if oval:dr.ellipse((x,y,x+w,y+h),fill=255)
 else:dr.rounded_rectangle((x,y,x+w,y+h),radius=r,fill=255)
 if shadow:
  sh=fresh('Shadow');sh.update(isEnabled=True,blurRadius=40,offsetY=20,color=color('#52658b25'));d['style']['shadows']=[sh]
  blur=mask.filter(ImageFilter.GaussianBlur(20));layer=Image.new('RGBA',(W,H),'#52658b');layer.putalpha(blur.point(lambda v:round(v*.13)));canvas.alpha_composite(layer,(0,15))
 paint(mask,c,grad);add(d);return d

def poly(name,coords,c):
 x=min(a for a,b in coords);y=min(b for a,b in coords);w=max(a for a,b in coords)-x;h=max(b for a,b in coords)-y
 d=fresh('ShapePath');d.update(name=name,frame=frame(x,y,max(w,1),max(h,1)),style=style(c),isClosed=True,points=[point((a-x)/max(w,1),(b-y)/max(h,1)) for a,b in coords]);add(d)
 mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon(coords,fill=255);paint(mask,c);return d

def text(s,x,y,w,size=16,c='#28353a',bold=False,align=0,h=None,name=None):
 h=h or math.ceil(size*1.55*(s.count('\n')+1))
 attrs={'MSAttributedStringFontAttribute':{'_class':'fontDescriptor','attributes':{'name':'PingFangSC-Semibold' if bold else 'PingFangSC-Regular','size':size}},'MSAttributedStringColorAttribute':color(c),'paragraphStyle':{'_class':'paragraphStyle','alignment':align,'minimumLineHeight':size*1.45,'maximumLineHeight':size*1.45}}
 d=fresh('Text');d.update(name=name or s.replace('\n',' '),frame=frame(x,y,w,h),glyphBounds='{{0, 0}, {%s, %s}}'%(w,h),textBehaviour=1,attributedString={'_class':'attributedString','string':s,'attributes':[{'_class':'stringAttribute','location':0,'length':len(s.encode('utf-16-le'))//2,'attributes':attrs}]})
 st=fresh('Style');st['textStyle']={'_class':'textStyle','verticalAlignment':0,'encodedAttributes':attrs};d['style']=st;add(d)
 font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold' if bold else 'Regular')+'.ttc',round(size),index=2)
 draw=ImageDraw.Draw(canvas)
 for i,line in enumerate(s.split('\n')):
  length=draw.textlength(line,font=font);tx=x+(w-length)/2 if align==2 else x+w-length if align==1 else x
  draw.text((tx,y+i*size*1.45),line,font=font,fill=c,anchor='lt')
 return d

def button(label,x,y,w,h=52,size=16):
 shape('按钮背景',x,y,w,h,'#08c9ce',h/2,grad='#00dfa7');text(label,x,y+(h-size)/2-2,w,size,'#ffffff',True,2)

def phone(x,y,w,h):
 shape('手机外框 / 阴影',x,y,w,h,'#f9fcff',54,shadow=True)
 shape('手机内框',x+3,y+3,w-6,h-6,'#eff7ff',51)

# 01 · background and left phone
art=fresh('Artboard');art.update(name='直播答题 · 宣传设计',frame=frame(0,0,W,H),hasBackgroundColor=True,backgroundColor=color('#eaf1ff'),includeBackgroundColorInExport=True)
group('01 · 左侧手机 / 外框');phone(156,59,428,794)
shape('答题页面背景',174,77,391,755,'#bff1fa',42)
group('02 · 视频画面 / 近似矢量重绘')
shape('视频底色',174,77,391,218,'#073b3e',40)
poly('青绿斜面',[(174,150),(265,77),(342,77),(206,249)],'#0ba890')
poly('橙红斜面',[(174,155),(274,77),(463,77),(559,202),(434,295),(278,295)],'#ba3217')
poly('橙黄斜面',[(392,77),(463,77),(559,202),(424,295),(365,295)],'#f5ab20')
poly('蓝绿斜面',[(463,77),(565,150),(565,238),(535,174)],'#19ae9b')
poly('蓝紫主舞台',[(254,139),(414,83),(479,225),(317,288)],'#151c3d')
poly('舞台下沿',[(254,139),(265,139),(324,274),(479,218),(479,225),(317,288)],'#bdb18b')
shape('标题装饰圆',324,141,86,86,'#9daaa680',oval=True)
text('乘风破浪',234,144,270,57,'#ffffff',True,2)
text('2  0  2  0   新 年 盛 典',257,209,225,9,'#e8edee',False,2)
text('◇    ◎    ◌',355,91,126,23,'#ffffff')
shape('观看人数背景',485,89,69,23,'#123e46b0',11);text('人 1432',491,94,58,11,'#ffffff')
shape('播放控制遮罩',174,241,391,54,'#052f4080')
shape('播放进度条',187,247,364,2,'#d9e4e1');shape('播放进度',187,247,37,2,'#5fd9ec');shape('进度圆点',220,245,8,8,'#38b6f6',oval=True)
text('Ⅱ  04:23/56:48',190,264,160,13,'#ffffff');text('≡   倍速   弹   □',402,263,150,17,'#ffffff')
group('03 · 页签导航')
shape('白色导航栏',174,296,391,46,'#ffffff')
for s,x,w,c in [('互动',192,69,'#25363d'),('直播介绍',282,99,'#25363d'),('答题有礼',391,88,'#078fe4')]:text(s,x,312,w,16,c,True,2)
shape('当前页签下划线',430,339,16,3,'#0398ef',1)
shape('关注按钮',491,296,74,46,'#009bf4');text('+ 关注',491,312,74,15,'#ffffff',True,2)
group('04 · 答题卡 / 可编辑文本')
shape('单选题卡片',186,354,367,307,'#effdff',19)
text('[单选题]',203,377,63,15,'#00b9bc',True)
text('下列选项中，含钙量最高且最易被人体',267,377,279,15,'#27333b',True)
text('吸收的食物是哪一种?',203,400,333,15,'#27333b',True)
for i,s in enumerate(['新鲜的鸡蛋','牧场的牛奶','酸酸的橘子','烤焦的面包']):
 y=434+i*55;shape('选项 '+chr(65+i),203,y,332,45,'#ffffff',8);text(chr(65+i)+'.   '+s,216,y+14,304,15)
shape('滚动条',558,491,4,96,'#6cbfc4',2)
shape('多选题卡片',186,672,367,125,'#effdff',19)
text('[多选题]',203,694,63,15,'#00b9bc',True)
text('下列选项中，含钙量最高且最易被人体',267,694,279,15,'#27333b',True)
text('吸收的食物是哪一种?',203,718,333,15,'#27333b',True)
group('05 · 底部答题入口')
shape('底部操作栏',174,754,391,78,'#d9faf4',28)
shape('说明图标',211,773,21,21,'#12d4bd',3);shape('说明图标叠页',216,770,18,18,'#50e4d5',2);text('≡',214,775,16,14,'#ffffff',True)
text('活动说明',196,803,54,12,'#769394',False,2)
button('观看时长需达到1时60分可答题',261,766,278,52,14)
# 02 · right phone, live room

group('06 · 右侧手机 / 外框');phone(648,280,428,791)
shape('直播画面',667,300,391,750,'#6c7779',36)
shape('直播场景下半部',667,670,391,300,'#655744')
shape('直播场景墙面',680,397,237,272,'#858b80',8)
poly('主播服饰 / 近似轮廓',[(704,968),(753,671),(830,590),(914,632),(989,968)],'#493e32')
shape('主播头部 / 近似轮廓',790,493,118,167,'#b58f70',55)
shape('主播头发 / 近似轮廓',786,481,128,66,'#413c34',30)
shape('主播信息条',678,310,191,43,'#596366',22)
shape('主播头像外环',679,311,40,40,'#f0596c',oval=True);shape('主播头像',683,315,32,32,'#422f38',oval=True);shape('头像轮廓',693,321,12,13,'#d9b09b',oval=True)
text('治伯直播间…',726,325,90,13,'#e8edeb');shape('关注',816,320,44,23,'#e92748',12);text('+关注',816,326,44,11,'#ffffff',False,2)
for i in range(3):shape('观众头像 '+str(i+1),885+i*17,321,20,20,['#745a4d','#c97666','#d44960'][i],oval=True)
text('1.4万 ›',943,326,55,11,'#f3f4f4');text('◌',1017,319,32,23,'#d6e4e3')
shape('分享榜徽标',680,365,77,25,'#e52549',12);text('★ 分享榜',680,372,77,12,'#ffe088',True,2)
shape('消息横幅',766,364,279,27,'#596566',13);text('播 心有多大舞台就会有多大…',774,372,265,12,'#d5dddb')
for i,s in enumerate(['红包','福利','直播','锦囊','好礼','宠爱','分享','关注']):
 y=410+i*65;shape('右侧入口 '+s,1004,y,37,38,['#fbac2b','#36bd92','#4fa5e1','#2e8be1'][i%4],9);text('礼',1006,y+7,33,23,'#ffdf69',True,2);shape('入口标签 '+s,1002,y+32,41,17,'#d91e47',5);text(s,1002,y+35,41,10,'#ffffff',False,2)
for i in range(11):
 y=534+i*30
 shape('聊天条 '+str(i+1),681,y,218 if i<8 else 200,27,'#333a3880',13)
 shape('聊天头像 '+str(i+1),686,y+4,19,19,'#9c8680',oval=True)
 text('吕璐霄',710,y+8,46,11,'#49d5b2');text(['分享了直播间','参与了投票','为主播点赞'][i%3],761,y+8,125,11,'#f5f3e8')
shape('客服入口',1002,826,43,43,'#dcecf1',oval=True);text('♧',1002,831,43,25,'#278be9',True,2);shape('客服标签',1002,862,43,18,'#1f9bf1',5);text('客服',1002,866,43,11,'#ffdf69',False,2)
shape('底部输入框',730,916,111,40,'#3b3936',20);text('说点什么…',739,930,98,13,'#cccccc')
shape('礼物入口',685,917,34,38,'#d52f57',4);text('100',685,938,34,12,'#ffd8db',False,2)
text('•••    ■    →    ♥',855,925,188,24,'#f8e5c0')
group('07 · 弹窗遮罩')
shape('半透明直播遮罩',667,300,391,670,'#111b226b',34)
group('08 · 奖励弹窗 / 顶部插画')
shape('顶部光环外圈',757,398,211,65,'#f4ffff',oval=True)
shape('顶部光环内圈',766,406,193,48,'#8cb9bb',oval=True)
poly('左侧青绿装饰',[(727,439),(751,424),(788,445),(791,461)],'#00d3bd')
poly('右侧青绿装饰',[(930,444),(995,425),(1003,441),(974,458)],'#00c6b5')
poly('手机左侧阴影',[(816,389),(853,382),(869,444),(829,449)],'#24a9b1')
poly('手机青绿边框',[(824,381),(871,372),(884,439),(837,448)],'#00d5cb')
poly('手机白色屏幕',[(831,386),(866,380),(878,435),(843,441)],'#e8ffff')
shape('听筒',842,382,15,3,'#10bdbc',1)
shape('完成徽标',846,402,32,32,'#22cdb4',oval=True);text('✓',847,406,30,25,'#ffffff',True,2)
poly('金色彩纸',[(882,431),(904,400),(917,407),(894,439)],'#ffda70')
poly('彩纸高光',[(904,400),(912,396),(917,407)],'#fff8da')
for x,y in [(750,420),(782,407),(940,400)]:poly('金色星芒',[(x,y+4),(x+4,y),(x+8,y+4),(x+4,y+10)],'#ffdd70')
group('09 · 奖励弹窗 / 可编辑内容')
shape('奖励卡片',707,443,312,386,'#f6fffc',18,shadow=True)
poly('恭喜你标题底形',[(768,436),(959,436),(948,467),(939,475),(791,475),(780,468)],'#04d1bb')
text('恭喜你',779,448,170,22,'#ffffff',True,2)
text('答对 30 题',758,506,210,27,'#05bfc4',True,2)
text('获得红包 ¥1.00 元',753,555,220,18,'#303b3f',False,2)
shape('红包金色光晕',795,594,137,137,'#ffecac',oval=True)
shape('红包内光晕',804,603,118,118,'#ffda7b',oval=True)
poly('光芒 1',[(799,639),(856,656),(813,609)],'#fff3b5')
poly('光芒 2',[(914,611),(869,657),(927,643)],'#ffefae')
shape('红包外框',817,618,92,102,'#ffae58',13)
shape('红包主体',822,623,82,94,'#ff6045',9,grad='#ff894e')
poly('红包封口阴影',[(822,639),(863,653),(904,640),(904,649),(864,667),(822,650)],'#df4c36')
poly('红包金色封口',[(822,640),(862,651),(904,640),(904,644),(863,658),(822,644)],'#ffe6a2')
shape('红包金币',852,650,23,23,'#ffdb7a',oval=True);shape('红包金币高光',856,654,15,15,'#fff0b2',oval=True)
button('获奖详情',759,707,208,52,17)
text('查看答案',759,784,208,16,'#0db8bd',True,2)
group('10 · 关闭与系统导航')
shape('关闭按钮外圈',848,842,30,30,'#e9eff2',oval=True);shape('关闭按钮内圈',850,844,26,26,'#564546',oval=True);text('×',850,842,26,25,'#ffffff',False,2)
shape('系统底栏',667,970,391,81,'#f8fdff',0)
# cover lower corners with the white phone interior using a rounded base
shape('系统底栏圆角底部',667,996,391,55,'#f8fdff',28)
text('←',782,983,44,29,'#202c30',True,2);text('→',899,983,44,29,'#202c30',True,2)
shape('Home 指示条',794,1038,140,5,'#253238',3)
art['layers']=groups
page=fresh('Page');page.update(name='直播答题宣传图',frame=frame(0,0,W,H),layers=[art])
doc=fresh('Document');doc.update(colorSpace=0,pages=[{'_class':'MSJSONFileReference','_ref_class':'MSImmutablePage','_ref':'pages/'+page['do_objectID']}])
meta=fresh('Meta');meta.update(version=146,appVersion='78',build=0,commit='',app='com.bohemiancoding.sketch3',variant='NONAPPSTORE',pagesAndArtboards={page['do_objectID']:{'name':page['name'],'artboards':{art['do_objectID']:{'name':art['name']}}}})
meta['created'].update(version=146,appVersion='78',build=0,commit='',app='com.bohemiancoding.sketch3',compatibilityVersion=99,variant='NONAPPSTORE')
user={'document':{'pageListHeight':120,'pageListCollapsed':0},page['do_objectID']:{'scrollOrigin':'{0, 0}','zoomValue':0.7}}
canvas.convert('RGB').save(ROOT/'live-quiz-preview.png')
with zipfile.ZipFile(ROOT/'live-quiz-editable.sketch','w',zipfile.ZIP_DEFLATED) as z:
 for name,data in [('document.json',doc),('meta.json',meta),('user.json',user),('pages/'+page['do_objectID']+'.json',page)]:z.writestr(name,json.dumps(data,ensure_ascii=False))
 z.write(ROOT/'live-quiz-preview.png','previews/preview.png')
print('Created',ROOT/'live-quiz-editable.sketch')
print('Groups:',len(groups),'Layers:',sum(len(g['layers']) for g in groups))
