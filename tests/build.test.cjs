const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {parsePost}=require('../scripts/build.cjs');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sources=fs.readdirSync(path.join(root,'content/posts')).filter(f=>f.endsWith('.md'));
const posts=sources.map(parsePost);
test('each Markdown article has a complete standalone page and unique share image',()=>{
  assert.equal(new Set(posts.map(p=>p.slug)).size,posts.length);
  for(const p of posts){
    const html=read('blog/posts/'+p.slug+'/index.html');
    assert.match(html,/<article class="reader"/);
    assert.match(html,/<div class="post-body/);
    assert.ok(html.includes('https://yanchengxiang.com'+p.url));
    assert.ok(html.includes('https://yanchengxiang.com'+p.image));
    assert.match(html,/<meta property="og:type" content="article">/);
    assert.match(html,/<meta name="twitter:card" content="summary_large_image">/);
    assert.ok(html.includes(p.description.replaceAll('&','&amp;').replaceAll('"','&quot;')));
    const png=fs.readFileSync(path.join(root,p.image.slice(1)));
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.equal(png.readUInt32BE(16),1200);
    assert.equal(png.readUInt32BE(20),630);
  }
});
test('generated blog links and local assets resolve on a plain static server',()=>{
  const files=['blog/index.html','blog/photos/index.html',...posts.map(p=>'blog/posts/'+p.slug+'/index.html')];
  for(const file of files){
    for(const [,url] of read(file).matchAll(/(?:href|src)="(\/[^"#]*)"/g)){
      const dest=path.join(root,url.slice(1),url.endsWith('/')?'index.html':'');
      assert.ok(fs.existsSync(dest),file+' links to missing '+url);
    }
  }
});
test('shelf and sitemap include every article without requiring JavaScript',()=>{
  const shelf=read('blog/index.html'),sitemap=read('sitemap.xml');
  for(const p of posts){assert.ok(shelf.includes(`href="${p.url}"`));assert.ok(sitemap.includes(p.url));}
  assert.match(read('index.html'),/class="vtext" href="\/blog\/"/);
  assert.match(read('index.html'),/class="blog-entry" href="\/blog\/"/);
});
test('chapter headings and original writing render as content rather than client-side data',()=>{
  const html=read('blog/posts/space-junk/index.html');
  assert.match(html,/<h2>第一章<\/h2>/);
  assert.ok(!html.includes('window.POSTS'));
  assert.ok(!read('assets/blog.js').includes('window.POSTS'));
});
