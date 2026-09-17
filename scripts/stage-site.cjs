// Publish only public assets and current generated articles, never build dependencies.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, '_site');
// This directory is an explicit, repository-local build output, not a configurable path.
if (fs.existsSync(destination)) fs.rmSync(destination, {recursive: true});
fs.mkdirSync(destination);
function copy(file) {
  const target = path.join(destination, file);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(root, file), target);
}
for (const file of ['index.html', 'CNAME', '.nojekyll', 'sitemap.xml', 'robots.txt', 'blog/index.html', 'blog/photos/index.html', 'assets/blog.css', 'assets/blog.js', 'assets/photos.js', 'assets/share/grain.png']) copy(file);
for (const slug of JSON.parse(fs.readFileSync(path.join(root, 'blog/posts/manifest.json'), 'utf8'))) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Invalid article slug');
  copy(`blog/posts/${slug}/index.html`);
  copy(`assets/share/${slug}.png`);
}
for (const photo of JSON.parse(fs.readFileSync(path.join(root, 'content/photos.json'), 'utf8'))) {
  const relative = photo.src.replace(/^\//, '');
  const source = path.resolve(root, relative);
  if (!source.startsWith(path.join(root, 'blog/photos') + path.sep)) throw new Error('Photo outside public directory');
  copy(relative);
}
// Keep future article illustrations and home assets available without publishing sources.
for (const folder of ['images', 'assets/images']) {
  if (fs.existsSync(path.join(root, folder))) fs.cpSync(path.join(root, folder), path.join(destination, folder), {recursive:true});
}
for (const file of ['favicon.png', 'apple-touch-icon.png', 'og.png', 'avatar.jpg', 'resume.pdf']) {
  if (fs.existsSync(path.join(root, file))) copy(file);
}
console.log('Public website ready in _site/');
