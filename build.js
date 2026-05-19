const fs   = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// Clean dist
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);

// Compile app.jsx → app.js (removes runtime Babel requirement)
process.stdout.write('Compiling app.jsx ... ');
const jsx = fs.readFileSync(path.join(ROOT, 'app.jsx'), 'utf8');
const { code } = babel.transformSync(jsx, {
  presets: ['@babel/preset-react'],
  filename: 'app.jsx',
});
fs.writeFileSync(path.join(DIST, 'app.js'), code);
console.log('done');

// Copy flat files
for (const f of ['site.css', 'stories.inline.js', 'CNAME']) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(DIST, f));
    console.log(`Copied  ${f}`);
  }
}

// Recursive directory copy
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

for (const d of ['assets', 'images', 'work']) {
  const src = path.join(ROOT, d);
  if (fs.existsSync(src)) {
    copyDir(src, path.join(DIST, d));
    console.log(`Copied  ${d}/`);
  }
}

// Build index.html
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Drop the Babel standalone CDN script
html = html.replace(
  /[ \t]*<script src="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"[^>]*><\/script>\n/,
  ''
);

// Swap text/babel entrypoint for compiled app.js
html = html.replace(
  '<script type="text/babel" src="app.jsx"></script>',
  '<script src="app.js"></script>'
);

// Strip cache-busting query string (not needed in a fresh deploy)
html = html.replace(/site\.css\?v=\d+/, 'site.css');

// Inject PostHog credentials from environment variables
const posthogKey = process.env.POSTHOG_API_KEY || '';
const posthogHost = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';
html = html.replace(/%%POSTHOG_API_KEY%%/g, posthogKey);
html = html.replace(/%%POSTHOG_HOST%%/g, posthogHost);
if (!posthogKey) console.warn('Warning: POSTHOG_API_KEY is not set — PostHog will not initialize.');

fs.writeFileSync(path.join(DIST, 'index.html'), html);
console.log('Built   index.html');

console.log('\nStatic site ready → dist/');
