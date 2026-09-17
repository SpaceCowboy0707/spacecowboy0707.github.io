/* Progressive enhancement: every route is also a complete static HTML page. */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let motionOK = !motionQuery.matches;
  motionQuery.addEventListener('change', () => { motionOK = !motionQuery.matches; });
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let theme = 'light';
  try { theme = sessionStorage.getItem('grain-theme') || 'light'; } catch {}
  let lit = true;
  let photoViewer = null;
  let photoSource = null;
  let photoClosing = false;
  let photoLayout = null;
  let darkroomDeveloped = false;
  let photoResizeTimer = null;
  let photoAnimation = null;

  function photosPerRow(w = window.innerWidth){
    if(w >= 1600) return 6;
    if(w >= 1250) return 5;
    if(w >= 950)  return 4;
    if(w >= 650)  return 3;
    return 2;
  }

  function viewPhotos(preserveScroll = false){
    document.title = '暗房 · 颗粒';
    const photos = window.PHOTOS || [];
    const tilts = [-2.4, 1.8, -1.1, 2.6, -1.9, 1.3];
    const oldScrollY = window.scrollY;
    const perRow = photosPerRow();
    photoLayout = perRow;
    const rows = [];
    for(let i=0; i<photos.length; i+=perRow) rows.push(photos.slice(i, i+perRow));
    const rope = `<svg class="rope" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,2.5 Q50,11 100,2.5" stroke="#5A4A38" stroke-width="1.1" fill="none"/>
    </svg>`;
    const rowsHtml = rows.map((row,r)=>`
      <div class="line-row">${rope}
        <div class="prints">
          ${row.map((ph,j)=>{
            const idx = r*perRow+j;
            const cap = ph.caption || '';
            const pos = ph.position || '50% 50%';
            const crop = ph.crop || '4 / 5';
            const inner = ph.src
              ? `<img class="shot" src="${esc(ph.src)}" alt="${esc(cap)}" loading="lazy">`
              : `<div class="shot">照片占位<br>把图片文件放进仓库<br>在 PHOTOS 里填上文件名</div>`;
            return `<figure class="print${ph.src ? ' has-photo' : ''}"
              ${ph.src ? `data-photo-index="${idx}" role="button" tabindex="0" aria-label="查看照片 ${esc(cap || String(idx+1))}"` : ''}
              style="--tilt:${tilts[idx % tilts.length]}deg;--photo-pos:${pos};--crop:${crop}">
              <span class="pin" aria-hidden="true"></span>
              ${inner}
              <figcaption class="print-cap">${esc(cap)}${ph.date ? ' · ' + esc(ph.date) : ''}</figcaption>
            </figure>`;
          }).join('')}
        </div>
      </div>`).join('');
    app.innerHTML = `
      <div class="shelf-head"><h1>暗房</h1><span class="count">${photos.length} 张</span></div>
      <div class="darkroom ${lit?'lit':''}" id="darkroom">
        <button class="dk-cord" id="dkCord" aria-pressed="${lit}" title="拉一下,开关灯" aria-label="拉一下,开关灯">
          <span class="cord-line" aria-hidden="true"></span>
          <span class="cord-handle" aria-hidden="true"></span>
        </button>
        <div class="dk-head">
          <span class="dk-lamp" aria-hidden="true"></span>
          <span class="dk-note" id="dkNote">${lit ? '灯还亮着,相纸不能见光 · 拉一下右上角的灯绳' : '红灯亮了,照片正在显影 · 再拉一下开灯'}</span>
        </div>
        ${rowsHtml}
      </div>`;
    if(preserveScroll){
      requestAnimationFrame(()=>window.scrollTo(0, oldScrollY));
    } else {
      window.scrollTo(0,0);
    }

    /* 显影:红灯下才开始,约 3 秒。resize 重排时保留已经显影的状态。 */
    const prints = [...app.querySelectorAll('.print')];
    const developAll = () => {
      prints.forEach(pr => pr.classList.add('dev'));
      darkroomDeveloped = true;
    };
    const resetDev = () => {
      prints.forEach(pr => pr.classList.remove('dev'));
      darkroomDeveloped = false;
    };
    if(!lit){
      if(darkroomDeveloped) developAll();
      else setTimeout(developAll, 120);
    }

    /* 灯绳 */
    const cord = document.getElementById('dkCord');
    cord.addEventListener('click', ()=>{
      lit = !lit;
      cord.classList.remove('pull'); void cord.offsetWidth; cord.classList.add('pull');
      cord.setAttribute('aria-pressed', String(lit));
      document.getElementById('darkroom').classList.toggle('lit', lit);
      resetDev();
      if(!lit) setTimeout(developAll, 120);
      document.getElementById('dkNote').textContent = lit
        ? '灯还亮着,相纸不能见光 · 拉一下右上角的灯绳'
        : '红灯亮了,照片正在显影 · 再拉一下开灯';
    });

    /* 取下已经显影的照片 */
    app.querySelectorAll('.print.has-photo').forEach(pr=>{
      const activate = ()=>{
        if(lit || !pr.classList.contains('dev')) return;
        const idx = Number(pr.dataset.photoIndex);
        openPhoto(pr, photos[idx]);
      };
      pr.addEventListener('click', activate);
      pr.addEventListener('keydown', e=>{
        if(e.key==='Enter' || e.key===' '){ e.preventDefault(); activate(); }
      });
    });
  }

  /* ---------- 取下相片 / 放回去 ---------- */
  function photoTargetRect(img){
    const nw = img.naturalWidth || img.clientWidth || 4;
    const nh = img.naturalHeight || img.clientHeight || 5;
    const frameX = 16, frameY = 38;
    const maxW = Math.min(innerWidth * .90, 1100);
    const maxH = innerHeight * .84;
    const scale = Math.min((maxW-frameX)/nw, (maxH-frameY)/nh);
    const width = Math.max(180, nw*scale + frameX);
    const height = Math.max(180, nh*scale + frameY);
    return {
      left:(innerWidth-width)/2,
      top:(innerHeight-height)/2,
      width,height
    };
  }

  function openPhoto(printEl, ph){
    if(photoViewer || photoClosing || !ph || !ph.src) return;
    const sourceImg=printEl.querySelector('img.shot');
    if(!sourceImg) return;
    const cap=ph.caption || '';
    const viewer=document.createElement('div');
    viewer.className='photo-viewer';
    viewer.setAttribute('role','dialog');
    viewer.setAttribute('aria-modal','true');
    viewer.setAttribute('aria-label',cap ? '查看照片：'+cap : '查看照片');
    viewer.innerHTML='<div class="photo-viewer-bg"></div><figure class="photo-fly"><img class="shot" alt="'+esc(cap)+'" src="'+esc(ph.src)+'"><figcaption class="print-cap">'+esc(cap)+'</figcaption></figure><button class="photo-close" aria-label="关闭照片">×</button><div class="photo-viewer-hint">点击任意处或按 Esc 放回去</div>';
    document.body.appendChild(viewer);
    photoViewer=viewer;
    photoSource=printEl;
    printEl.classList.add('photo-source-open');
    document.body.style.overflow='hidden';
    document.querySelectorAll('header, #app, footer').forEach(el=>el.inert=true);
    viewer.querySelector('.photo-close').focus({preventScroll:true});
    const fly=viewer.querySelector('.photo-fly');
    const img=fly.querySelector('img');
    const show=()=>{
      if(photoViewer!==viewer || photoClosing) return;
      const source=printEl.getBoundingClientRect(),target=photoTargetRect(img);
      fly.style.left=target.left+'px';fly.style.top=target.top+'px';
      fly.style.width=target.width+'px';fly.style.height=target.height+'px';
      fly.style.transformOrigin='0 0';
      viewer.classList.add('open');fly.classList.add('open');
      if(motionOK) photoAnimation=fly.animate([
        {transform:'translate('+(source.left-target.left)+'px,'+(source.top-target.top)+'px) scale('+source.width/target.width+','+source.height/target.height+')'},
        {transform:'none'}
      ],{duration:400,easing:'cubic-bezier(.22,.8,.25,1)'});
    };
    if(img.complete && img.naturalWidth) show();
    else img.addEventListener('load',show,{once:true});
    img.addEventListener('error',()=>closePhoto(false),{once:true});
    viewer.addEventListener('click',()=>closePhoto(true));
  }
  function closePhoto(withMotion=true){
    if(!photoViewer || (photoClosing && withMotion)) return;
    photoClosing=true;
    const viewer=photoViewer,source=photoSource;
    const finish=()=>{
      if(photoViewer!==viewer) return;
      source?.classList.remove('photo-source-open');
      viewer.remove();
      document.body.style.overflow='';
      document.querySelectorAll('header, #app, footer').forEach(el=>el.inert=false);
      if(source?.isConnected) source.focus({preventScroll:true});
      photoViewer=null;photoSource=null;photoClosing=false;photoAnimation=null;
    };
    photoAnimation?.cancel();
    if(!withMotion || !motionOK || !source?.isConnected){finish();return;}
    const fly=viewer.querySelector('.photo-fly'),from=fly.getBoundingClientRect(),to=source.getBoundingClientRect();
    viewer.classList.remove('open');
    photoAnimation=fly.animate([
      {transform:'none',opacity:1},
      {transform:'translate('+(to.left-from.left)+'px,'+(to.top-from.top)+'px) scale('+to.width/from.width+','+to.height/from.height+')',opacity:0.5}
    ],{duration:300,easing:'cubic-bezier(.22,.8,.25,1)',fill:'forwards'});
    photoAnimation.finished.catch(()=>{}).then(finish);
  }

  addEventListener('keydown', e=>{
    if(e.key==='Escape' && photoViewer) closePhoto(true);
    if(e.key==='Tab' && photoViewer){e.preventDefault();photoViewer.querySelector('.photo-close').focus();}
  });
  addEventListener('resize', ()=>{
    if(photoViewer) closePhoto(false);

    // 不要每拖 1px 都重绘；只有跨过 2/3/4/5/6 张的布局断点才重新生成绳子。
    clearTimeout(photoResizeTimer);
    photoResizeTimer = setTimeout(()=>{
      if(app.dataset.page !== 'photos') return;
      const nextLayout = photosPerRow();
      if(nextLayout !== photoLayout) viewPhotos(true);
    }, 90);
  }, {passive:true});

  // Route transitions animate transforms and opacity rather than layout properties.
  const cache = new Map();
  const pending = new Map();
  const activeAnimations = new Set();
  let transitionId = 0;
  let busy = false;
  let overlay = null;
  let shelfX = 0;
  let positionTimer = 0;
  const status = document.getElementById('routeStatus');
  const modeBtn = document.getElementById('modeToggle');
  const bar = document.getElementById('progress');
  const easing = 'cubic-bezier(.22,.8,.25,1)';

  function animate(element, frames, duration, extra = {}) {
    if (!motionOK || !element.animate) return Promise.resolve();
    const animation = element.animate(frames, { duration, easing, fill:'both', ...extra });
    activeAnimations.add(animation);
    return animation.finished.catch(() => {}).finally(() => {
      activeAnimations.delete(animation);
      animation.cancel();
    });
  }
  function cancelTransition() {
    for (const animation of activeAnimations) animation.cancel();
    activeAnimations.clear();
    if (overlay) overlay.remove();
    overlay = null;
    document.querySelectorAll('.book.is-opening').forEach(el=>el.classList.remove('is-opening'));
  }
  function makeCover(title, tone) {
    const node = document.createElement('div');
    node.className = 'route-book ' + tone;
    node.setAttribute('aria-hidden','true');
    node.innerHTML = `<div class="route-paper"></div><div class="route-cover"><span>${esc(title)}</span><i>颗粒</i></div>`;
    document.body.appendChild(node);
    overlay = node;
    return node;
  }
  function fromRect(rect) {
    return `translate(${rect.left}px,${rect.top}px) scale(${rect.width/innerWidth},${rect.height/innerHeight})`;
  }
  function savePosition() {
    clearTimeout(positionTimer);
    const books = app.querySelector('.books');
    if (books) shelfX = books.scrollLeft;
    history.replaceState({...history.state, y:scrollY, shelfX}, '', location.href);
  }
  function schedulePosition() {
    clearTimeout(positionTimer);
    if(!busy) positionTimer=setTimeout(()=>{if(!busy) savePosition();},120);
  }
  function watchShelf() {
    app.querySelector('.books')?.addEventListener('scroll',schedulePosition,{passive:true});
  }
  function loadPage(url) {
    if (cache.has(url)) return Promise.resolve(cache.get(url));
    if (pending.has(url)) return pending.get(url);
    const request = fetch(url, { signal:AbortSignal.timeout(8000) }).then(response=>{
      if (!response.ok) throw new Error('Page unavailable');
      return response.text();
    }).then(html=>{
      const doc = new DOMParser().parseFromString(html,'text/html');
      if (!doc.querySelector('#app') || !doc.querySelector('link[rel="canonical"]')) throw new Error('Invalid page');
      cache.set(url,doc);
      if(cache.size>12) cache.delete(cache.keys().next().value);
      return doc;
    }).finally(()=>pending.delete(url));
    pending.set(url,request);
    return request;
  }
  function updateNav() {
    document.getElementById('navShelf').setAttribute('aria-current',app.dataset.page==='shelf'?'page':'false');
    document.getElementById('navPhotos').setAttribute('aria-current',app.dataset.page==='photos'?'page':'false');
  }
  function updateProgress() {
    const max = document.documentElement.scrollHeight-innerHeight;
    bar.style.width = app.dataset.page==='post' && max>0 ? `${Math.min(100,scrollY/max*100)}%` : '0';
  }
  function commitPage(doc, url, options) {
    const next = doc.getElementById('app');
    app.innerHTML = next.innerHTML;
    app.dataset.page = next.dataset.page;
    document.title = doc.title;
    const selector = 'meta[name="description"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"]';
    document.head.querySelectorAll(selector).forEach(el=>el.remove());
    doc.head.querySelectorAll(selector).forEach(el=>document.head.appendChild(el.cloneNode(true)));
    if(!options.pop) history.pushState({y:0,shelfX},'',url);
    if(app.dataset.page==='photos') viewPhotos();
    const books=app.querySelector('.books');
    if(books) books.scrollLeft=options.pop ? (options.state?.shelfX||0) : shelfX;
    watchShelf();
    window.scrollTo({top:options.pop?(options.state?.y||0):0,behavior:'instant'});
    updateNav();
    updateProgress();
    status.textContent = document.title;
  }
  async function navigate(url, options = {}) {
    const id = ++transitionId;
    clearTimeout(positionTimer);
    cancelTransition();
    closePhoto(false);
    if(!options.pop) savePosition();
    busy = true;
    app.setAttribute('aria-busy','true');
    status.textContent = '正在翻页…';
    let source = options.source;
    let node;
    let opening;
    const sourceIsBook=source?.classList.contains('book');
    if(sourceIsBook && motionOK) {
      node=makeCover(source.querySelector('.book-title').textContent,(source.className.match(/\bt\d\b/)||['t0'])[0]);
      const start=fromRect(source.getBoundingClientRect());
      node.style.transform='none';
      source.classList.add('is-opening');
      opening=animate(node,[{transform:start},{transform:'none'}],420);
    }
    try {
      const doc=await loadPage(url);
      if(id!==transitionId) return;
      if(opening) await opening;
      if(id!==transitionId) return;
      if(!node && !options.close) await animate(app,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-5px)'}],110);
      if(id!==transitionId) return;
      commitPage(doc,url,options);
      if(node) {
        const cover=node.querySelector('.route-cover');
        cover.style.transform='rotateY(-110deg)';
        await Promise.all([
          animate(cover,[{transform:'rotateY(0deg)'},{transform:'rotateY(-110deg)'}],340),
          animate(node,[{opacity:1},{opacity:0}],260,{delay:90})
        ]);
      } else if(options.close && motionOK) {
        const book=app.querySelector(`.book[data-slug="${CSS.escape(options.close)}"]`);
        if(book) {
          // Center the destination only if it is outside the restored shelf viewport.
          const bounds=book.getBoundingClientRect();
          const container=book.parentElement.getBoundingClientRect();
          if(bounds.left<container.left || bounds.right>container.right) book.scrollIntoView({inline:'center',block:'nearest',behavior:'instant'});
          node=makeCover(book.querySelector('.book-title').textContent,(book.className.match(/\bt\d\b/)||['t0'])[0]);
          const end=fromRect(book.getBoundingClientRect());
          node.style.transform=end;
          book.classList.add('is-opening');
          await animate(node,[{transform:'none',opacity:1},{transform:end,opacity:1}],430);
          book.classList.remove('is-opening');
        }
      } else {
        await animate(app,[{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],190);
      }
      if(id===transitionId) {
        const target=options.close ? app.querySelector(`.book[data-slug="${CSS.escape(options.close)}"]`) : app.querySelector('h1');
        (target||app).focus({preventScroll:true});
      }
    } catch {
      if(id===transitionId) location.assign(url);
    } finally {
      if(id===transitionId) {
        cancelTransition();
        busy=false;
        app.removeAttribute('aria-busy');
      }
    }
  }
  function internalLink(event) {
    const link=event.target.closest('a[data-route]');
    if(!link || link.hasAttribute('download') || (link.target && link.target!=='_self')) return null;
    const url=new URL(link.href,location.href);
    return url.origin===location.origin && url.pathname.startsWith('/blog/') ? link : null;
  }
  document.addEventListener('click',event=>{
    if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link=internalLink(event);
    if(!link) return;
    event.preventDefault();
    if(busy) return;
    const url=new URL(link.href).pathname;
    if(url===location.pathname) return;
    navigate(url,{source:link,close:link.dataset.close});
  });
  // Fetch only the link the reader is about to use, not every article at once.
  for(const eventName of ['pointerover','focusin']) document.addEventListener(eventName,event=>{
    const link=internalLink(event);
    if(link && !navigator.connection?.saveData) loadPage(new URL(link.href).pathname).catch(()=>{});
  });
  history.scrollRestoration='manual';
  window.addEventListener('popstate',event=>{
    navigate(location.pathname,{pop:true,state:event.state});
  });
  function legacyRoute() {
    const match=location.hash.match(/^#\/p\/([a-z0-9-]+)\/?$/);
    if(match) { location.replace('/blog/posts/'+match[1]+'/'); return true; }
    if(location.hash==='#/photos') { location.replace('/blog/photos/'); return true; }
    return false;
  }
  window.addEventListener('hashchange',legacyRoute);
  function applyTheme() {
    document.documentElement.dataset.theme=theme;
    modeBtn.textContent=theme==='dark'?'开灯':'关灯';
    modeBtn.setAttribute('aria-pressed',String(theme==='dark'));
  }
  modeBtn.addEventListener('click',()=>{
    theme=theme==='dark'?'light':'dark';
    try { sessionStorage.setItem('grain-theme',theme); } catch {}
    applyTheme();
  });
  let scrollFrame=0;
  addEventListener('scroll',()=>{
    if(!scrollFrame) scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;updateProgress();});
    schedulePosition();
  },{passive:true});
  addEventListener('pagehide',savePosition);
  if(legacyRoute()) return;
  if(app.dataset.page==='photos') viewPhotos();
  watchShelf();
  applyTheme();
  updateNav();
  updateProgress();
})();
