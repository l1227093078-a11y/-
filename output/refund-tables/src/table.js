/* Multi-dimensional reports: preserve confirmed filters, amount precision and sorting. */
const reportAmount=n=>Number(n).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const reportColumns=[['total','退款金额合计'],['timeout','系统/手动超时退单'],['user','未取货仅退款'],['verify','已取货退货退款']];
function reportCells(row){return reportColumns.map(([key])=>'<td data-amount="'+key+'">'+reportAmount(row[key])+'</td>').join('');}
function reportRow(dim,row){return '<tr data-report-key="'+esc(row.k)+'"><th scope="row">'+esc(NAMER[dim](row.k))+'</th>'+reportCells(row)+'</tr>';}
function reportTable(firstLabel,body,{label='退款明细',id='reportTableScroll'}={}){
 return '<div class="report-table-scroll" id="'+id+'" tabindex="0" role="region" aria-label="'+esc(label)+'，可左右滑动查看全部金额"><table class="refund-table"><caption class="sr-only">'+esc(label)+'，金额单位：元</caption><colgroup><col class="name-col"><col class="total-col"><col><col><col></colgroup><thead><tr><th scope="col">'+firstLabel+'</th>'+reportColumns.map(([,name])=>'<th scope="col">'+name+'</th>').join('')+'</tr></thead>'+body+'</table></div>';
}
function reportSummary(count,unit){return '<div class="report-summary"><span class="report-count">'+icon('category')+'<strong>共 '+count+' '+unit+'</strong></span><span class="report-unit">金额单位：元</span></div>';}
function reportPage(firstLabel,count,unit,body,label){return '<section class="table-report">'+reportSummary(count,unit)+reportTable(firstLabel,body,{label})+'<p class="report-footnote"><span>按合计金额降序排列</span><span>左右滑动查看全部金额</span></p></section>';}
function reportEmpty(){return '<tbody><tr class="report-empty"><td colspan="5">当前筛选条件下暂无数据</td></tr></tbody>';}
function openDetail(k){state.detail=k;state.page='detail';state.storeM=null;state.expCat=[];state.catInit=true;render();$('.pscroll').scrollTop=0;$('#pTitle').focus({preventScroll:true});}
function backHome(){closeStoreSheet(false);state.page='home';state.detail=null;state.storeM=null;state.expCat=[];state.catInit=false;render();}
function renderDetail(){
 const d=state.detail;$('#pTitle').textContent=ENTS.find(e=>e.k===d).t;$('#pCrumb').innerHTML='';
 const cur=pick();
 if(d==='category')return renderCategory(cur);
 if(d==='store')return renderMarketTable(cur);
 const rows=sortRows(agg(cur,KEYS[d]));
 $('#pBody').innerHTML=reportPage(d==='product'?'商品名称':'产品经理',rows.length,'项',rows.length?'<tbody>'+rows.map(r=>reportRow(d,r)).join('')+'</tbody>':reportEmpty(),ENTS.find(e=>e.k===d).t);
}
function renderCategory(cur,keepScroll=false){
 const scroll=keepScroll?($('#reportTableScroll')?.scrollLeft||0):0;
 const groups=sortRows(agg(cur,r=>SUB[r.c].p));
 const childRows=new Map(agg(cur,KEYS.category).map(r=>[r.k,r]));
 const count=groups.reduce((n,g)=>n+CAT1[g.k].subs.length,0);
 const body=groups.map(row=>{
  const expanded=state.expCat.includes(row.k),target='category-children-'+row.k;
  const parent='<tbody><tr class="category-parent" data-report-key="'+row.k+'"><th scope="row"><button type="button" class="report-expand" data-l1="'+row.k+'" aria-expanded="'+expanded+'" aria-controls="'+target+'" aria-label="'+(expanded?'收起':'展开')+esc(CAT1[row.k].name)+'二级分类">'+icon(expanded?'square-minus':'square-plus')+'<span>'+esc(CAT1[row.k].name)+'</span></button></th>'+reportCells(row)+'</tr></tbody>';
  const children=CAT1[row.k].subs.map(sub=>{
   const r=childRows.get(sub.id)||{total:0,timeout:0,user:0,verify:0};
   return '<tr class="category-child" data-subcategory="'+sub.id+'"><th scope="row">'+esc(sub.name)+'</th>'+reportCells(r)+'</tr>';
  }).join('');
  return parent+'<tbody class="category-children" id="'+target+'"'+(expanded?'':' hidden')+'>'+children+'</tbody>';
 }).join('');
 $('#pBody').innerHTML=reportPage('商品分类',count,'个二级分类',body||reportEmpty(),'按商品分类统计');
 $('#reportTableScroll').scrollLeft=scroll;
 $('#pBody').querySelectorAll('[data-l1]').forEach(button=>button.onclick=()=>{
  const id=button.dataset.l1,index=state.expCat.indexOf(id);
  if(index<0)state.expCat.push(id);else state.expCat.splice(index,1);
  renderCategory(cur,true);$('#pBody').querySelector('[data-l1="'+id+'"]').focus({preventScroll:true});
 });
}
function renderMarketTable(cur){
 const rows=sortRows(agg(cur,KEYS.market));
 const body=rows.map(row=>'<tr data-report-key="'+row.k+'"><th scope="row"><button type="button" class="report-expand market-open" data-market-detail="'+row.k+'" aria-haspopup="dialog" aria-label="查看'+esc(MMAP[row.k].name)+'门店退款明细">'+icon('square-plus')+'<span>'+esc(MMAP[row.k].name)+'</span></button></th>'+reportCells(row)+'</tr>').join('');
 $('#pBody').innerHTML=reportPage('区域',rows.length,'项',body?'<tbody>'+body+'</tbody>':reportEmpty(),'按市场/门店统计');
 $('#pBody').querySelectorAll('[data-market-detail]').forEach(button=>button.onclick=()=>openStoreSheet(button.dataset.marketDetail));
}
let storeSheetReturnFocus=null;
function openStoreSheet(market){
 storeSheetReturnFocus=document.activeElement;const rows=sortRows(agg(pick().filter(r=>r.m===market),KEYS.store));
 $('#storeSheetMarket').textContent=MMAP[market].name;
 $('#storeSheetSummary').innerHTML=reportSummary(rows.length,'家门店');
 $('#storeSheetBody').innerHTML=reportTable('门店名称',rows.length?'<tbody>'+rows.map(row=>reportRow('store',row)).join('')+'</tbody>':reportEmpty(),{label:MMAP[market].name+'门店退款明细',id:'storeTableScroll'});
 $('#storeSheetMask').hidden=false;$('#storeSheet').hidden=false;$('#storeSheet').inert=false;lockBackground(true);
 requestAnimationFrame(()=>$('#storeSheetClose').focus({preventScroll:true}));
}
function closeStoreSheet(restore=true){
 const sheet=$('#storeSheet');if(!sheet||sheet.hidden)return;
 sheet.hidden=true;sheet.inert=true;$('#storeSheetMask').hidden=true;lockBackground(false);
 if(restore&&storeSheetReturnFocus?.isConnected)storeSheetReturnFocus.focus({preventScroll:true});
}
$('#storeSheetClose').onclick=()=>closeStoreSheet();$('#storeSheetMask').onclick=()=>closeStoreSheet();
