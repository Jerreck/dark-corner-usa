'use strict';
const fs   = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

/* ── data ─────────────────────────────────────────────────────────────── */
const STORIES = JSON.parse(fs.readFileSync(path.join(__dirname, 'stories.json'), 'utf8'))
  .slice().sort((a, b) => a.n - b.n);

/* ── helpers ──────────────────────────────────────────────────────────── */
const pad2 = n => String(n).padStart(2, '0');
const pad3 = n => String(n).padStart(3, '0');

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text) {
  // escape XML special chars first, then apply markup
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g,     '<em>$1</em>');
  s = s.replace(/_(.+?)_/g,       '<em>$1</em>');
  return s;
}

const chId   = n => `ch${pad3(n)}`;
const chFile = n => `${chId(n)}.xhtml`;

/* ── chapter XHTML ────────────────────────────────────────────────────── */
function chapterXhtml(story) {
  const paras = story.body.split(/\r?\n+/).map(s => s.trim()).filter(Boolean);

  const bodyLines = paras.map((p, i) => {
    if (i === 0) {
      return `    <p class="first-para"><span class="dropcap">${esc(p[0])}</span>${renderInline(p.slice(1))}</p>`;
    }
    return `    <p>${renderInline(p)}</p>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${esc(story.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <section epub:type="chapter" id="${chId(story.n)}">
    <h2 class="chapter-num">&#x2116;&#x2002;${pad2(story.n)}</h2>
    <h1 class="chapter-title">${esc(story.title)}</h1>
${bodyLines}
  </section>
</body>
</html>`;
}

/* ── content.opf ──────────────────────────────────────────────────────── */
const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
         version="3.0" unique-identifier="uid" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">dark-corner-usa-2026</dc:identifier>
    <dc:title>Dark Corner USA</dc:title>
    <dc:creator id="author">Willis Moody McWilliams</dc:creator>
    <dc:contributor>John Moody McWilliams</dc:contributor>
    <dc:language>en</dc:language>
    <dc:description>Forty-three stories from Dark Corner, Marshall County, Oklahoma.</dc:description>
    <dc:rights>&#x00A9; 2026 Jerreck Moody McWilliams</dc:rights>
    <meta property="dcterms:modified">2026-05-10T00:00:00Z</meta>
    <meta refines="#author" property="role" scheme="marc:relators">aut</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml"  media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx"   media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
${STORIES.map(s =>
  `    <item id="${chId(s.n)}" href="${chFile(s.n)}" media-type="application/xhtml+xml"/>`
).join('\n')}
  </manifest>
  <spine toc="ncx">
${STORIES.map(s => `    <itemref idref="${chId(s.n)}"/>`).join('\n')}
  </spine>
</package>`;

/* ── nav.xhtml ────────────────────────────────────────────────────────── */
const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Dark Corner USA &#x2014; Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
${STORIES.map(s =>
  `      <li><a href="${chFile(s.n)}">${esc(pad2(s.n))}. ${esc(s.title)}</a></li>`
).join('\n')}
    </ol>
  </nav>
</body>
</html>`;

/* ── toc.ncx (EPUB 2 fallback) ────────────────────────────────────────── */
const tocNcx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid"            content="dark-corner-usa-2026"/>
    <meta name="dtb:depth"          content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber"  content="0"/>
  </head>
  <docTitle><text>Dark Corner USA</text></docTitle>
  <navMap>
${STORIES.map((s, i) => `    <navPoint id="np${pad3(s.n)}" playOrder="${i + 1}">
      <navLabel><text>${esc(pad2(s.n))}. ${esc(s.title)}</text></navLabel>
      <content src="${chFile(s.n)}"/>
    </navPoint>`).join('\n')}
  </navMap>
</ncx>`;

/* ── META-INF/container.xml ───────────────────────────────────────────── */
const containerXml = `<?xml version="1.0" encoding="utf-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf"
              media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

/* ── style.css ────────────────────────────────────────────────────────── */
const styleCSS = `body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1em;
  line-height: 1.65;
  margin: 0;
  padding: 0;
  color: #1c1814;
  background: #fdf8ef;
}
section {
  padding: 2.5em 1.5em 3em;
  max-width: 34em;
  margin: 0 auto;
}
h2.chapter-num {
  font-size: 0.8em;
  font-weight: bold;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #7a5c35;
  margin: 0 0 0.3em;
}
h1.chapter-title {
  font-size: 1.55em;
  font-weight: normal;
  font-style: italic;
  margin: 0 0 1.6em;
  line-height: 1.3;
  color: #1c1814;
}
p {
  margin: 0 0 0.85em;
  text-align: justify;
  -webkit-hyphens: auto;
  -epub-hyphens: auto;
  hyphens: auto;
}
p.first-para { margin-top: 0; }
.dropcap {
  float: left;
  font-size: 3.1em;
  line-height: 0.82;
  margin: 0.04em 0.05em 0 0;
  color: #5c3d1e;
}
strong { font-weight: bold; }
em     { font-style: italic; }
/* nav / TOC */
nav h1 {
  font-size: 1.2em;
  font-weight: bold;
  border-bottom: 1px solid #c8b99a;
  padding-bottom: 0.4em;
  margin-bottom: 1em;
}
nav ol {
  list-style: none;
  padding: 0;
  margin: 0;
}
nav li {
  padding: 0.35em 0;
  border-bottom: 1px solid #e8dfc8;
  font-size: 0.95em;
}
nav a {
  color: #1c1814;
  text-decoration: none;
}`;

/* ── build EPUB ───────────────────────────────────────────────────────── */
const outFile = path.join(__dirname, 'dark-corner-usa.epub');
const output  = fs.createWriteStream(outFile);
const archive = new ZipArchive({ zlib: { level: 9 } });

archive.on('error', err => { throw err; });
archive.pipe(output);

// mimetype must be first entry, stored (not compressed)
archive.append('application/epub+zip', { name: 'mimetype', store: true });
archive.append(containerXml, { name: 'META-INF/container.xml' });
archive.append(contentOpf,   { name: 'OEBPS/content.opf' });
archive.append(navXhtml,     { name: 'OEBPS/nav.xhtml' });
archive.append(tocNcx,       { name: 'OEBPS/toc.ncx' });
archive.append(styleCSS,     { name: 'OEBPS/style.css' });

for (const story of STORIES) {
  archive.append(chapterXhtml(story), { name: `OEBPS/${chFile(story.n)}` });
}

output.on('close', () => {
  const kb = (archive.pointer() / 1024).toFixed(1);
  console.log(`✓  dark-corner-usa.epub  (${kb} KB,  ${STORIES.length} stories)`);
});

archive.finalize();
