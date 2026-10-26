"""Build a standalone, offline-capable inventory H5 from the local source files."""
from pathlib import Path
import json
SOURCE=Path(__file__).resolve().parent
ROOT=SOURCE.parent
reference=(ROOT/'refund.html').read_text()
decoder=json.JSONDecoder()
def const(name):return decoder.raw_decode(reference.split('const '+name+'=',1)[1])[0]
shared={'icons':const('ICONS'),'assets':const('ASSETS')}
status=reference[reference.index('    <div class="statusbar"'):reference.index('    <header class="nav">')]
styles=(SOURCE/'inventory.css').read_text();script=(SOURCE/'inventory.js').read_text()
icon=lambda name:shared['icons'][name]
html='''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f4f8f5">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<title>库存统计</title>
<meta name="description" content="库存统计H5，支持商品分类、产品经理、仓库与门店筛选。">
<style>'''+styles+'''</style>
</head><body><div class="stage"><div class="phone">
'''+status+'''<header class="nav" id="pageNav"><button class="back" id="backToReports" aria-label="返回经营报表">'''+icon('chevron-left')+'''</button><h1>库存统计</h1></header>
<main class="main" id="pageContent">
<section class="filters" aria-label="库存筛选">
<div class="filter-row"><span>商品/分类</span><button class="filter-button" id="productFilter" aria-label="选择商品或分类"><span class="chips" id="productChips"></span><span class="arrow">'''+icon('chevron-down')+'''</span></button></div>
<div class="filter-row"><span>产品经理</span><button class="filter-button" id="managerFilter" aria-label="选择产品经理"><span class="chips" id="managerChips"></span><span class="arrow">'''+icon('chevron-down')+'''</span></button></div>
<div class="filter-row"><span>关联组织</span><button class="filter-button" id="orgFilter" aria-label="选择关联组织"><span class="chips" id="orgChips"></span><span class="arrow">'''+icon('chevron-down')+'''</span></button></div>
<div class="filter-tail"><span id="scopeNote"></span><button id="clearFilters">重置筛选</button></div>
</section>
<div class="mode-tabs" id="typeTabs" role="group" aria-label="商品类型"><button data-type="all" class="on" aria-pressed="true">全部</button><button data-type="standard" aria-pressed="false">标品</button><button data-type="nonstandard" aria-pressed="false">非标品</button><span class="result-count" id="resultCount" aria-live="polite"></span></div>
<section class="stock-list" id="stockList" aria-label="库存商品列表"></section><div id="listEnd"></div>
</main>
<div class="home-indicator" aria-hidden="true"><span></span></div>
<div class="mask" id="mask"></div>
<section class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" aria-hidden="true" inert>
<header class="drawer-header"><h2 id="sheetTitle">筛选</h2><button class="close" id="sheetClose" aria-label="关闭筛选">'''+icon('x')+'''</button></header>
<div class="drawer-body" id="sheetBody"></div><footer class="drawer-footer"><button id="sheetReset">重置</button><button class="primary" id="sheetConfirm">确定</button></footer>
</section>
</div></div>
<script>const SHARED='''+json.dumps(shared,ensure_ascii=False,separators=(',',':'))+''';
'''+script+'''</script>
<!-- Embedded icons: Tabler Icons (MIT); product thumbnails: Twemoji (CC BY 4.0). See THIRD_PARTY_NOTICES.md. -->
</body></html>'''
(ROOT/'inventory.html').write_text(html)
print('Built',ROOT/'inventory.html')
