/* global React, ReactDOM */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const STORIES = (window.__DC_STORIES__ || []).slice().sort((a, b) => a.n - b.n);

/* -------------------- helpers -------------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const fmtN = (n) => "№ " + pad2(n);

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
const roman = (n) => {
  // simple to ~50
  if (n <= 20) return ROMAN[n - 1];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensStr = ["", "X", "XX", "XXX", "XL", "L"][tens];
  return tensStr + (ones ? ROMAN[ones - 1] : "");
};

const lsKey = "darkcorner.v1";
const loadLS = () => {
  try { return JSON.parse(localStorage.getItem(lsKey)) || {}; } catch (e) { return {}; }
};
const saveLS = (obj) => { try { localStorage.setItem(lsKey, JSON.stringify(obj)); } catch (e) { } };

/* -------------------- markdown-ish renderer -------------------- */
// Stories are essentially plaintext with **bold** at title; body has paragraphs separated by single \n
// We treat each non-empty line as a paragraph. Inline: **bold**, *italic*, _italic_, simple links.
function renderInline(text, key) {
  // tokenize on **bold** and *italic*
  const out = [];
  let i = 0;
  let buf = "";
  const push = (node) => {
    if (buf) { out.push(buf); buf = ""; }
    out.push(node);
  };
  while (i < text.length) {
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end > -1) {
        push(<strong key={key + "-b" + i}>{text.slice(i + 2, end)}</strong>);
        i = end + 2; continue;
      }
    }
    if (text[i] === "*" || text[i] === "_") {
      const ch = text[i];
      const end = text.indexOf(ch, i + 1);
      if (end > -1 && end - i > 1 && /\S/.test(text.slice(i + 1, end))) {
        push(<em key={key + "-i" + i}>{text.slice(i + 1, end)}</em>);
        i = end + 1; continue;
      }
    }
    buf += text[i++];
  }
  if (buf) out.push(buf);
  return out;
}

function StoryImage({ img, order }) {
  return (
    <figure className="story-image">
      <div className="story-image-frame">
        <img src={img.url} alt={img.caption || ""} />
      </div>
      <figcaption className="mono plate-cap">
        <span>Plate {roman(order + 1)}</span>
        <span className="plate-cap-dots" />
        <span>{img.caption || ""}</span>
      </figcaption>
    </figure>
  );
}

function StoryBody({ body, n, images }) {
  const paras = useMemo(() => body.split(/\n+/).map(s => s.trim()).filter(Boolean), [body]);

  const imageMap = useMemo(() => {
    const map = new Map();
    if (!images || images.length === 0) return map;
    let globalOrder = 0;
    const sorted = [...images].sort((a, b) => (a.after ?? 0) - (b.after ?? 0));
    for (const img of sorted) {
      const after = img.after ?? 0;
      if (!map.has(after)) map.set(after, []);
      map.get(after).push({ ...img, order: globalOrder++ });
    }
    return map;
  }, [images]);

  const usePlates = !images || images.length === 0;
  const plates = useMemo(() => {
    if (!usePlates) return new Set();
    if (paras.length < 6) return new Set([0]);
    const set = new Set([0]);
    if (paras.length >= 8) set.add(Math.floor(paras.length / 2));
    return set;
  }, [paras, usePlates]);

  return (
    <div className="story-body">
      {paras.map((p, idx) => {
        const isFirst = idx === 0;
        const afterImages = imageMap.get(idx) || [];
        return (
          <React.Fragment key={idx}>
            {plates.has(idx) && (
              <Plate n={n} order={[...plates].indexOf(idx)} />
            )}
            <p className={isFirst ? "first-para" : ""}>
              {isFirst ? (
                <>
                  <span className="dropcap">{p[0]}</span>
                  {renderInline(p.slice(1), "p" + idx)}
                </>
              ) : renderInline(p, "p" + idx)}
            </p>
            {afterImages.map((img, i) => (
              <StoryImage key={img.url + i} img={img} order={img.order} />
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* -------------------- image plate placeholder -------------------- */
const PLATE_TINTS = [
  "tobacco", "ink", "sage", "barn", "dust"
];
function Plate({ n, order }) {
  const tint = PLATE_TINTS[(n + order) % PLATE_TINTS.length];
  const captions = [
    "photograph — drop a real one in here",
    "family portrait, c. 1940s",
    "place — a road, a house, a creek bend",
    "clipping — newspaper, ledger, letter",
    "object — leather, paper, handbill",
  ];
  const cap = captions[(n + order) % captions.length];
  return (
    <figure className={"plate plate--" + tint}>
      <div className="plate-frame">
        <div className="plate-halftone" />
        <div className="plate-mark">Pl. {roman(order + 1)}</div>
        <div className="plate-empty">
          <span className="mono">[ {cap} ]</span>
        </div>
      </div>
      <figcaption className="mono plate-cap">
        <span>Plate {roman(order + 1)}</span>
        <span className="plate-cap-dots" />
        <span>placeholder</span>
      </figcaption>
    </figure>
  );
}

/* -------------------- hash routing -------------------- */
function useHashRoute() {
  const get = () => {
    const h = (location.hash || "").replace(/^#\/?/, "");
    if (!h) return { name: "home" };
    if (h === "bookmarks") return { name: "bookmarks" };
    if (h === "about") return { name: "about" };
    if (h === "contact") return { name: "contact" };
    if (h === "advertising") return { name: "advertising" };
    return { name: "story", slug: h };
  };
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => setRoute(get());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
const goto = (h) => { location.hash = h ? "#/" + h : ""; };

/* -------------------- nav (top bar) -------------------- */
function TopBar({ route, onMenu, progress }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="iconbtn" aria-label="Menu" onClick={onMenu}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <a href="#" className="brand" onClick={(e) => { e.preventDefault(); goto(""); }}>
          <img src="assets/dark-corner-mark.png" alt="" />
          <span className="brand-wm">Dark Corner <span className="dot">·</span> USA</span>
        </a>
        <div className="topbar-right">
          {route.name === "story" ? (
            <button className="iconbtn" aria-label="Library" onClick={() => goto("")}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 5h6v14H4zM14 5h6v14h-6z" />
              </svg>
            </button>
          ) : (
            <button className="iconbtn" aria-label="About" onClick={() => goto("about")}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v.01M11 12h1v5" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {progress != null && (
        <div className="reading-progress" aria-hidden>
          <div className="reading-progress-fill" style={{ width: (progress * 100).toFixed(2) + "%" }} />
        </div>
      )}
    </header>
  );
}

/* -------------------- side menu -------------------- */
function SideMenu({ open, onClose }) {
  return (
    <div className={"sidemenu " + (open ? "open" : "")} onClick={onClose}>
      <aside className="sidemenu-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sidemenu-head">
          <img src="assets/dark-corner-mark.png" alt="" />
          <div>
            <div className="display sidemenu-title">Dark Corner USA</div>
            <div className="mono sidemenu-sub"></div>
          </div>
        </div>
        <nav className="sidemenu-nav">
          <a href="#" onClick={(e) => { e.preventDefault(); goto(""); onClose(); }}>The Library</a>
          <a href="#/bookmarks" onClick={(e) => { e.preventDefault(); goto("bookmarks"); onClose(); }}>Bookmarks</a>
          <a href="#/about" onClick={(e) => { e.preventDefault(); goto("about"); onClose(); }}>About this book</a>
          <a href="#/contact" onClick={(e) => { e.preventDefault(); goto("contact"); onClose(); }}>Contact</a>
          <a href="#/advertising" onClick={(e) => { e.preventDefault(); goto("advertising"); onClose(); }}>Advertising</a>
        </nav>
        <div className="sidemenu-foot mono">
        </div>
      </aside>
    </div>
  );
}

/* -------------------- home / library -------------------- */
function Hero({ resume }) {
  return (
    <section className="hero">
      <div className="hero-mark">
        <img src="assets/dark-corner-mark.png" alt="Dark Corner mark" />
      </div>
      <h1 className="hero-title">Stories from<br />Dark Corner</h1>
      <p className="hero-deck">
        A collection of articles by Willis Moody McWilliams.
      </p>
      <div className="hero-cta">
        {resume ? (
          <button className="btn btn-primary" onClick={() => goto(resume.slug)}>
            <span className="mono btn-kicker">Continue №&nbsp;{pad2(resume.n)}</span>
            <span className="btn-title">{resume.title}</span>
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => goto(STORIES[0].slug)}>
            <span className="mono btn-kicker">Begin at the beginning</span>
            <span className="btn-title">{STORIES[0].title}</span>
          </button>
        )}
      </div>
      <div className="hero-rule" />
    </section>
  );
}

function StoryCard({ s, bookmarked, lastRead }) {
  const excerpt = (s.body.split(/\n/)[0] || "").slice(0, 130);
  return (
    <a className="storycard" href={"#/" + s.slug} onClick={(e) => { e.preventDefault(); goto(s.slug); }}>
      <div className="storycard-num">
        <span className="mono">{pad2(s.n)}</span>
      </div>
      <div className="storycard-body">
        <div className="storycard-meta">
          <span>{s.minutes} min read</span>
          <span className="dot">·</span>
          <span>{s.words.toLocaleString()} words</span>
          {bookmarked && <span className="badge">★ Saved</span>}
          {lastRead && <span className="badge badge-read">Last read</span>}
        </div>
        <h3 className="storycard-title">{s.title}</h3>
        <p className="storycard-excerpt">{excerpt}…</p>
      </div>
      <div className="storycard-arrow" aria-hidden>→</div>
    </a>
  );
}

function Library({ saved, lastSlug }) {
  const [q, setQ] = useState("");
  const [showFilter, setShowFilter] = useState("all"); // all | saved
  const list = useMemo(() => {
    let l = STORIES;
    if (showFilter === "saved") l = l.filter(s => saved[s.slug]);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      l = l.filter(s => s.title.toLowerCase().includes(needle) || s.body.toLowerCase().includes(needle));
    }
    return l;
  }, [q, showFilter, saved]);

  const resumeStory = useMemo(() => STORIES.find(s => s.slug === lastSlug), [lastSlug]);

  return (
    <main className="page library">
      <Hero resume={resumeStory} />
      <section className="library-list">
        <div className="section-head">
          <div>
            <h2 className="section-title">The Library</h2>
          </div>
          <div className="search-row">
            <div className="search-wrap">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.6" fill="none">
                <circle cx="11" cy="11" r="6" />
                <path d="M20 20l-4-4" />
              </svg>
              <input
                type="search"
                placeholder="Search a name, a year…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && <button className="search-clear" onClick={() => setQ("")} aria-label="Clear">×</button>}
            </div>
            <div className="seg">
              <button className={showFilter === "all" ? "on" : ""} onClick={() => setShowFilter("all")}>All</button>
              <button className={showFilter === "saved" ? "on" : ""} onClick={() => setShowFilter("saved")}>Saved</button>
            </div>
          </div>
        </div>
        {list.length === 0 ? (
          <div className="empty mono">— nothing found in this corner —</div>
        ) : (
          <div className="storylist">
            {list.map(s => (
              <StoryCard
                key={s.n}
                s={s}
                bookmarked={!!saved[s.slug]}
                lastRead={lastSlug === s.slug}
              />
            ))}
          </div>
        )}
      </section>
      <Colophon />
    </main>
  );
}

/* -------------------- story view -------------------- */
function Story({ slug, saved, toggleSave, setLastSlug, onProgress }) {
  const idx = STORIES.findIndex(s => s.slug === slug);
  const s = STORIES[idx];
  const prev = idx > 0 ? STORIES[idx - 1] : null;
  const next = idx < STORIES.length - 1 ? STORIES[idx + 1] : null;

  // scroll to top on slug change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    setLastSlug(slug);
  }, [slug]);

  // progress
  useEffect(() => {
    let raf = 0;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0;
        onProgress(p);
      });
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
      cancelAnimationFrame(raf);
    };
  }, [slug, onProgress]);

  if (!s) {
    return <main className="page"><div className="storynotfound">Story not found. <a href="#" onClick={(e) => { e.preventDefault(); goto(""); }}>Back to the library</a>.</div></main>;
  }

  const isBookmarked = !!saved[s.slug];

  return (
    <main className="page story-page">
      <article className="story">
        <header className="story-head">
          <div className="story-meta-top mono">
            <span>Story №&nbsp;{pad2(s.n)} of {STORIES.length}</span>
            <span>{s.minutes} min</span>
          </div>
          <div className="story-kicker">— Vol. I, Stories from Dark Corner —</div>
          <h1 className="story-title">{s.title}</h1>
          <div className="story-byline mono">
            By <span>Willis McWilliams</span>
            <span className="story-byline-sep">·</span>
            <span>Kingston, OK</span>
          </div>
          <div className="story-actions">
            <button
              className={"chip " + (isBookmarked ? "chip-on" : "")}
              onClick={() => toggleSave(s.slug)}
              aria-pressed={isBookmarked}
            >
              <span className="chip-glyph">{isBookmarked ? "★" : "☆"}</span>
              <span>{isBookmarked ? "Saved" : "Save"}</span>
            </button>
            <button
              className="chip"
              onClick={async () => {
                const url = location.href;
                if (navigator.share) {
                  try { await navigator.share({ title: s.title, url }); } catch (e) { }
                } else {
                  try { await navigator.clipboard.writeText(url); } catch (e) { }
                }
              }}
              aria-label="Share"
            >
              <span className="chip-glyph">↗</span>
              <span>Share</span>
            </button>
          </div>
        </header>

        <StoryBody body={s.body} n={s.n} images={s.images} />

        <div className="story-end">
          <div className="endmark">
            <span className="endmark-line" />
            <span className="endmark-glyph">✦</span>
            <span className="endmark-line" />
          </div>
          <div className="mono endmark-tag">— end of story №&nbsp;{pad2(s.n)} —</div>
        </div>
      </article>

      <nav className="story-nav">
        {prev ? (
          <a className="story-nav-link" href={"#/" + prev.slug} onClick={(e) => { e.preventDefault(); goto(prev.slug); }}>
            <div className="mono story-nav-kicker">← Previous &middot; №&nbsp;{pad2(prev.n)}</div>
            <div className="story-nav-title">{prev.title}</div>
          </a>
        ) : <div />}
        {next ? (
          <a className="story-nav-link right" href={"#/" + next.slug} onClick={(e) => { e.preventDefault(); goto(next.slug); }}>
            <div className="mono story-nav-kicker">Next &middot; №&nbsp;{pad2(next.n)} →</div>
            <div className="story-nav-title">{next.title}</div>
          </a>
        ) : <div />}
      </nav>

      <div className="back-to-library">
        <a href="#" onClick={(e) => { e.preventDefault(); goto(""); }}>↺ &nbsp; Back to the library</a>
      </div>
    </main>
  );
}

/* -------------------- bookmarks page -------------------- */
function Bookmarks({ saved }) {
  const list = STORIES.filter(s => saved[s.slug]);
  return (
    <main className="page library">
      <section className="library-list">
        <div className="section-head">
          <div>
            <div className="mono section-num">§ Bookmarks</div>
            <h2 className="section-title">Saved for later.</h2>
          </div>
        </div>
        {list.length === 0 ? (
          <div className="empty mono">— No bookmarks yet. Tap ☆ on any story to save it. —</div>
        ) : (
          <div className="storylist">
            {list.map(s => <StoryCard key={s.n} s={s} bookmarked={true} />)}
          </div>
        )}
      </section>
      <Colophon />
    </main>
  );
}

/* -------------------- about page -------------------- */
function About() {
  return (
    <main className="page about">
      <div className="about-card">
        <img src="assets/dark-corner-mark.png" alt="" className="about-mark" />
        <h1 className="display about-title">Our Story</h1>
        <p className="mono about-meta">By Jerreck Moody McWilliams</p>
        <p>
          Willis Moody McWilliams was born in 1938 in a small white house in Dark Corner, a region in Marshall County, Oklahoma best describe by this excerpt from "Moonshine Cave":
        </p>
        <blockquote>
          Dark Corner had no real boundaries before 1907, when the school districts were drawn; it was just there, in the eastern part of Marshall County near the Washita River. It was somewhat secluded and pretty much stayed so until the 1940's when the railroad was rerouted through it.
        </blockquote><blockquote>
          Someone once said that to get to the remotest residence in Dark Corner you had to swing in on a grapevine. Even then, you were likely to find a note on the door saying: "Gone to the country." Those who lived in it knew where they lived and had a special feeling about this remote area.
        </blockquote>
        <p>
          Willis began writing stories about Dark Corner after attending the Woodville High School reunion in 2002.  He realized listening to the "old timers" that if he didn't write down what he knew, his memories and the history of the region would like go with him.  So he set about recording his knowledge in Word Pad.
        </p>
        <p>His son (my father) John Moody McWilliams helped him compile the book.  Dad handled most of the investigative journalism for the book, as well as drew most of the illustrations.  His biggest endeavor, however, was camposing the printed version of the book.  He was not a technicallly savvy person.  Even though software existed at the time that would've allowed him to design the layout of the book digitally, he instead arranged the illustrations and photos around printed text, tapped the pages together, then scanned them to create a "page."</p>
        <p>I remember when dad and Daddy Willis (as he's called by his grandkids) went to "mass-produce" the first version of the book.  An entire weekend was spent printing copies from a tiny office printer and then punching an endless number of holes through the pages.  They consumed probbaly a dozen boxes of copier paper and a hundred of those plastic book binding thingies (Google says they're combs?).  But by the time they were done, the first edition of Dark Corner USA had been printed.</p>
        <p>
          The original digital copies of the book were lost to a house fire in 2015.  My wife, Sadie Mcwilliams, re-typed the book over the next several months to ensure we weren't reliant on the physical copies for preservation.  We now have two boys, so I've transcribed her re-typing of Willis's book into a website to better ensure its longevity.
        </p>
        <div className="about-rule" />
        <p className="mono about-meta">
          Stories by Willis Moody McWilliams.<br />
          Photos & Art by John Moody McWilliams.<br />
          Website by Jerreck Moody McWilliams.<br />
          Edited by Sadie McWilliams.
        </p>
        <div className="about-actions">
          <button className="btn btn-primary" onClick={() => goto("")}>
            <span className="btn-title">Read the stories</span>
          </button>
        </div>
      </div>
      <Colophon />
    </main>
  );
}

/* -------------------- advertising page -------------------- */
function Advertising() {
  return (
    <main className="page about">
      <div className="advert-card">
        <img src="assets/dark-corner-mark.png" alt="" className="about-mark" />
        <div className="mono advert-eyebrow">Advertising Opportunity</div>
        <h1 className="display about-title">Corner Signage</h1>
        <p className="mono about-meta">
          5961 McDuffee Rd &amp; intersection &nbsp;·&nbsp; Kingston, OK 73439<br />
          High-traffic corner &nbsp;·&nbsp; 6 million annual Lake Texoma visitors
        </p>

        <div className="advert-grid">

          <div className="advert-banner-card">
            <p className="mono advert-size-label">Banner Size</p>
            <p className="advert-size">4 ft × 2 ft</p>
            <div className="advert-vis">
              <div className="advert-post" style={{ height: "60px" }} />
              <div className="advert-banner advert-banner--wide">
                <span className="mono">4×2</span>
              </div>
              <div className="advert-post" style={{ height: "60px" }} />
            </div>
            <div className="advert-price-row">
              <span className="advert-term">Monthly</span>
              <span className="advert-val">$75 <span className="advert-per">/mo</span></span>
            </div>
            <div className="advert-price-row">
              <span className="advert-term">Annual <span className="advert-savings">save $100</span></span>
              <span className="advert-val">$800 <span className="advert-per">/yr</span></span>
            </div>
          </div>

          <div className="advert-banner-card advert-banner-card--featured">
            <span className="advert-badge">Best Value</span>
            <p className="mono advert-size-label">Banner Size</p>
            <p className="advert-size">4 ft × 4 ft</p>
            <div className="advert-vis">
              <div className="advert-post" style={{ height: "72px" }} />
              <div className="advert-banner advert-banner--square">
                <span className="mono">4×4</span>
              </div>
              <div className="advert-post" style={{ height: "72px" }} />
            </div>
            <div className="advert-price-row">
              <span className="advert-term">Monthly</span>
              <span className="advert-val">$150 <span className="advert-per">/mo</span></span>
            </div>
            <div className="advert-price-row">
              <span className="advert-term">Annual <span className="advert-savings">save $300</span></span>
              <span className="advert-val">$1,500 <span className="advert-per">/yr</span></span>
            </div>
          </div>

        </div>

        <p className="advert-note mono">
          Banners displayed on t-post frames at a busy four-way intersection of McDuffee Rd and State Park Rd.<br />
          Advertiser supplies banner &nbsp;·&nbsp; Seasonal &amp; short-term rates available<br />
          Content subject to approval
        </p>

        <div className="about-rule" />

        <p className="mono advert-size-label">To reserve your spot</p>
        <dl className="contact-list mono" style={{ marginTop: "12px" }}>
          <div className="contact-row">
            <dt>Phone</dt>
            <dd><a href="tel:+14697441362">(469) 744-1362</a></dd>
          </div>
          <div className="contact-row">
            <dt>Address</dt>
            <dd>5961 McDuffee Rd<br />Kingston, OK 73439</dd>
          </div>
          <div className="contact-row">
            <dt>Email</dt>
            <dd><a href="mailto:jerreck@darkcornerusa.com">jerreck@darkcornerusa.com</a></dd>
          </div>
        </dl>

        <div className="about-actions">
          <a className="btn btn-primary" href="mailto:jerreck@darkcornerusa.com">
            <span className="mono btn-kicker">Get in touch</span>
            <span className="btn-title">Reserve Your Spot</span>
          </a>
        </div>
      </div>
      <Colophon />
    </main>
  );
}

function Colophon() {
  return (
    <footer className="colophon-foot mono">
      <div>Dark Corner USA</div>
      <div>&copy;2026 Jerreck Moody McWilliams</div>
    </footer>
  );
}

/* -------------------- contact page -------------------- */
function Contact() {
  return (
    <main className="page about">
      <div className="about-card contact-card">
        <img src="assets/dark-corner-mark.png" alt="" className="about-mark" />
        <h1 className="display about-title">Contact</h1>
        <p className="mono about-meta">Dark Corner USA</p>
        <dl className="contact-list mono">
          <div className="contact-row">
            <dt>Name</dt>
            <dd>Jerreck McWilliams</dd>
          </div>
          <div className="contact-row">
            <dt>Phone</dt>
            <dd><a href="tel:+14697441362">(469) 744-1362</a></dd>
          </div>
          <div className="contact-row">
            <dt>Address</dt>
            <dd>5961 McDuffee Rd<br />Kingston, OK 73439</dd>
          </div>
          <div className="contact-row">
            <dt>Email</dt>
            <dd><a href="mailto:jerreck@darkcornerusa.com">jerreck@darkcornerusa.com</a></dd>
          </div>
        </dl>
      </div>
      <Colophon />
    </main>
  );
}

/* -------------------- app shell -------------------- */
function App() {
  const route = useHashRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const [state, setState] = useState(loadLS);
  const [progress, setProgress] = useState(null);

  const saved = state.saved || {};
  const lastSlug = state.lastSlug || null;

  const update = useCallback((next) => {
    setState((cur) => {
      const merged = { ...cur, ...(typeof next === 'function' ? next(cur) : next) };
      saveLS(merged);
      return merged;
    });
  }, []);

  const toggleSave = useCallback((slug) => {
    update((cur) => {
      const s = { ...(cur.saved || {}) };
      if (s[slug]) delete s[slug]; else s[slug] = Date.now();
      return { saved: s };
    });
  }, [update]);

  const setLastSlug = useCallback((slug) => {
    update((cur) => cur.lastSlug === slug ? {} : { lastSlug: slug });
  }, [update]);

  // close menu on route change
  useEffect(() => { setMenuOpen(false); }, [route.name, route.slug]);

  // reset progress when leaving a story
  useEffect(() => {
    if (route.name !== "story") setProgress(null);
  }, [route.name]);

  return (
    <>
      <TopBar route={route} onMenu={() => setMenuOpen(true)} progress={route.name === "story" ? (progress || 0) : null} />
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      {route.name === "home" && <Library saved={saved} lastSlug={lastSlug} />}
      {route.name === "story" && (
        <Story
          slug={route.slug}
          saved={saved}
          toggleSave={toggleSave}
          setLastSlug={setLastSlug}
          onProgress={setProgress}
        />
      )}
      {route.name === "bookmarks" && <Bookmarks saved={saved} />}
      {route.name === "about" && <About />}
      {route.name === "contact" && <Contact />}
      {route.name === "advertising" && <Advertising />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
