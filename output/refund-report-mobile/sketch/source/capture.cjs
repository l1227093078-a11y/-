// Capture the actual computed HTML layout as editable design primitives.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const HTML=path.resolve(ROOT,'../refund.html');
const scenarios=[
  {id:'home-line',name:'01 首页 · 折线图（完整）',full:true},
  {id:'home-bar',name:'02 首页 · 柱状图（完整）',full:true,chart:'bar'},
  {id:'product',name:'03 按商品统计',detail:'product'},
  {id:'category',name:'04 按商品分类统计',detail:'category'},
  {id:'manager',name:'05 按产品经理统计',detail:'pm'},
  {id:'market',name:'06 按市场/门店统计',detail:'store'},
  {id:'store',name:'07 门店明细',detail:'store',store:true},
  {id:'products-filter',name:'08 选择商品',drawer:'scope'},
  {id:'categories-filter',name:'09 选择商品分类',drawer:'scope',category:true},
  {id:'markets-filter',name:'10 选择市场/门店',drawer:'market'},
  {id:'managers-filter',name:'11 选择产品经理',drawer:'pm'},
  {id:'date-filter',name:'12 自定义时间',drawer:'date'},
  {id:'rules',name:'13 规则说明（完整）',rules:true},
  {id:'chart-end',name:'14 首页 · 图表横滑末尾',chartEnd:true},
];

async function captureDom(page){
  return page.evaluate(()=>{
    const root=document.querySelector('#export-root')||document.querySelector('.phone');
    const rootBox=root.getBoundingClientRect();
    const rect=r=>({x:r.x-rootBox.x,y:r.y-rootBox.y,w:r.width,h:r.height});
    const intersect=(a,b)=>({x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),w:Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),h:Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y))});
    const visible=r=>r.w>0.01&&r.h>0.01;
    const props=['backgroundColor','color','fontSize','fontWeight','fontFamily','lineHeight','letterSpacing','opacity','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius','boxShadow','backdropFilter','fill','stroke','strokeWidth','strokeLinecap','strokeLinejoin','strokeDasharray'];
    const style=cs=>Object.fromEntries(props.map(p=>[p,cs[p]||'']));
    function target(el){
      if(el.dataset.d)return {type:'detail',key:el.dataset.d};
      if(el.dataset.chart)return {type:'chart',key:el.dataset.chart};
      if(el.dataset.t==='custom')return {type:'date'};
      const ids={btnScope:'products-filter',btnMarket:'markets-filter',btnPm:'managers-filter',btnHelp:'rules',pBack:'home-line',dClose:'home-line',dOk:'home-line',hClose:'home-line'};
      if(ids[el.id])return {type:'screen',key:ids[el.id]};
      if(el.hasAttribute('data-mk'))return {type:'screen',key:'store'};
      return null;
    }
    function name(el){
      const ids={sumCard:'退款金额汇总',trendCard:'退款趋势',entries:'多维度明细',timeChips:'统计时间',detailPage:'统计内页',drawer:'筛选弹层',hbox:'规则说明',pBody:'统计内容',dBody:'筛选内容',pCrumb:'市场导航'};
      if(ids[el.id])return ids[el.id];
      const cls=String(el.className?.baseVal||el.className||'');
      const labels={'nav':'页面标题','statusbar':'状态栏','home-indicator':'底部指示条','filters':'筛选区域','report-group':'分组卡片','ent':'统计入口','prow':'商品','urow':'产品经理','drow':'金额明细','dft':'底部操作','dhd':'弹层标题','selbar':'已选数量'};
      let n=cls.split(/\s+/).map(c=>labels[c]).find(Boolean)||el.tagName.toLowerCase()+(cls?' · '+cls.split(/\s+/).slice(0,2).join(' '):'');
      const title=el.querySelector(':scope > .enttt,:scope > .t .n,:scope > .pinfo .pname,:scope > .uinfo .unm,:scope > .chd h4');
      if(title)n+=' · '+title.textContent.trim();
      return n.slice(0,70);
    }
    function textNode(node,clip){
      const raw=node.textContent;
      if(!raw.trim())return null;
      const el=node.parentElement,cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden')return null;
      const lines=[];
      for(let i=0;i<raw.length;i++){
        const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
        const box=range.getBoundingClientRect();
        if(box.width<.01||box.height<.01)continue;
        const r=rect(box);
        if(!visible(intersect(r,clip)))continue;
        let line=lines[lines.length-1];
        if(!line||Math.abs(line.rect.y-r.y)>1){line={text:'',rect:{...r}};lines.push(line);}
        line.text+=raw[i];
        const right=Math.max(line.rect.x+line.rect.w,r.x+r.w);
        line.rect.x=Math.min(line.rect.x,r.x);line.rect.w=right-line.rect.x;line.rect.h=Math.max(line.rect.h,r.h);
      }
      if(!lines.length)return null;
      if(cs.textOverflow==='ellipsis'&&el.scrollWidth>el.clientWidth){
        const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=cs.font||`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const avail=el.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0);
        let value='';for(const ch of raw.trim()){if(ctx.measureText(value+ch+'…').width>avail)break;value+=ch;}
        lines.splice(0,lines.length,{text:value+'…',rect:{...lines[0].rect,w:Math.min(avail,ctx.measureText(value+'…').width)}});
      }
      const x=Math.min(...lines.map(l=>l.rect.x)),y=lines[0].rect.y;
      const box={x,y,w:Math.max(...lines.map(l=>l.rect.x+l.rect.w))-x,h:lines[lines.length-1].rect.y+lines[lines.length-1].rect.h-y};
      return {kind:'text',name:lines.map(l=>l.text).join(' ').slice(0,55),text:lines.map(l=>l.text).join('\n'),rect:box,style:style(cs),svg:el instanceof SVGElement};
    }
    function pseudo(el,which,r){
      const cs=getComputedStyle(el,which);
      if(cs.content==='none'||cs.content==='normal'||cs.display==='none')return null;
      const w=parseFloat(cs.width),h=parseFloat(cs.height);
      if(!(w>0&&h>0))return null;
      const x=cs.left!=='auto'?parseFloat(cs.left):(r.w-w)/2;
      const y=cs.top!=='auto'?parseFloat(cs.top):(r.h-h)/2;
      return {kind:'box',name:which==='::before'?'装饰 / 拖动条':'装饰 / 选择状态',rect:{x:r.x+x,y:r.y+y,w,h},style:style(cs)};
    }
    function visit(el,clip){
      const cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return null;
      const r=rect(el.getBoundingClientRect());
      const isSvg=el instanceof SVGElement;
      if(el.tagName.toLowerCase()==='path'&&el.getAttribute('d')?.startsWith('M0 0h24v24H0z')&&cs.fill==='none'&&cs.stroke==='none')return null;
      const expanded={x:r.x-2,y:r.y-2,w:r.w+4,h:r.h+4};
      if(!visible(intersect(expanded,clip))&&el!==root)return null;
      const tag=el.tagName.toLowerCase();
      if(isSvg&&['path','line','polyline','polygon','circle','ellipse','rect'].includes(tag)){
        const m=el.getScreenCTM();
        return {kind:'vector',name:'矢量 · '+tag,tag,attrs:Object.fromEntries(el.getAttributeNames().map(k=>[k,el.getAttribute(k)])),matrix:[m.a,m.b,m.c,m.d,m.e-rootBox.x,m.f-rootBox.y],rect:r,style:style(cs)};
      }
      if(tag==='img'){
        const c=document.createElement('canvas');c.width=Math.max(1,Math.round(r.w*2));c.height=Math.max(1,Math.round(r.h*2));c.getContext('2d').drawImage(el,0,0,c.width,c.height);
        return {kind:'image',name:'商品缩略图',rect:r,png:c.toDataURL('image/png')};
      }
      const clipped=['hidden','auto','scroll','clip'].includes(cs.overflowX)||['hidden','auto','scroll','clip'].includes(cs.overflowY);
      const nextClip=clipped?intersect(clip,r):clip;
      const children=[];
      const before=pseudo(el,'::before',r);if(before)children.push(before);
      const nodes=Array.from(el.childNodes).map((n,i)=>({node:n,index:i,z:n.nodeType===1?(parseInt(getComputedStyle(n).zIndex)||0):0})).sort((a,b)=>a.z-b.z||a.index-b.index);
      for(const {node} of nodes){
        const child=node.nodeType===3?textNode(node,nextClip):node.nodeType===1?visit(node,nextClip):null;
        if(child)children.push(child);
      }
      const after=pseudo(el,'::after',r);if(after)children.push(after);
      if(el.classList.contains('chart-scroll')&&el.scrollWidth>el.clientWidth){
        const thumb=Math.max(18,r.w*el.clientWidth/el.scrollWidth),offset=(r.w-thumb)*el.scrollLeft/(el.scrollWidth-el.clientWidth);
        children.push({kind:'box',name:'横向滚动轨道',rect:{x:r.x,y:r.y+r.h-4,w:r.w,h:4},style:{backgroundColor:'#f3f7f4',borderTopLeftRadius:'2px',opacity:'1'}});
        children.push({kind:'box',name:'横向滚动滑块',rect:{x:r.x+offset,y:r.y+r.h-4,w:thumb,h:4},style:{backgroundColor:'#b6cfbf',borderTopLeftRadius:'2px',opacity:'1'}});
      }
      return {kind:'group',name:name(el),rect:r,style:style(cs),clip:clipped,children,target:target(el)};
    }
    return {width:rootBox.width,height:rootBox.height,tree:visit(root,{x:0,y:0,w:rootBox.width,h:rootBox.height})};
  });
}

(async()=>{
  fs.mkdirSync(path.join(ROOT,'previews'),{recursive:true});
  const launch={headless:true,args:['--no-sandbox']};
  if(process.env.CHROME_PATH)launch.executablePath=process.env.CHROME_PATH;
  else if(fs.existsSync('/usr/bin/chromium'))launch.executablePath='/usr/bin/chromium';
  const browser=await chromium.launch(launch),scenes=[];
  try{
    for(const scenario of scenarios){
      const page=await browser.newPage({viewport:{width:375,height:844},deviceScaleFactor:1,locale:'zh-CN'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.setContent(fs.readFileSync(HTML,'utf8'),{waitUntil:'load'});
      if(scenario.chart)await page.locator('[data-chart="'+scenario.chart+'"]').click();
      if(scenario.detail)await page.locator('[data-d="'+scenario.detail+'"]').click();
      if(scenario.store)await page.locator('[data-mk]').first().click();
      if(scenario.drawer)await page.evaluate(mode=>openDrawer(mode),scenario.drawer);
      if(scenario.category){await page.locator('[data-mode="category"]').click();await page.locator('[data-g="C1"]').click();}
      if(scenario.chartEnd){await page.locator('#trendCard').scrollIntoViewIfNeeded();await page.locator('.chart-scroll').evaluate(e=>e.scrollLeft=e.scrollWidth);}
      if(scenario.full){
        await page.addStyleTag({content:'.phone{height:auto!important;min-height:0!important;overflow:hidden!important}.scroll{flex:none!important;overflow:visible!important;height:auto!important;padding-bottom:0!important}.filters{position:relative!important}.home-indicator{position:relative!important;flex:none!important}'});
      }
      if(scenario.rules){
        await page.locator('#btnHelp').click();
        await page.evaluate(()=>{
          state.page='export-rules';
          const box=$('#hbox'),root=document.createElement('div');root.id='export-root';
          root.style.cssText='width:375px;min-height:844px;padding:20px;background:#edf3ee;position:absolute;top:0;left:0;';
          box.style.cssText='position:relative;left:auto;right:auto;top:auto;transform:none;max-height:none;overflow:visible;opacity:1;pointer-events:auto;width:100%;';
          root.append(box);document.body.replaceChildren(root);
        });
      }
      await page.waitForTimeout(320);
      // Replaced inputs become ordinary editable text and native vector calendar icons.
      await page.evaluate(()=>{
        document.querySelectorAll('input').forEach(input=>{
          const cs=getComputedStyle(input),r=input.getBoundingClientRect(),box=document.createElement('div');
          for(const key of cs)box.style.setProperty(key,cs.getPropertyValue(key));
          box.style.cssText+=';display:flex;align-items:center;width:'+r.width+'px;height:'+r.height+'px;box-sizing:border-box;';
          box.dataset.input=input.id;
          const span=document.createElement('span');span.textContent=input.type==='date'?input.value.replaceAll('-','/'):input.value||input.placeholder;
          span.style.color=input.value?cs.color:getComputedStyle(input,'::placeholder').color;
          box.append(span);
          if(input.type==='date'){const icon=document.createElement('span');icon.innerHTML=ICONS.calendar;icon.style.cssText='margin-left:auto;display:flex;color:inherit';box.append(icon);}
          input.replaceWith(box);
        });
      });
      const scene=await captureDom(page);scene.id=scenario.id;scene.name=scenario.name;
      const root=page.locator(scenario.rules?'#export-root':'.phone');
      const filename=scenario.id+'.png';await root.screenshot({path:path.join(ROOT,'previews',filename)});
      scene.preview='previews/'+filename;
      if(errors.length)throw Error(scenario.id+': '+errors.join('; '));
      scenes.push(scene);console.log(scenario.name,Math.round(scene.width)+'×'+Math.round(scene.height));
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname,'scenes.json'),JSON.stringify({source:'../../index.html',sourceSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(HTML)).digest('hex'),scenes}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
