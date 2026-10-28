const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE=(process.env.H5_BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const action=(page,name,id)=>page.locator('[data-action="'+name+'"]'+(id?'[data-id="'+id+'"]':''));
const waitPage=(page,name)=>page.waitForFunction(name=>RecommendationDemo.state.page===name,name);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[];
 for(const width of [320,375,485]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE+'/');
  assert.equal(await page.locator('.rec-card').count(),13);
  assert.equal(await page.evaluate(()=>RecommendationDemo.records.filter(r=>r.status==='visible').length),8);
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  await page.locator('#listSearch').fill('SP20241006');assert.equal(await page.locator('.rec-card').count(),1);
  await page.locator('#listSearch').fill('不存在的商品');assert.equal(await page.locator('.rec-card').count(),0);
  await page.locator('#listSearch').fill('');await page.locator('[data-action="status"][data-value="visible"]').click();assert.equal(await page.locator('.rec-card').count(),8);
  await page.locator('[data-action="status"][data-value="removed"]').click();assert.equal(await page.locator('.rec-card').count(),5);
  await page.locator('[data-action="status"][data-value="all"]').click();
  // Nested selectors keep the filter draft until the outer confirmation.
  await action(page,'filter').click();await action(page,'filterCategories').click();
  await action(page,'selectorGroup','meat').click();await action(page,'selectorItem','poultry').click();
  assert.equal(await action(page,'selectorGroup','meat').getAttribute('aria-checked'),'mixed');
  assert.equal(await page.locator('.sheet').evaluate(e=>getComputedStyle(e).animationName),'none');
  await action(page,'confirmSelector').click();assert.equal(await page.evaluate(()=>RecommendationDemo.state.filters.categories.length),0);
  await action(page,'filterStores').click();await action(page,'selectorGroup','east').click();await action(page,'selectorItem','s1').click();assert.equal(await action(page,'selectorGroup','east').getAttribute('aria-checked'),'mixed');
  await page.locator('#storeSearch').fill('不存在');assert.equal(await page.locator('[data-action="selectorItem"]').count(),3);
  await action(page,'confirmSelector').click();await action(page,'applyFilter').click();assert.equal(await page.locator('.rec-card').count(),2);
  assert.deepEqual(await page.locator('.rec-card .card-title').allTextContents(),['澳洲谷饲牛腱肉 1kg','内蒙古草原羔羊排 800g']);
  await action(page,'filter').click();await action(page,'resetFilter').click();await action(page,'applyFilter').click();assert.equal(await page.locator('.rec-card').count(),13);
  // Selection, cancel/confirm remove, tab counts and persistence.
  await action(page,'manage').click();await action(page,'selectRecord','r1').click();await action(page,'removeSelected').click();
  await action(page,'closeModal').click();assert.equal(await page.evaluate(()=>RecommendationDemo.records.find(r=>r.id==='r1').status),'visible');
  await action(page,'removeSelected').click();await action(page,'confirmRemove').click();assert.equal(await page.locator('[role="alertdialog"]').count(),0);
  assert.equal(await page.evaluate(()=>RecommendationDemo.records.find(r=>r.id==='r1').status),'removed');
  await page.reload();assert.equal(await page.evaluate(()=>RecommendationDemo.records.filter(r=>r.status==='removed').length),6);
  assert.equal(await page.locator('[data-record="r1"] [data-action="removeOne"]').isDisabled(),true);
  // Required fields and restoration of an existing store/product pair.
  await action(page,'add').click();await waitPage(page,'add');await action(page,'save').click();
  assert.equal(await page.locator('#storesError').innerText(),'请选择至少一家适用门店');assert.equal(await page.locator('#productsError').innerText(),'请选择至少一件启售商品');
  await action(page,'addStores').click();await action(page,'selectorItem','s3').click();await action(page,'confirmSelector').click();
  await action(page,'pickProducts').click();await waitPage(page,'picker');assert.equal(await page.locator('.picker-product').count(),19);assert.equal(await action(page,'pickProduct','SP20241020').count(),0);
  await page.locator('#productSearch').fill('SP20241006');await action(page,'pickProduct','SP20241006').click();await action(page,'pickerDone').click();await waitPage(page,'add');await action(page,'save').click();await waitPage(page,'list');
  assert.equal(await page.evaluate(()=>RecommendationDemo.records.length),13);assert.equal(await page.evaluate(()=>RecommendationDemo.records.find(r=>r.id==='r1').status),'visible');
  assert.deepEqual(await page.evaluate(()=>RecommendationDemo.records.filter(r=>r.sid==='s3').map(r=>r.rank).sort((a,b)=>a-b)),[1,2,3,4]);
  // Add two enabled products to three stores; duplicates are skipped.
  await action(page,'add').click();await action(page,'addStores').click();await action(page,'selectorAll').click();await action(page,'selectorToggleAll').click();await action(page,'selectorGroup','east').click();await action(page,'selectorItem','s4').click();await action(page,'confirmSelector').click();assert.equal(await page.evaluate(()=>RecommendationDemo.state.add.stores.length),3);
  await action(page,'pickProducts').click();await action(page,'pickProduct','SP20241001').click();await action(page,'pickProduct','SP20241002').click();
  await action(page,'pickerCategory','snacks').click();await action(page,'pickerSubcategory','nuts').click();assert.equal(await page.locator('.picker-product').count(),1);await action(page,'pickProduct','SP20241012').click();
  await action(page,'back').click();await waitPage(page,'add');assert.equal(await page.evaluate(()=>RecommendationDemo.state.add.products.length),0);
  await action(page,'pickProducts').click();await action(page,'pickProduct','SP20241001').click();await action(page,'pickProduct','SP20241002').click();await action(page,'pickerDone').click();await waitPage(page,'add');
  await page.locator('[data-action="pin"][data-kind="draft"][data-id="SP20241002"]').click();assert.deepEqual(await page.evaluate(()=>RecommendationDemo.state.add.products),['SP20241002','SP20241001']);
  await page.locator('[data-action="sort"][data-id="SP20241001"]').click();await page.locator('#sortValue').fill('1');await action(page,'applySort').click();assert.deepEqual(await page.evaluate(()=>RecommendationDemo.state.add.products),['SP20241001','SP20241002']);
  await action(page,'save').click();await waitPage(page,'list');assert.equal(await page.evaluate(()=>RecommendationDemo.records.length),17);
  assert.equal(await page.evaluate(()=>new Set(RecommendationDemo.records.map(r=>r.pid+'|'+r.sid)).size),17);
  await page.reload();assert.equal(await page.locator('.rec-card').count(),17);
  // Existing recommendation ordering is isolated by store.
  const otherBefore=await page.evaluate(()=>RecommendationDemo.records.filter(r=>r.sid!=='s3').map(r=>[r.id,r.rank]));
  await action(page,'manage').click();await page.locator('[data-action="pin"][data-kind="record"][data-id="r3"]').click();assert.equal(await page.evaluate(()=>RecommendationDemo.records.find(r=>r.id==='r3').rank),1);
  await page.locator('[data-action="sort"][data-id="r1"]').click();await page.locator('#sortValue').fill('0');await action(page,'applySort').click();assert.match(await page.locator('#sortError').innerText(),/请输入/);await page.locator('#sortValue').fill('2');await action(page,'applySort').click();assert.equal(await page.evaluate(()=>RecommendationDemo.records.find(r=>r.id==='r1').rank),2);
  assert.deepEqual(await page.evaluate(()=>RecommendationDemo.records.filter(r=>r.sid!=='s3').map(r=>[r.id,r.rank])),otherBefore);
  await action(page,'selectRecord','r1').click();await action(page,'selectRecord','r3').click();await action(page,'removeSelected').click();await action(page,'confirmRemove').click();assert.equal(await page.evaluate(()=>RecommendationDemo.records.filter(r=>['r1','r3'].includes(r.id)&&r.status==='removed').length),2);
  // Browser history and keyboard behaviour.
  await action(page,'manage').click();await action(page,'add').click();await page.goBack();await waitPage(page,'list');
  await action(page,'filter').click();await action(page,'filterCategories').click();await action(page,'selectorItem','berry').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>document.activeElement.dataset.id==='berry');await page.keyboard.press('Escape');await page.keyboard.press('Escape');assert.equal(await page.locator('.overlay').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  results.push({viewport:width+'×844',result:'passed',checks:'search/status/nested filters/batch remove/cancel/persistence/required fields/restore/add dedup/two-level picker/draft and store sorting/history/keyboard'});await page.close();
 }
 // The same browser must keep each account's persisted settings separate.
 const context=await browser.newContext({viewport:{width:375,height:844}}),page=await context.newPage();await page.goto(BASE+'/?account=admin');await action(page,'removeOne','r1').click();await action(page,'confirmRemove').click();
 await page.goto(BASE+'/?account=store');assert.equal(await page.locator('.rec-card').count(),4);assert.equal(await page.evaluate(()=>RecommendationDemo.records.find(r=>r.id==='r1').status),'visible');await action(page,'add').click();await action(page,'addStores').click();assert.equal(await page.locator('[data-action="selectorItem"]').count(),1);assert.equal(await action(page,'selectorItem','s3').count(),1);
 await page.goto(BASE+'/?account=region');assert.equal(await page.locator('.rec-card').count(),9);await action(page,'filter').click();await action(page,'filterStores').click();assert.equal(await page.locator('[data-action="selectorItem"]').count(),4);assert.equal(await action(page,'selectorItem','s5').count(),0);
 await page.goto(BASE+'/?account=invalid');assert.equal(await page.locator('.rec-card').count(),0);assert.equal(await action(page,'add').isDisabled(),true);results.push({accounts:'admin/region/store/unknown',result:'passed',checks:'authorized records/candidate stores/all-select counts/storage isolation/unknown fail closed'});await context.close();
 for(const height of [600,667]){const p=await browser.newPage({viewport:{width:320,height}});await p.goto(BASE+'/');await action(p,'filter').click();await p.waitForTimeout(280);const box=await action(p,'applyFilter').boundingBox();assert.ok(box.y+box.height<=height);await action(p,'filterStores').click();await p.waitForTimeout(280);const confirm=await action(p,'confirmSelector').boundingBox();assert.ok(confirm.y>=0&&confirm.y+confirm.height<=height);await p.close();}
 console.log(JSON.stringify({result:'passed',cases:results,shortScreens:'320×600 / 320×667 passed'},null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
