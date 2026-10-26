'use strict';
const $=s=>document.querySelector(s);
const icon=name=>SHARED.icons[name]||'';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATEGORIES=[{id:'care',name:'护肤用品',children:[{id:'cream',name:'面霜'},{id:'clean',name:'清洁用品'}]},{id:'baby',name:'母婴服饰',children:[{id:'onesie',name:'连体衣'},{id:'sleep',name:'睡袋'},{id:'outer',name:'外出服'}]},{id:'feeding',name:'喂养用品',children:[{id:'bottle',name:'奶瓶奶嘴'}]}];
const MANAGERS=[{id:'u1',name:'李红彩'},{id:'u2',name:'仝钢'},{id:'u3',name:'苗艳霞'},{id:'u4',name:'陈晨'}];
const WAREHOUSES=[{id:'w1',name:'青岛分仓',market:'华东市场'},{id:'w2',name:'天津分仓',market:'华北市场'},{id:'w3',name:'邯郸分仓',market:'华北市场'},{id:'w4',name:'武汉分仓',market:'华中市场'},{id:'w5',name:'合肥分仓',market:'华东市场'}];
const STORES=[{id:'s11',name:'上海南京西路店',w:'w1'},{id:'s12',name:'杭州西湖银泰店',w:'w1'},{id:'s21',name:'北京丰台智选店',w:'w2'},{id:'s22',name:'天津和平恒隆店',w:'w2'},{id:'s31',name:'邯郸万达广场店',w:'w3'},{id:'s32',name:'石家庄长安店',w:'w3'},{id:'s41',name:'武汉光谷天地店',w:'w4'},{id:'s42',name:'武汉江汉路店',w:'w4'},{id:'s51',name:'合肥银泰中心店',w:'w5'},{id:'s52',name:'芜湖镜湖万达店',w:'w5'}];
const PRODUCTS=[
{id:'p01',name:'银杏焕肤修护膏（预售商品）0.01',category:'cream',spec:'1份',unit:'份',type:'standard',sku:'B20000015246458575',price:0.01,image:'lotion'},
{id:'p02',name:'reges玻肽舒颜霜15g',category:'cream',spec:'1支15g',unit:'支',type:'standard',sku:'B20000006934285547',price:129,image:'lotion'},
{id:'p03',name:'芙妍初橙色固体精油皂100g±5g',category:'clean',spec:'1盒',unit:'盒',type:'nonstandard',sku:'B200000065083680710',price:39,image:'lotion'},
{id:'p04',name:'婴幼儿加厚保暖连体衣',category:'onesie',spec:'80码 / 米白',unit:'件',type:'standard',sku:'B20000001000000004',price:129,image:'baby'},
{id:'p05',name:'婴儿纯棉短袖爬服',category:'onesie',spec:'73码 / 浅绿',unit:'件',type:'standard',sku:'B20000001000000005',price:89,image:'baby'},
{id:'p06',name:'婴儿纯棉纱布睡袋',category:'sleep',spec:'90cm / 云朵',unit:'件',type:'standard',sku:'B20000001000000006',price:199,image:'bed'},
{id:'p07',name:'新生儿抱被包巾',category:'sleep',spec:'100×100cm',unit:'条',type:'nonstandard',sku:'B20000001000000007',price:79,image:'bed'},
{id:'p08',name:'儿童防风冲锋衣',category:'outer',spec:'100码 / 卡其',unit:'件',type:'standard',sku:'B20000001000000008',price:259,image:'coat'},
{id:'p09',name:'儿童针织开衫',category:'outer',spec:'90码 / 奶杏',unit:'件',type:'nonstandard',sku:'B20000001000000009',price:149,image:'coat'},
{id:'p10',name:'宽口径玻璃奶瓶',category:'bottle',spec:'240ml',unit:'个',type:'standard',sku:'B20000001000000010',price:89,image:'bottle'},
{id:'p11',name:'硅胶安抚奶嘴',category:'bottle',spec:'S号 / 浅绿',unit:'个',type:'standard',sku:'B20000001000000011',price:39,image:'bottle'},
{id:'p12',name:'婴儿有机棉长袖连体衣',category:'onesie',spec:'66码 / 纯白',unit:'件',type:'nonstandard',sku:'B20000001000000012',price:159,image:'baby'}];
const PMAP=Object.fromEntries(PRODUCTS.map(p=>[p.id,p])),WMAP=Object.fromEntries(WAREHOUSES.map(w=>[w.id,w])),SMAP=Object.fromEntries(STORES.map(s=>[s.id,s])),UMAP=Object.fromEntries(MANAGERS.map(u=>[u.id,u]));
const STOCKS=PRODUCTS.flatMap((p,pi)=>WAREHOUSES.map((w,wi)=>({p:p.id,w:w.id,u:MANAGERS[(pi+wi)%MANAGERS.length].id,warehouse:pi===0&&wi===0?1000:100+((pi*83+wi*139)%1300),supplier:pi===0&&wi===0?1975:500+((pi*197+wi*101)%2400),pendingPickup:pi===0&&wi===0?100:10+((pi*11+wi*7)%75),retained:pi===0&&wi===0?200:20+((pi*19+wi*13)%90)})));
const STORE_STOCKS=PRODUCTS.flatMap((p,pi)=>STORES.map((s,si)=>({p:p.id,s:s.id,w:s.w,u:STOCKS.find(r=>r.p===p.id&&r.w===s.w).u,quantity:pi===0?0:(pi*37+si*11)%183,pendingPickup:pi===0?0:Math.floor(((pi*37+si*11)%183)/4)})));
const ACCOUNTS={
store:{name:'门店账号',stores:['s11'],warehouses:['w1'],modes:['stores'],initial:'stores'},
region:{name:'区域账号',stores:['s11','s12','s51','s52'],warehouses:['w1','w5'],modes:['stores'],initial:'stores'},
warehouse:{name:'分仓账号',stores:['s11','s12'],warehouses:['w1'],modes:['stores','warehouses','combined'],initial:'warehouses'},
hq:{name:'总仓账号',stores:STORES.map(s=>s.id),warehouses:WAREHOUSES.map(w=>w.id),modes:['stores','warehouses','combined'],initial:'combined'},
denied:{name:'无授权账号',stores:[],warehouses:[],modes:[],initial:'stores'}};
let accountKey=new URLSearchParams(location.search).get('account')||'hq';if(!ACCOUNTS[accountKey])accountKey='denied';
const permission=ACCOUNTS[accountKey];
const state={productMode:'product',products:[],categories:[],managers:[],mode:permission.initial,stores:[...permission.stores],warehouses:[...permission.warehouses],type:'all',limit:10};
let draft=null,modalKind='',returnFocus=null,detailProduct=null;
const allowedStores=()=>STORES.filter(s=>permission.stores.includes(s.id));
const allowedWarehouses=()=>WAREHOUSES.filter(w=>permission.warehouses.includes(w.id));
const categoryOf=id=>CATEGORIES.find(c=>c.children.some(s=>s.id===id));
const subcategoryOf=id=>CATEGORIES.flatMap(c=>c.children).find(c=>c.id===id);
const unique=a=>[...new Set(a)];
function selectedIds(selected,authorized){const valid=unique(selected.filter(id=>authorized.includes(id)));return valid;}
function locations(s=state){
 const stores=s.mode==='warehouses'?[]:selectedIds(s.stores,permission.stores);
 const warehouses=s.mode==='stores'?unique(stores.map(id=>SMAP[id].w)).filter(id=>permission.warehouses.includes(id)):selectedIds(s.warehouses,permission.warehouses);
 return {stores,warehouses};
}
function productRows(p){
 const loc=locations(),managerOK=r=>!state.managers.length||state.managers.includes(r.u);
 return {warehouses:STOCKS.filter(r=>r.p===p.id&&loc.warehouses.includes(r.w)&&managerOK(r)),stores:STORE_STOCKS.filter(r=>r.p===p.id&&loc.stores.includes(r.s)&&managerOK(r))};
}
function visibleProducts(){return PRODUCTS.filter(p=>{
 if(state.type!=='all'&&p.type!==state.type)return false;
 if(state.productMode==='product'&&state.products.length&&!state.products.includes(p.id))return false;
 if(state.productMode==='category'&&state.categories.length&&!state.categories.includes(p.category))return false;
 const rows=productRows(p);return state.mode==='stores'?rows.stores.length>0:state.mode==='warehouses'?rows.warehouses.length>0:rows.stores.length+rows.warehouses.length>0;
});}
function inventoryMetrics(p){
 const rows=productRows(p),sum=(list,key)=>list.reduce((total,row)=>total+(row[key]||0),0);
 const totalPhysical=(state.mode==='stores'?0:sum(rows.warehouses,'warehouse'))+(state.mode==='warehouses'?0:sum(rows.stores,'quantity'));
 const pendingPickup=(state.mode==='stores'?0:sum(rows.warehouses,'pendingPickup'))+(state.mode==='warehouses'?0:sum(rows.stores,'pendingPickup'));
 return {totalPhysical,pendingPickup,retained:sum(rows.warehouses,'retained'),supplierZone:sum(rows.warehouses,'supplier')};
}
function amount(n,unit){return Number(n).toLocaleString('zh-CN')+unit;}
function chips(names){if(!names.length)return '<span>请选择</span>';return '<span class="chip">'+esc(names[0])+'</span>'+(names.length>1?'<span class="chip more">+'+(names.length-1)+'</span>':'');}
function managerNames(p){const rows=productRows(p);return unique((state.mode==='stores'?rows.stores:state.mode==='warehouses'?rows.warehouses:[...rows.warehouses,...rows.stores]).map(r=>r.u));}
function render(){
 if(!permission.modes.length){for(const id of ['productFilter','managerFilter','orgFilter','clearFilters'])$('#'+id).disabled=true;$('#scopeNote').textContent='当前账号暂无数据权限';$('#resultCount').textContent='共 0 个商品';$('#stockList').innerHTML='<div class="empty">暂无可查看的数据权限<br>请联系管理员配置授权范围</div>';$('#listEnd').innerHTML='';return;}
 $('#productChips').innerHTML=chips(state.productMode==='product'?state.products.map(id=>PMAP[id].name):state.categories.map(id=>subcategoryOf(id).name));
 $('#managerChips').innerHTML=chips(state.managers.map(id=>UMAP[id].name));
 const orgNames=state.mode==='stores'?state.stores.filter(id=>permission.stores.includes(id)).map(id=>SMAP[id].name):state.mode==='warehouses'?state.warehouses.filter(id=>permission.warehouses.includes(id)).map(id=>WMAP[id].name):[...state.warehouses.filter(id=>permission.warehouses.includes(id)).map(id=>WMAP[id].name),...state.stores.filter(id=>permission.stores.includes(id)).map(id=>SMAP[id].name)];
 $('#orgChips').innerHTML=chips(orgNames);$('#scopeNote').textContent=state.mode==='stores'?'按当前门店范围统计':state.mode==='warehouses'?'按当前仓库范围统计':'按当前仓库及门店范围统计';
 $('#typeTabs').querySelectorAll('[data-type]').forEach(b=>{b.classList.toggle('on',b.dataset.type===state.type);b.setAttribute('aria-pressed',String(b.dataset.type===state.type));});
 const list=visibleProducts();$('#resultCount').textContent='共 '+list.length+' 个商品';
 $('#stockList').innerHTML=list.length?list.slice(0,state.limit).map(p=>{
 const metrics=inventoryMetrics(p),managers=managerNames(p),names=managers.map(id=>UMAP[id].name),preview=names.slice(0,3).join('、')+(names.length>3?'...':'');
 const manager='<span class="manager-names" title="'+esc(names.join('、'))+'">'+esc(preview||'未归属')+'</span>'+(names.length?'<button class="manager-link" data-manager-detail="'+p.id+'" aria-label="查看'+esc(p.name)+'的产品经理明细">查看<span aria-hidden="true">&gt;</span></button>':'');
 return '<article class="stock-card" data-product-card="'+p.id+'"><div class="stock-heading"><span class="label">商品名称：</span><div class="stock-title"><h2><span class="type-badge '+(p.type==='nonstandard'?'nonstandard':'')+'">'+(p.type==='standard'?'标品':'非标品')+'</span>'+esc(p.name)+'</h2></div></div><div class="kv"><span class="label">规格：</span><span class="value">'+esc(p.spec)+'</span></div><div class="kv"><span class="label">产品经理：</span><span class="value manager-value">'+manager+'</span></div><div class="kv"><span class="label">sku编号：</span><span class="value sku">'+esc(p.sku)+'</span></div><div class="stock-values"><div class="kv"><span class="label">总实物库存：</span><span class="amount" data-metric="totalPhysical">'+amount(metrics.totalPhysical,p.unit)+'</span></div><div class="kv"><span class="label">待取货数量：</span><span class="amount" data-metric="pendingPickup">'+amount(metrics.pendingPickup,p.unit)+'</span></div><div class="kv"><span class="label">分仓留存：</span><span class="amount" data-metric="retained">'+amount(metrics.retained,p.unit)+'</span></div><div class="kv"><span class="label">供应商库区库存：</span><span class="amount" data-metric="supplierZone">'+amount(metrics.supplierZone,p.unit)+'</span></div></div></article>';
 }).join(''):'<div class="empty">'+icon('shopping-bag')+'当前筛选条件下暂无商品<br>试试调整商品、产品经理或关联组织</div>';
 $('#listEnd').innerHTML=list.length>state.limit?'<button class="load-more" id="loadMore">加载更多（剩余 '+(list.length-state.limit)+' 个）</button>':list.length?'<div class="list-end">已显示全部商品</div>':'';
 if($('#loadMore'))$('#loadMore').onclick=()=>{state.limit+=10;render();};
 $('#stockList').querySelectorAll('[data-manager-detail]').forEach(b=>b.onclick=()=>openSheet('detail',b.dataset.managerDetail));
}
function check(on,mixed=false,square=false){return '<span class="check '+(on?'checked':mixed?'mixed':'')+(square?' square':'')+'" aria-hidden="true">'+(on?icon('check'):'')+'</span>';}
function summary(text){return '<div class="selection-summary" aria-live="polite">'+text+'</div>';}
function search(id,placeholder){return '<div class="search">'+icon('search')+'<input id="'+id+'" type="search" autocomplete="off" placeholder="'+placeholder+'" aria-label="'+placeholder+'" value="'+esc(draft.keyword||'')+'"></div>';}
function focusSearch(id){const e=$('#'+id);if(e){e.focus({preventScroll:true});e.setSelectionRange?.(e.value.length,e.value.length);}}
function wireSearch(id,redraw){$('#'+id).oninput=e=>{draft.keyword=e.target.value;redraw();focusSearch(id);};}
function toggle(list,id){const index=list.indexOf(id);if(index<0)list.push(id);else list.splice(index,1);}
function batchToggle(list,ids){const all=ids.length>0&&ids.every(id=>list.includes(id));return all?list.filter(id=>!ids.includes(id)):unique([...list,...ids]);}
function openSheet(kind,pid){
 modalKind=kind;detailProduct=pid||null;returnFocus=document.activeElement;
 draft={...state,products:[...state.products],categories:[...state.categories],managers:[...state.managers],stores:[...state.stores],warehouses:[...state.warehouses],keyword:'',expanded:['care','baby'],activeWarehouse:allowedWarehouses()[0]?.id||''};
 const d=$('#drawer');d.classList.toggle('manager',kind==='manager');d.classList.toggle('detail',kind==='detail');d.dataset.mode=kind;d.inert=false;d.setAttribute('aria-hidden','false');
 $('#sheetTitle').textContent={product:'选择商品 / 分类',manager:'选择产品经理',org:'选择关联组织',detail:'产品经理明细'}[kind];$('#sheetReset').hidden=kind==='detail';$('#sheetBody').scrollTop=0;
 drawSheet();$('#mask').classList.add('show');void d.offsetHeight;d.classList.add('show');$('#pageContent').inert=true;$('#pageNav').inert=true;requestAnimationFrame(()=>$('#sheetClose').focus({preventScroll:true}));
}
function closeSheet(){const d=$('#drawer');$('#mask').classList.remove('show');d.classList.remove('show');d.inert=true;d.setAttribute('aria-hidden','true');$('#pageContent').inert=false;$('#pageNav').inert=false;returnFocus?.focus({preventScroll:true});}
function drawSheet(){if(modalKind==='product')drawProduct();else if(modalKind==='manager')drawManager();else if(modalKind==='org')drawOrg();else drawManagerDetail();}
function drawProduct(){
 let h='<div class="segments" role="group" aria-label="商品筛选方式"><button data-product-mode="product" class="'+(draft.productMode==='product'?'on':'')+'" aria-pressed="'+(draft.productMode==='product')+'">按商品</button><button data-product-mode="category" class="'+(draft.productMode==='category'?'on':'')+'" aria-pressed="'+(draft.productMode==='category')+'">按商品分类</button></div>';
 if(draft.productMode==='product'){
 const kw=draft.keyword.trim().toLowerCase(),items=PRODUCTS.filter(p=>!kw||p.name.toLowerCase().includes(kw)||p.sku.toLowerCase().includes(kw)||p.id.toLowerCase().includes(kw));
 h+=search('productSearch','输入商品名称 / 商品编码 / SKU编号')+summary(draft.products.length?'已选 '+draft.products.length+' 个商品':'');
 h+=items.length?items.map(p=>{const on=draft.products.includes(p.id);return '<button class="select-row" data-select-product="'+p.id+'" role="checkbox" aria-checked="'+on+'"><span class="thumb"><img src="'+SHARED.assets[p.image]+'" alt="" width="28" height="28"></span><span class="info"><span class="name">'+esc(p.name)+'</span><span class="sub" style="display:block">'+esc(categoryOf(p.category).name)+'　'+esc(subcategoryOf(p.category).name)+'</span><span class="price" style="display:block">¥'+p.price.toFixed(2)+'</span></span>'+check(on)+'</button>';}).join(''):'<div class="empty">未找到匹配商品</div>';
 }else{
 h+='<p class="hint">分类为两级，勾选一级即选中其下全部二级分类；可展开单独选择。</p>'+summary(draft.categories.length?'已选 '+draft.categories.length+' 个二级分类':'');
 h+=CATEGORIES.map(c=>{const ids=c.children.map(x=>x.id),count=ids.filter(id=>draft.categories.includes(id)).length,on=count===ids.length,expanded=draft.expanded.includes(c.id);return '<section class="category-group"><div class="category-head"><button class="category-toggle" data-select-category-group="'+c.id+'" role="checkbox" aria-checked="'+(on?'true':count?'mixed':'false')+'">'+check(on,count>0&&!on)+'<span>'+c.name+'</span></button><span class="count">'+count+'/'+ids.length+'</span><button class="category-expand" data-expand-category="'+c.id+'" aria-expanded="'+expanded+'" aria-label="'+(expanded?'收起':'展开')+c.name+'">'+icon(expanded?'chevron-down':'chevron-right')+'</button></div>'+(expanded?'<div class="category-children">'+c.children.map(child=>{const on=draft.categories.includes(child.id);return '<button class="category-child" data-select-category="'+child.id+'" role="checkbox" aria-checked="'+on+'">'+check(on)+'<span>'+child.name+'</span><span class="count">'+PRODUCTS.filter(p=>p.category===child.id).length+' 个商品</span></button>';}).join('')+'</div>':'')+'</section>';}).join('');
 }
 $('#sheetBody').innerHTML=h;
 $('#sheetBody').querySelectorAll('[data-product-mode]').forEach(b=>b.onclick=()=>{draft.productMode=b.dataset.productMode;draft.keyword='';if(draft.productMode==='product')draft.categories=[];else draft.products=[];drawProduct();});
 if(draft.productMode==='product'){wireSearch('productSearch',drawProduct);$('#sheetBody').querySelectorAll('[data-select-product]').forEach(b=>b.onclick=()=>{toggle(draft.products,b.dataset.selectProduct);drawProduct();});}
 else{
 $('#sheetBody').querySelectorAll('[data-select-category-group]').forEach(b=>b.onclick=()=>{const ids=CATEGORIES.find(c=>c.id===b.dataset.selectCategoryGroup).children.map(c=>c.id);draft.categories=batchToggle(draft.categories,ids);drawProduct();});
 $('#sheetBody').querySelectorAll('[data-expand-category]').forEach(b=>b.onclick=()=>{toggle(draft.expanded,b.dataset.expandCategory);drawProduct();});
 $('#sheetBody').querySelectorAll('[data-select-category]').forEach(b=>b.onclick=()=>{toggle(draft.categories,b.dataset.selectCategory);drawProduct();});
 }
}
function allRow(on,mixed,label,total){return '<div class="select-all"><button class="all-toggle" id="toggleAll" role="checkbox" aria-checked="'+(on?'true':mixed?'mixed':'false')+'">'+check(on,mixed)+'<span>'+label+'</span><span class="count">共 '+total+'</span></button><button class="quick-all" id="quickAll">一键全选</button></div>';}
function drawManager(){
 const kw=draft.keyword.trim(),on=draft.managers.length===MANAGERS.length;
 let h=search('managerSearch','搜索产品经理姓名')+allRow(on,draft.managers.length>0&&!on,'全选所有产品经理',MANAGERS.length+' 位')+summary(draft.managers.length?'已选 '+draft.managers.length+' 位产品经理':'');
 const list=MANAGERS.filter(u=>!kw||u.name.includes(kw)||draft.managers.includes(u.id));
 h+=list.length?list.map(u=>{const on=draft.managers.includes(u.id),count=unique(STOCKS.filter(r=>permission.warehouses.includes(r.w)&&r.u===u.id).map(r=>r.p)).length;return '<button class="select-row" data-select-manager="'+u.id+'" role="checkbox" aria-checked="'+on+'"><span class="avatar">'+u.name[0]+'</span><span class="info"><span class="name">'+u.name+'</span><span class="sub" style="display:block">负责 '+count+' 个商品</span></span>'+check(on)+'</button>';}).join(''):'<div class="empty">未找到匹配的产品经理</div>';
 $('#sheetBody').innerHTML=h;wireSearch('managerSearch',drawManager);
 $('#toggleAll').onclick=()=>{draft.managers=on?[]:MANAGERS.map(u=>u.id);drawManager();};$('#quickAll').onclick=()=>{draft.managers=MANAGERS.map(u=>u.id);drawManager();};
 $('#sheetBody').querySelectorAll('[data-select-manager]').forEach(b=>b.onclick=()=>{toggle(draft.managers,b.dataset.selectManager);drawManager();});
}
function orgCount(){if(draft.mode==='stores')return '已选 '+draft.stores.length+' 个门店';if(draft.mode==='warehouses')return '已选 '+draft.warehouses.length+' 个仓库';return '已选 '+draft.warehouses.length+' 个仓库、'+draft.stores.length+' 个门店';}
function drawOrg(){
 const labels={stores:'门店',warehouses:'仓库',combined:'仓库+门店'},ws=allowedWarehouses(),ss=allowedStores(),kw=draft.keyword.trim();
 const allOn=(draft.mode==='warehouses'||ss.every(s=>draft.stores.includes(s.id)))&&(draft.mode==='stores'||ws.every(w=>draft.warehouses.includes(w.id)));
 const some=(draft.mode!=='warehouses'&&draft.stores.length>0)||(draft.mode!=='stores'&&draft.warehouses.length>0);
 let h='<div class="segments" role="group" aria-label="库存关联组织">'+permission.modes.map(mode=>'<button data-org-mode="'+mode+'" class="'+(draft.mode===mode?'on':'')+'" aria-pressed="'+(draft.mode===mode)+'">'+labels[mode]+'</button>').join('')+'</div>'+search('orgSearch',draft.mode==='stores'?'搜索门店名称':draft.mode==='warehouses'?'搜索仓库名称':'搜索仓库 / 门店名称');
 const total=draft.mode==='stores'?ss.length+' 个门店':draft.mode==='warehouses'?ws.length+' 个仓库':ws.length+' 仓、'+ss.length+' 店';
 h+=allRow(allOn,some&&!allOn,draft.mode==='stores'?'全选所有门店':draft.mode==='warehouses'?'全选所有仓库':'全选仓库及门店',total)+summary(some?orgCount():'');
 if(draft.mode==='stores'){
 const groups=ws.filter(w=>ss.some(s=>s.w===w.id&&(!kw||s.name.includes(kw)||w.name.includes(kw)||draft.stores.includes(s.id))));
 if(!groups.some(w=>w.id===draft.activeWarehouse))draft.activeWarehouse=groups[0]?.id||'';
 h+=groups.length?'<div class="org-columns"><div class="org-groups">'+groups.map(w=>{const ids=ss.filter(s=>s.w===w.id).map(s=>s.id),n=ids.filter(id=>draft.stores.includes(id)).length;return '<div class="org-group '+(draft.activeWarehouse===w.id?'active':'')+'"><button class="org-group-select" data-select-store-group="'+w.id+'" role="checkbox" aria-checked="'+(n===ids.length?'true':n?'mixed':'false')+'" aria-label="选择'+w.name+'下全部门店">'+check(n===ids.length,n>0&&n<ids.length,true)+'</button><button class="org-focus" data-focus-warehouse="'+w.id+'">'+w.name+'</button></div>';}).join('')+'</div><div class="org-stores">'+ss.filter(s=>s.w===draft.activeWarehouse&&(!kw||s.name.includes(kw)||WMAP[s.w].name.includes(kw)||draft.stores.includes(s.id))).map(s=>'<button class="org-store" data-select-store="'+s.id+'" role="checkbox" aria-checked="'+draft.stores.includes(s.id)+'"><span>'+s.name+'</span>'+check(draft.stores.includes(s.id),false,true)+'</button>').join('')+'</div></div>':'<div class="empty">未找到匹配门店</div>';
 }else if(draft.mode==='warehouses'){
 const list=ws.filter(w=>!kw||w.name.includes(kw)||draft.warehouses.includes(w.id));
 h+=list.length?list.map(w=>'<button class="warehouse-row" data-select-warehouse="'+w.id+'" role="checkbox" aria-checked="'+draft.warehouses.includes(w.id)+'"><span class="name">'+w.name+'</span>'+check(draft.warehouses.includes(w.id))+'</button>').join(''):'<div class="empty">未找到匹配仓库</div>';
 }else{
 const list=ws.filter(w=>!kw||w.name.includes(kw)||ss.some(s=>s.w===w.id&&s.name.includes(kw))||draft.warehouses.includes(w.id)||ss.some(s=>s.w===w.id&&draft.stores.includes(s.id)));
 h+=list.length?list.map(w=>{const stores=ss.filter(s=>s.w===w.id),on=draft.warehouses.includes(w.id)&&stores.every(s=>draft.stores.includes(s.id)),some=draft.warehouses.includes(w.id)||stores.some(s=>draft.stores.includes(s.id));return '<section class="tree-group"><div class="tree-header"><button data-select-combined="'+w.id+'" role="checkbox" aria-checked="'+(on?'true':some?'mixed':'false')+'">'+check(on,some&&!on)+'<span>'+w.name+'</span></button><button class="quick-all" style="flex:0 0 auto" data-select-combined="'+w.id+'">全选</button></div><div class="tree-stores"><button class="org-store" data-select-warehouse="'+w.id+'" role="checkbox" aria-checked="'+draft.warehouses.includes(w.id)+'"><span>仓库库存</span>'+check(draft.warehouses.includes(w.id))+'</button>'+stores.filter(s=>!kw||w.name.includes(kw)||s.name.includes(kw)||draft.stores.includes(s.id)).map(s=>'<button class="org-store" data-select-store="'+s.id+'" role="checkbox" aria-checked="'+draft.stores.includes(s.id)+'"><span>'+s.name+'</span>'+check(draft.stores.includes(s.id))+'</button>').join('')+'</div></section>';}).join(''):'<div class="empty">未找到匹配仓库或门店</div>';
 }
 $('#sheetBody').innerHTML=h;wireSearch('orgSearch',drawOrg);
 $('#sheetBody').querySelectorAll('[data-org-mode]').forEach(b=>b.onclick=()=>{draft.mode=b.dataset.orgMode;draft.keyword='';drawOrg();});
 const setAll=on=>{if(draft.mode!=='warehouses')draft.stores=on?ss.map(s=>s.id):[];if(draft.mode!=='stores')draft.warehouses=on?ws.map(w=>w.id):[];};
 $('#toggleAll').onclick=()=>{setAll(!allOn);drawOrg();};$('#quickAll').onclick=()=>{setAll(true);drawOrg();};
 $('#sheetBody').querySelectorAll('[data-focus-warehouse]').forEach(b=>b.onclick=()=>{draft.activeWarehouse=b.dataset.focusWarehouse;drawOrg();});
 $('#sheetBody').querySelectorAll('[data-select-store-group]').forEach(b=>b.onclick=()=>{draft.stores=batchToggle(draft.stores,ss.filter(s=>s.w===b.dataset.selectStoreGroup).map(s=>s.id));drawOrg();});
 $('#sheetBody').querySelectorAll('[data-select-store]').forEach(b=>b.onclick=()=>{if(permission.stores.includes(b.dataset.selectStore))toggle(draft.stores,b.dataset.selectStore);drawOrg();});
 $('#sheetBody').querySelectorAll('[data-select-warehouse]').forEach(b=>b.onclick=()=>{if(permission.warehouses.includes(b.dataset.selectWarehouse))toggle(draft.warehouses,b.dataset.selectWarehouse);drawOrg();});
 $('#sheetBody').querySelectorAll('[data-select-combined]').forEach(b=>b.onclick=()=>{const w=b.dataset.selectCombined,ids=ss.filter(s=>s.w===w).map(s=>s.id),on=draft.warehouses.includes(w)&&ids.every(id=>draft.stores.includes(id));if(on){draft.warehouses=draft.warehouses.filter(id=>id!==w);draft.stores=draft.stores.filter(id=>!ids.includes(id));}else{draft.warehouses=unique([...draft.warehouses,w]);draft.stores=unique([...draft.stores,...ids]);}drawOrg();});
}
function drawManagerDetail(){
 const p=PMAP[detailProduct],rows=productRows(p),wids=unique([...rows.warehouses.map(r=>r.w),...rows.stores.map(r=>r.w)]);
 $('#sheetBody').innerHTML='<div class="detail-product">'+esc(p.name)+'</div>'+wids.map(w=>{const warehouse=rows.warehouses.find(r=>r.w===w),stores=rows.stores.filter(r=>r.w===w),manager=UMAP[(warehouse||stores[0]).u];return '<div class="manager-detail"><span class="avatar">'+manager.name[0]+'</span><span class="info"><span class="name">'+manager.name+'</span><span class="sub" style="display:block">'+esc(WMAP[w].name)+'</span></span></div>';}).join('')+'<p class="detail-note">展示当前筛选范围内各分仓对应的产品经理。</p>';
}

$('#productFilter').onclick=()=>openSheet('product');$('#managerFilter').onclick=()=>openSheet('manager');$('#orgFilter').onclick=()=>openSheet('org');$('#sheetClose').onclick=closeSheet;$('#mask').onclick=closeSheet;
$('#sheetReset').onclick=()=>{draft.keyword='';if(modalKind==='product'){draft.products=[];draft.categories=[];}else if(modalKind==='manager')draft.managers=[];else{draft.stores=[];draft.warehouses=[];}drawSheet();};
$('#sheetConfirm').onclick=()=>{
 if(modalKind==='product'){state.productMode=draft.productMode;state.products=unique(draft.products.filter(id=>PMAP[id]));state.categories=unique(draft.categories.filter(id=>subcategoryOf(id)));}
 else if(modalKind==='manager')state.managers=unique(draft.managers.filter(id=>UMAP[id]));
 else if(modalKind==='org'){
  const chosen=draft.mode==='stores'?draft.stores.length:draft.mode==='warehouses'?draft.warehouses.length:draft.stores.length+draft.warehouses.length;
  if(!chosen){let error=$('#orgError');if(!error){error=document.createElement('p');error.id='orgError';error.setAttribute('role','alert');error.className='hint';error.style.color='#bd654b';$('#sheetBody').prepend(error);}error.textContent='请至少选择一个关联组织';$('#sheetBody').scrollTop=0;return;}
  state.mode=permission.modes.includes(draft.mode)?draft.mode:permission.initial;state.stores=unique(draft.stores.filter(id=>permission.stores.includes(id)));state.warehouses=unique(draft.warehouses.filter(id=>permission.warehouses.includes(id)));}
 closeSheet();if(modalKind!=='detail'){state.limit=10;render();}
};
$('#clearFilters').onclick=()=>{Object.assign(state,{productMode:'product',products:[],categories:[],managers:[],mode:permission.initial,stores:[...permission.stores],warehouses:[...permission.warehouses],type:'all',limit:10});render();};
$('#typeTabs').querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{state.type=b.dataset.type;state.limit=10;render();});
$('#backToReports').onclick=()=>location.assign('reports.html?v=20261026-inventory-tag');
document.addEventListener('keydown',e=>{
 if(!$('#drawer').classList.contains('show'))return;
 if(e.key==='Escape'){e.preventDefault();closeSheet();return;}
 if(e.key==='Tab'){const list=[...$('#drawer').querySelectorAll('button,input,[tabindex="0"]')].filter(el=>!el.disabled&&!el.hidden&&el.getClientRects().length),first=list[0],last=list[list.length-1];if(e.shiftKey&&(document.activeElement===first||!$('#drawer').contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!$('#drawer').contains(document.activeElement))){e.preventDefault();first?.focus();}}
});
// Keep keyboard focus on the same logical option after a list is redrawn.
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 const key=['selectProduct','productMode','selectCategoryGroup','expandCategory','selectCategory','selectManager','orgMode','focusWarehouse','selectStoreGroup','selectStore','selectWarehouse','selectCombined'].find(key=>button.dataset[key]!==undefined);
 const id=['toggleAll','quickAll'].includes(button.id)?button.id:null;
 if(!key&&!id)return;
 const attribute=key?'data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()):null;
 setTimeout(()=>{const next=id?document.getElementById(id):document.querySelector('button['+attribute+'="'+CSS.escape(button.dataset[key])+'"]');if(next&&next!==button)next.focus({preventScroll:true});},0);
},true);
// Demo-only inspection surface; production authorization must be enforced by the API.
window.InventoryDemo={account:accountKey,state,permission,visibleProducts,productRows,locations,inventoryMetrics};
render();
