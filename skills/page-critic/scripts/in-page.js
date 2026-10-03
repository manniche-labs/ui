// Runs inside the page (page.addInitScript + page.evaluate). Collects everything that can be read from the DOM and CSS.
// Every function returns plain data and leaves the page alone, apart from the data-pc attribute on measured elements
// and the two stress tests (lengthen, longWord), which only run on a copy of the page.
window.__pc = (() => {
  // The way up through the page, also out of a shadow root and in through the slot the element is placed in.
  const up = (el) => el.assignedSlot || el.parentElement || el.getRootNode().host;
  // A parent is the containing block for a fixed element when it has a transform or something else that gives it its own layer.
  const containsFixed = (s) => [s.transform, s.perspective, s.filter, s.backdropFilter, s.translate, s.rotate, s.scale].some((v) => v && v !== "none") || /transform|perspective|filter/.test(s.willChange) || /paint|layout|strict|content/.test(s.contain) || (s.containerType || "normal") !== "normal";
  // A dialog opened as a modal, and a popover, sit in the top layer and are not clipped by what they are placed in.
  const inTopLayer = (el) => { try { return el.matches(":modal, :popover-open"); } catch { return false; } };

  // ---------- can it be seen? ----------
  //
  // An element can be seen when it has a box, is not hidden or transparent, and no parent hides it.
  // A parent hides what is inside it when it is transparent or clipped to nothing (clip-path), or when it clips
  // its content (overflow) and has no height or width itself: a closed menu, a collapsed answer, a tooltip waiting to show.
  // What merely sits off screen or is scrolled out of a box still counts as visible, because it can come back.

  // A length from a computed value: px directly, % of the size passed in. Anything else (calc, keywords) is unknown.
  const length = (v, of) => {
    const m = /^(-?\d*\.?\d+(?:e-?\d+)?)(px|%)?$/.exec(v);
    if (!m || (!m[2] && Number(m[1]) !== 0)) return null;
    return m[2] === "%" ? (Number(m[1]) * of) / 100 : Number(m[1]);
  };
  // Is the element clipped to nothing? Only shapes that can be computed are judged: inset, circle, ellipse and polygon in px and %.
  // A shape that cannot be read (calc, path, url) counts as open.
  const clippedAway = (el, s) => {
    if (s.clip && s.clip !== "auto" && (s.position === "absolute" || s.position === "fixed")) {
      const m = /^rect\(([^()]+)\)$/.exec(s.clip), k = m ? m[1].split(/[\s,]+/).filter(Boolean).map(parseFloat) : [];
      if (k.length === 4 && k.every(Number.isFinite) && (k[1] - k[3] < 1 || k[2] - k[0] < 1)) return true;
    }
    const k = s.clipPath;
    if (!k || k === "none" || !(el instanceof HTMLElement) || s.display === "inline" || s.display === "contents") return false;
    const w = el.offsetWidth, h = el.offsetHeight;
    let m = /^inset\(([^()]*?)(?:\s+round\s[^()]*)?\)$/.exec(k);
    if (m) {
      const d = m[1].trim().split(/\s+/);
      if (d.length > 4) return false;
      const [top, right = top, bottom = top, left = right] = d;
      const t = [length(top, h), length(right, w), length(bottom, h), length(left, w)];
      return t.every((x) => x !== null) && (h - t[0] - t[2] < 1 || w - t[1] - t[3] < 1);
    }
    m = /^circle\(\s*(-?\d*\.?\d+)(?:px|%)?(?:\s+at\s[^()]*)?\)$/.exec(k);
    if (m) return Number(m[1]) === 0;
    m = /^ellipse\(\s*(-?\d*\.?\d+)(?:px|%)?\s+(-?\d*\.?\d+)(?:px|%)?(?:\s+at\s[^()]*)?\)$/.exec(k);
    if (m) return Number(m[1]) === 0 || Number(m[2]) === 0;
    m = /^polygon\((?:(?:nonzero|evenodd),\s*)?([^()]*)\)$/.exec(k);
    if (m) {
      const points = m[1].split(",").map((pair) => pair.trim().split(/\s+/));
      if (points.some((pair) => pair.length !== 2)) return false;
      const xy = points.map(([x, y]) => [length(x, w), length(y, h)]);
      if (xy.some(([x, y]) => x === null || y === null)) return false;
      const xs = xy.map((q) => q[0]), ys = xy.map((q) => q[1]);
      return Math.max(...xs) - Math.min(...xs) < 1 || Math.max(...ys) - Math.min(...ys) < 1;
    }
    return false;
  };
  // Does the parent clip its content while having no height or width itself? Only boxes that can clip (not inline text or table rows).
  const NO_CLIP = /^(inline|contents|table-row|table-row-group|table-header-group|table-footer-group|table-column|table-column-group)$/;
  const clipsToNothing = (p, s) => {
    if (!(p instanceof HTMLElement) || NO_CLIP.test(s.display)) return false;
    // Scrolling on body belongs to the viewport when html has none of its own.
    if (p === document.body) { const root = getComputedStyle(document.documentElement); if (root.overflowX === "visible" && root.overflowY === "visible") return false; }
    return (s.overflowX !== "visible" && p.clientWidth <= 1) || (s.overflowY !== "visible" && p.clientHeight <= 1);
  };
  // The answer is remembered per parent while the page stands still (until the code yields), and forgotten when transitions are fast-forwarded.
  let seen = new WeakMap(), seenClearing = false;
  const forgetSeen = () => { seen = new WeakMap(); };
  // Does p, or something above p, hide the child inside p? Opacity and clip-path apply to everything in the parent.
  // An overflow clip only applies to what the parent is the containing block for: a child with position absolute is first clipped by the nearest
  // positioned parent, and one with position fixed only by a parent that contains fixed elements.
  const hiddenBy = (p, pos) => {
    if (!p || p.nodeType !== 1 || p === document.documentElement) return false;
    const n = pos === "fixed" ? 2 : pos === "absolute" ? 1 : 0;
    let cached = seen.get(p);
    if (!cached) {
      seen.set(p, (cached = []));
      if (!seenClearing) { seenClearing = true; queueMicrotask(() => { seenClearing = false; forgetSeen(); }); }
    }
    if (cached[n] !== undefined) return cached[n];
    const s = getComputedStyle(p);
    let answer;
    // A parent without its own box (display: contents) can neither be transparent nor clip.
    if (s.display === "contents") answer = hiddenBy(up(p), pos);
    else if (Number(s.opacity) <= 0.05 || s.contentVisibility === "hidden" || clippedAway(p, s)) answer = true;
    else {
      const contains = n === 2 ? containsFixed(s) : n === 1 ? s.position !== "static" || containsFixed(s) : true;
      answer = (contains && clipsToNothing(p, s)) || (!inTopLayer(p) && hiddenBy(up(p), contains ? s.position : pos));
    }
    return (cached[n] = answer);
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    // What the browser skips (the content of a closed <details>, content-visibility: hidden) still has a box when asked.
    if (el.checkVisibility && !el.checkVisibility()) return false;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || !(Number(s.opacity) > 0.05)) return false;
    // Text that is only there for screen readers (at most one and a half pixels each way and clipped), and what is clipped to nothing.
    if (r.width <= 1.5 && r.height <= 1.5 && (s.overflowX !== "visible" || s.overflowY !== "visible" || s.clip !== "auto" || s.clipPath !== "none")) return false;
    if (clippedAway(el, s)) return false;
    return inTopLayer(el) || !hiddenBy(up(el), s.position);
  };
  // innerText only exists on HTML elements. SVG and MathML only have textContent.
  const visibleText = (e) => (e && (e.innerText ?? e.textContent)) || "";
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim().length > 1).map((n) => n.textContent.trim()).join(" ");

  const label = (el) => {
    let n = el.tagName.toLowerCase();
    if (el.id) n += "#" + el.id;
    const k = [...el.classList].slice(0, 2).join(".");
    if (k) n += "." + k;
    const t = (visibleText(el) || el.value || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return t ? `${n} "${t}"` : n;
  };

  // Colours: rgb() is read directly; anything else (oklch, color-mix, hsl, names) is painted on a canvas and read back.
  let canvas = null;
  const rgba = (v) => {
    if (!v || v === "none") return null;
    const m = v.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[,/\s]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && p.every((x) => !Number.isNaN(x))) return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    try {
      if (!canvas) { const c = document.createElement("canvas"); c.width = c.height = 1; canvas = c.getContext("2d", { willReadFrequently: true }); }
      canvas.clearRect(0, 0, 1, 1);
      canvas.fillStyle = "rgba(0, 0, 0, 0)";
      canvas.fillStyle = v;
      canvas.fillRect(0, 0, 1, 1);
      const d = canvas.getImageData(0, 0, 1, 1).data;
      if (d[3] === 0) return [0, 0, 0, 0];
      // The canvas stores the colour multiplied by the alpha; divide it out again.
      return [d[0], d[1], d[2], Math.round((d[3] / 255) * 100) / 100];
    } catch { return null; }
  };
  const COLOUR = /rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|lch\([^)]*\)|lab\([^)]*\)|color\([^)]*\)|#[0-9a-fA-F]{3,8}\b/g;
  const over = (f, b) => {
    const a = f[3];
    return [f[0] * a + b[0] * (1 - a), f[1] * a + b[1] * (1 - a), f[2] * a + b[2] * (1 - a), 1];
  };
  const luminance = (c) => {
    const k = c.slice(0, 3).map((x) => {
      x /= 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  // Hue (0-360), saturation (0-1) and lightness (0-1).
  const hsl = (c) => {
    const [r, g, b] = c.slice(0, 3).map((x) => x / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (d === 0) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    return [h, s, l];
  };
  // The background behind an element: walk up through the parents and stack the layers on top of each other.
  // Returns null if a layer is an image or a gradient, because then the contrast cannot be computed.
  const background = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== "none") return null;
      const c = rgba(s.backgroundColor);
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] === 1) break;
      }
    }
    let b = [255, 255, 255, 1];
    for (const c of layers.reverse()) b = over(c, b);
    return b;
  };

  const contrast = () => {
    const found = new Map();
    let unknown = 0;
    for (const el of document.body.querySelectorAll("*")) {
      if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH"].includes(el.tagName.toUpperCase())) continue;
      const text = ownText(el);
      if (!text || !visible(el)) continue;
      if (el.matches(":disabled, [aria-disabled=true]")) continue;
      const s = getComputedStyle(el);
      const colour = rgba(s.color);
      const bg = background(el);
      if (!colour || !bg) { unknown++; continue; }
      const f = ratio(over(colour, bg), bg);
      const px = parseFloat(s.fontSize);
      const large = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700);
      const required = large ? 3 : 4.5;
      if (f + 0.005 >= required) continue;
      const key = `${s.color}|${bg.map(Math.round).join(",")}|${large}`;
      const r = found.get(key) || { ratio: Math.round(f * 100) / 100, required, colour: s.color, background: `rgb(${bg.slice(0, 3).map(Math.round).join(", ")})`, fontSize: px, count: 0, example: label(el) };
      r.count++;
      found.set(key, r);
    }
    return { errors: [...found.values()].sort((a, b) => a.ratio - b.ratio), notMeasured: unknown };
  };

  const overflow = () => {
    const w = document.documentElement.clientWidth;
    const wide = document.documentElement.scrollWidth > w + 1;
    const culprits = [];
    if (wide) {
      for (const el of document.body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > w + 1 && culprits.length < 5) culprits.push(`${label(el)} (right edge ${Math.round(r.right)} px)`);
      }
    }
    return { hScroll: wide, width: w, content: document.documentElement.scrollWidth, culprits };
  };

  // Text that gets cut off: by the element's own overflow, by a parent, or by the edge of the screen.
  // Deliberate truncation (ellipsis, line-clamp) and screen-reader-only text do not count. Neither does text in a scroll area:
  // a wide table in a container with overflow auto can be scrolled into view.
  const clipped = () => {
    const out = [];
    const w = document.documentElement.clientWidth;
    const hides = (v) => v === "hidden" || v === "clip";
    const scrolls = (v) => v === "auto" || v === "scroll";
    // The scroll area must itself be inside the screen, or the last of its content cannot be scrolled into view.
    const canScrollIntoView = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (scrolls(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth + 1 && p.getBoundingClientRect().right <= w + 1) return true;
      }
      return false;
    };
    for (const el of document.body.querySelectorAll("*")) {
      if (out.length >= 12) break;
      if (!ownText(el) || !visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue;
      const s = getComputedStyle(el);
      const deliberate = s.textOverflow === "ellipsis" || (s.webkitLineClamp && s.webkitLineClamp !== "none");
      if (deliberate) continue;
      let why = null;
      if (hides(s.overflowX) && el.scrollWidth > el.clientWidth + 1) why = `own width: ${el.scrollWidth} px of text in ${el.clientWidth} px`;
      else if (hides(s.overflowY) && el.scrollHeight > el.clientHeight + 2) why = `own height: ${el.scrollHeight} px of text in ${el.clientHeight} px`;
      else if (r.right > w + 1 && r.left < w && document.documentElement.scrollWidth <= w + 1 && !canScrollIntoView(el)) why = `screen edge: right edge at ${Math.round(r.right)} px on a ${w} px wide screen`;
      else {
        // If a scroll area sits between the text and the parent that hides, what sticks out can be scrolled into view.
        let scrollX = false, scrollY = false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const ps = getComputedStyle(p);
          scrollX = scrollX || (scrolls(ps.overflowX) && p.scrollWidth > p.clientWidth + 1);
          scrollY = scrollY || (scrolls(ps.overflowY) && p.scrollHeight > p.clientHeight + 1);
          if (!hides(ps.overflowX) && !hides(ps.overflowY)) continue;
          const pr = p.getBoundingClientRect();
          if (pr.width <= 2 || pr.height <= 2) { why = null; break; }
          if ((hides(ps.overflowX) && !scrollX && (r.right > pr.right + 1.5 || r.left < pr.left - 1.5)) || (hides(ps.overflowY) && !scrollY && r.bottom > pr.bottom + 1.5)) why = `the parent ${label(p).split(" ")[0]} hides what sticks out`;
          break;
        }
      }
      if (why) out.push({ element: label(el), why });
    }
    return out;
  };

  const CLICKABLE = "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [tabindex]:not([tabindex='-1'])";

  // A tap can hit what has a size and is not taken out of play. Opacity does not count: an invisible field still takes taps.
  const hittable = (el) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width >= 1 && r.height >= 1 && s.visibility !== "hidden" && s.pointerEvents !== "none";
  };
  const shortest = (el) => { const r = el.getBoundingClientRect(); return Math.min(r.width, r.height); };

  const targets = () => {
    const out = [];
    for (const el of document.querySelectorAll(CLICKABLE)) {
      // What is disabled (inert) cannot be tapped and is not a tap target.
      if (el.closest("[inert]")) continue;
      // A checkbox and a radio button can also be hit through their label, so the surface that is easiest to hit is measured.
      // That also applies when the field itself is made invisible and drawn by a track or a box next to it.
      const surfaces = el.matches("input[type=checkbox], input[type=radio]") ? [el, ...el.labels].filter((x) => (x === el ? hittable(x) : visible(x))) : [el];
      if (!surfaces.some(visible)) continue;
      const surface = surfaces.sort((a, b) => shortest(b) - shortest(a))[0];
      const r = surface.getBoundingClientRect();
      // Links in the middle of a sentence are exempt in WCAG 2.5.8 and do not count.
      const inText = el.tagName === "A" && getComputedStyle(el).display === "inline" && el.parentElement && visibleText(el.parentElement).trim().length > visibleText(el).trim().length + 20;
      if (inText) continue;
      if (r.height >= 43.5 && r.width >= 43.5) continue;
      // Buttons and fields must be 44 px. A link counts as a button when it looks like one: its own background or border.
      const s = getComputedStyle(el);
      const looksLikeButton = el.tagName === "A" && s.display !== "inline" && ((rgba(s.backgroundColor) || [0, 0, 0, 0])[3] > 0 || parseFloat(s.borderTopWidth) > 0);
      const control = el.matches("button, input, select, textarea, summary, [role=button]") || looksLikeButton;
      out.push({ element: label(surface), width: Math.round(r.width), height: Math.round(r.height), under24: r.height < 24 || r.width < 24, control, ...(surface === el ? {} : { field: label(el) }) });
    }
    return out;
  };

  const FIELD = "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), select, textarea";
  const fields = () => {
    const out = [];
    for (const el of document.querySelectorAll(FIELD)) {
      if (!visible(el)) continue;
      const s = getComputedStyle(el);
      const hasLabel = !!(el.labels && el.labels.length) || el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby");
      const ac = el.getAttribute("autocomplete");
      const shouldHaveAutocomplete = ["email", "tel", "password"].includes(el.type) || /(^|[_-])(name|navn|fornavn|efternavn|first|last|mail|email|tel|telefon|phone|adresse|address|postnr|postcode|zip|by|city)([_-]|$)/i.test(el.name || "");
      out.push({
        element: label(el), type: el.type || el.tagName.toLowerCase(), name: el.name || null,
        fontSize: parseFloat(s.fontSize), height: Math.round(el.getBoundingClientRect().height),
        label: hasLabel, autocomplete: ac, autocompleteMissing: shouldHaveAutocomplete && !ac, inputmode: el.getAttribute("inputmode"),
        required: el.required, ariaInvalid: el.getAttribute("aria-invalid"), ariaDescribedby: el.getAttribute("aria-describedby"),
        pasteBlocked: el.hasAttribute("onpaste"),
        value: el.type === "password" ? "(hidden)" : (el.value || "").slice(0, 60),
      });
    }
    return out;
  };

  // After a submit that gave an error: was the user told (also with a screen reader), and is what they typed kept?
  const form = (filled, titleBefore) => {
    const all = [...document.querySelectorAll(FIELD)].filter(visible);
    const invalid = all.filter((f) => f.getAttribute("aria-invalid") === "true");
    const live = [...document.querySelectorAll("[role=alert], [role=status], [aria-live]:not([aria-live=off])")].filter((e) => visible(e) && visibleText(e).trim());
    const active = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    const pointsTo = (f) => `${f.getAttribute("aria-describedby") || ""} ${f.getAttribute("aria-errormessage") || ""}`.split(/\s+/).filter(Boolean).some((id) => {
      const e = document.getElementById(id);
      return e && visible(e) && visibleText(e).trim();
    });
    const linked = invalid.filter(pointsTo);
    const focusOnError = !!active && (invalid.includes(active) || live.some((l) => l === active || l.contains(active) || active.contains(l)));
    const values = (filled || []).map(([sel, value]) => {
      let el = null;
      try { el = document.querySelector(sel); } catch {}
      return { selector: sel, kept: !el ? false : el.type === "password" ? null : el.value === value };
    });
    return {
      invalidFields: invalid.map(label), withDescription: linked.length, liveRegions: live.map(label),
      focus: active ? label(active) : null, focusOnError,
      title: document.title, titleChanged: document.title !== titleBefore, values,
      gaps: {
        errorNotAnnounced: !(focusOnError || live.length > 0),
        fieldNotMarked: invalid.length === 0 || linked.length < invalid.length,
        valueLost: values.some((x) => x.kept === false),
      },
    };
  };

  const structure = () => {
    const h = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible).map((e) => ({ level: Number(e.tagName[1]), text: visibleText(e).trim().slice(0, 60) }));
    const skips = [];
    for (let i = 1; i < h.length; i++) if (h[i].level > h[i - 1].level + 1) skips.push(`h${h[i - 1].level} → h${h[i].level} at "${h[i].text}"`);
    const vp = (document.querySelector("meta[name=viewport]") || {}).content || "";
    const max = vp.match(/maximum-scale\s*=\s*([\d.]+)/i);
    return {
      title: document.title, lang: document.documentElement.lang || null,
      h1: h.filter((x) => x.level === 1).map((x) => x.text), headings: h.length, levelSkips: skips,
      landmarks: { main: document.querySelectorAll("main, [role=main]").length, nav: document.querySelectorAll("nav").length },
      live: [...document.querySelectorAll("[role=status],[role=alert],[aria-live]")].filter(visible).map(label),
      imagesWithoutSize: [...document.images].filter((i) => visible(i) && !(i.hasAttribute("width") && i.hasAttribute("height"))).map(label),
      imagesWithoutAlt: [...document.images].filter((i) => visible(i) && !i.hasAttribute("alt")).map(label),
      brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.getAttribute("src"))).map((i) => (i.currentSrc || i.getAttribute("src")).slice(0, 120)),
      viewport: vp || null,
      zoomDisabled: /user-scalable\s*=\s*(no|0)/i.test(vp) || (!!max && Number(max[1]) < 2),
    };
  };

  // The distance between two lines in a text, measured on the rendered lines (also when line-height is "normal").
  const lineGap = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const tops = [...new Set([...r.getClientRects()].map((x) => Math.round(x.top)))].sort((a, b) => a - b);
    if (tops.length < 3) return null;
    const jumps = [];
    for (let i = 1; i < tops.length; i++) if (tops[i] - tops[i - 1] > 4) jumps.push(tops[i] - tops[i - 1]);
    if (!jumps.length) return null;
    jumps.sort((a, b) => a - b);
    return jumps[Math.floor(jumps.length / 2)];
  };

  const typography = () => {
    const text = visibleText(document.body);
    const count = (re) => (text.match(re) || []).length;
    const headings = [...document.querySelectorAll("h1,h2,h3")].filter(visible);
    const widths = [...document.querySelectorAll("p, li")].filter((e) => visible(e) && visibleText(e).length > 160).map((e) => {
      const s = getComputedStyle(e);
      return Math.round(e.getBoundingClientRect().width / (parseFloat(s.fontSize) * 0.5));
    });
    const fonts = new Set(), sizes = new Set(), weights = new Set();
    const small = new Map();
    for (const el of document.body.querySelectorAll("*")) {
      if (!visible(el) || !ownText(el)) continue;
      const s = getComputedStyle(el);
      const px = parseFloat(s.fontSize);
      fonts.add(s.fontFamily.split(",")[0].replace(/["']/g, "").trim());
      sizes.add(px);
      weights.add(Number(s.fontWeight));
      // Text in decoration hidden from screen readers (aria-hidden) is not meant to be read.
      if (px < 12 && !el.closest('[aria-hidden="true"]')) {
        const r = small.get(px) || { px, count: 0, example: label(el) };
        r.count++;
        small.set(px, r);
      }
    }
    const tight = [];
    for (const el of document.querySelectorAll("p, li, dd, blockquote")) {
      if (tight.length >= 8) break;
      if (!visible(el) || visibleText(el).trim().length < 80) continue;
      const px = parseFloat(getComputedStyle(el).fontSize), gap = lineGap(el);
      if (gap && gap / px < 1.3) tight.push({ element: label(el), ratio: Math.round((gap / px) * 100) / 100, fontSize: px });
    }
    const numberCells = [...document.querySelectorAll("td")].filter((c) => visible(c) && /^[\s\d.,:%+\-−–krKR€$£]+$/.test(visibleText(c)) && /\d/.test(visibleText(c)));
    return {
      straightQuotes: count(/"[^"\n]{2,60}"/g), threeDots: count(/\.\.\./g),
      headingsWithoutBalance: headings.filter((e) => !["balance", "pretty"].includes(getComputedStyle(e).textWrap || getComputedStyle(e).textWrapStyle)).length,
      headings: headings.length,
      longestLineChars: widths.length ? Math.max(...widths) : null,
      fonts: [...fonts], fontSizes: [...sizes].sort((a, b) => a - b), weights: [...weights].sort((a, b) => a - b),
      textUnder12px: [...small.values()].sort((a, b) => a.px - b.px),
      tightLineHeight: tight,
      numbersWithoutTabular: numberCells.filter((c) => !/tabular-nums/.test(getComputedStyle(c).fontVariantNumeric)).length,
    };
  };

  // Alignment: what the eye sees as "almost right". Everything here is a hint for the review and must be checked in the screenshot.
  const alignment = () => {
    const out = { cardsUnevenHeight: [], fieldAndButtonUneven: [], nearlyAligned: [], innerRadiusTooLarge: [] };
    const box = (el) => el.getBoundingClientRect();
    const isSurface = (el, s, r) => r.width > 120 && r.height > 60 && ((rgba(s.backgroundColor) || [0, 0, 0, 0])[3] > 0 || parseFloat(s.borderTopWidth) > 0 || s.boxShadow !== "none");

    // Cards in the same row with different heights or almost the same top.
    for (const p of document.body.querySelectorAll("*")) {
      if (out.cardsUnevenHeight.length >= 6) break;
      const ps = getComputedStyle(p);
      if (!/flex|grid/.test(ps.display) || p.children.length < 2) continue;
      const cards = [...p.children].filter((c) => visible(c)).map((c) => ({ el: c, r: box(c), s: getComputedStyle(c) })).filter((k) => isSurface(k.el, k.s, k.r));
      // A card that deliberately spans several rows in a grid should be taller than its neighbour. That shows as "span" in grid-row,
      // or as the card being taller than the grid's tallest row (the browser returns the row heights in px).
      const tracks = /grid/.test(ps.display) ? (ps.gridTemplateRows.match(/[\d.]+(?=px)/g) || []).map(Number) : [];
      const tallestTrack = tracks.length > 1 ? Math.max(...tracks) : 0;
      const spansRows = (k) => /span\s+(?!1\b)\d/.test(`${k.s.gridRowStart} ${k.s.gridRowEnd}`) || (tallestTrack > 0 && k.r.height > tallestTrack + 1);
      for (let i = 0; i < cards.length - 1; i++) {
        const a = cards[i], b = cards[i + 1];
        if (spansRows(a) || spansRows(b)) continue;
        const sameRow = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top) > Math.min(a.r.height, b.r.height) * 0.5 && b.r.left >= a.r.right - 1;
        if (!sameRow) continue;
        const top = Math.abs(a.r.top - b.r.top), height = Math.abs(a.r.height - b.r.height);
        if (top >= 1.5 && top <= 8) out.cardsUnevenHeight.push(`${label(a.el).split(" ")[0]} and ${label(b.el).split(" ")[0]}: the tops are ${Math.round(top * 10) / 10} px apart`);
        else if (top < 1.5 && height > 2) out.cardsUnevenHeight.push(`${label(a.el).split(" ")[0]} and its neighbour in the same row: ${Math.round(a.r.height)} px against ${Math.round(b.r.height)} px tall`);
        if (out.cardsUnevenHeight.length >= 6) break;
      }
    }

    // A field and a button side by side with slightly different heights.
    const buttons = [...document.querySelectorAll("button, input[type=submit], input[type=button], [role=button], a[class*=btn], a[class*=button]")].filter(visible);
    for (const f of [...document.querySelectorAll(FIELD)].filter(visible)) {
      const fr = box(f);
      for (const k of buttons) {
        const kr = box(k);
        const vertical = Math.min(fr.bottom, kr.bottom) - Math.max(fr.top, kr.top);
        const gap = Math.max(kr.left - fr.right, fr.left - kr.right);
        const diff = Math.abs(fr.height - kr.height);
        if (vertical > Math.min(fr.height, kr.height) * 0.5 && gap >= -1 && gap < 40 && diff >= 1.5 && diff <= 12) {
          out.fieldAndButtonUneven.push(`${label(f).split(" ")[0]} is ${Math.round(fr.height)} px tall, ${label(k)} is ${Math.round(kr.height)} px`);
        }
      }
    }

    // Left edges 2 to 6 px apart and close together vertically: "almost lined up".
    const blocks = [...document.querySelectorAll("h1,h2,h3,h4,p,ul,ol,dl,form,table,fieldset,label,input,select,textarea,button,img,figure,blockquote,pre")].filter(visible).map((el) => ({ el, r: box(el), s: getComputedStyle(el) })).filter((x) => x.r.width >= 60 && !/center|right|end/.test(x.s.textAlign) && x.s.position !== "absolute" && x.s.position !== "fixed");
    const found = new Set();
    for (let i = 0; i < blocks.length && out.nearlyAligned.length < 8; i++) {
      for (let j = i + 1; j < blocks.length && out.nearlyAligned.length < 8; j++) {
        const a = blocks[i], b = blocks[j];
        const d = Math.abs(a.r.left - b.r.left);
        if (d < 2 || d > 6) continue;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const vertical = Math.max(a.r.top, b.r.top) - Math.min(a.r.bottom, b.r.bottom);
        if (vertical > 240) continue;
        // Two elements side by side in the same row have no shared left edge to line up on.
        if (Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top) > 4) continue;
        const key = `${Math.round(Math.min(a.r.left, b.r.left))}|${Math.round(d * 2) / 2}`;
        if (found.has(key)) continue;
        found.add(key);
        out.nearlyAligned.push(`${label(a.el)} (left ${Math.round(a.r.left * 10) / 10} px) and ${label(b.el)} (${Math.round(b.r.left * 10) / 10} px): ${Math.round(d * 10) / 10} px apart`);
      }
    }

    // Inner corners must be smaller than outer ones: outer radius = inner radius + the gap between them.
    // The rule only applies when there is less space than the frame's radius. With more space the inner corner is free, as long as it is not rounder than the frame's.
    const radius = (s, r) => Math.min(parseFloat(s.borderTopLeftRadius) || 0, r.width / 2, r.height / 2);
    for (const el of document.body.querySelectorAll("*")) {
      if (out.innerRadiusTooLarge.length >= 6) break;
      if (!visible(el)) continue;
      const s = getComputedStyle(el), r = box(el);
      const outer = radius(s, r);
      if (outer < 4 || r.width < 60 || r.height < 40) continue;
      for (const b of el.children) {
        if (!visible(b)) continue;
        const bs = getComputedStyle(b), br = box(b);
        const inner = radius(bs, br);
        if (inner < 4 || inner >= br.height / 2 - 0.5) continue; // pills and circles are something else
        const space = Math.min(br.left - r.left, br.top - r.top);
        if (space < 0 || space > 16) continue;
        const right = outer - space;
        if (inner > outer + 0.5 || (space >= 4 && right > 0 && inner > right + 2)) {
          out.innerRadiusTooLarge.push(`${label(b).split(" ")[0]} has radius ${Math.round(inner)} px inside ${label(el).split(" ")[0]} with radius ${Math.round(outer)} px and ${Math.round(space)} px of space: ${right > 0 ? `inner should be at most ${Math.round(right)} px` : "inner should not be rounder than the frame"}`);
          break;
        }
      }
    }
    out.fieldAndButtonUneven = [...new Set(out.fieldAndButtonUneven)].slice(0, 6);
    return out;
  };

  // How many different values does the page use? A few clearly different steps are a system; many almost equal ones are accidents.
  const system = () => {
    const counter = () => new Map();
    const plus = (m, k) => m.set(k, (m.get(k) || 0) + 1);
    const spacings = counter(), radii = counter(), shadows = counter(), textColours = counter(), surfaces = counter();
    for (const el of document.body.querySelectorAll("*")) {
      if (!visible(el)) continue;
      const s = getComputedStyle(el);
      for (const k of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginBottom", "rowGap", "columnGap"]) {
        const v = parseFloat(s[k]);
        if (v > 0) plus(spacings, Math.round(v * 2) / 2);
      }
      const r = parseFloat(s.borderTopLeftRadius);
      const b = el.getBoundingClientRect();
      if (r > 0) plus(radii, r >= Math.min(b.width, b.height) / 2 - 0.5 ? "pill/circle" : `${Math.round(r * 2) / 2} px`);
      if (s.boxShadow !== "none") plus(shadows, s.boxShadow);
      if (ownText(el)) plus(textColours, s.color);
      const bg = rgba(s.backgroundColor);
      if (bg && bg[3] > 0) plus(surfaces, s.backgroundColor);
    }
    const list = (m, n = 12) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));
    const all = [...spacings.entries()];
    const total = all.reduce((n, [, a]) => n + a, 0);
    // Whole numbers from 4 px up that are not divisible by 4. Fractions come from em, rem and clamp and are counted separately.
    const odd = all.filter(([v]) => Number.isInteger(v) && v >= 4 && v % 4 !== 0);
    const fractions = all.filter(([v]) => !Number.isInteger(v));
    return {
      spacings: {
        distinct: all.length, values: all.map(([v]) => v).sort((a, b) => a - b),
        offGrid4: odd.sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count })),
        shareOffGrid4: total ? Math.round((odd.reduce((n, [, a]) => n + a, 0) / total) * 100) : 0,
        fractions: fractions.length,
      },
      radii: list(radii), shadows: list(shadows, 8), textColours: list(textColours), surfaceColours: list(surfaces),
    };
  };

  // Reads every stylesheet and finds what moves, and how.
  const LAYOUT = /^(width|height|top|left|right|bottom|margin|padding|inset|font-size|line-height|border-width|max-height|max-width|min-height|grid|flex-basis)/;
  const bounces = (curve) => {
    const m = curve.match(/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
    if (m) return Number(m[2]) > 1.2 || Number(m[4]) > 1.2 || Number(m[2]) < -0.2 || Number(m[4]) < -0.2;
    const l = curve.match(/linear\(([^)]+)\)/);
    if (l) return l[1].split(",").map((x) => parseFloat(x)).some((x) => x > 1.1);
    return false;
  };
  // Strips pseudo-classes and pseudo-elements off a selector so it can be looked up in the page. What is inside [ ] or after a
  // backslash (Tailwind's "hover\:...") is left alone. A pseudo-class standing on its own becomes "*".
  const strip = (v) => {
    let out = "";
    for (let i = 0; i < v.length; ) {
      const c = v[i];
      if (c === "\\") { out += v.slice(i, i + 2); i += 2; }
      else if (c === "[") {
        let j = i + 1, quote = "";
        for (; j < v.length && (quote || v[j] !== "]"); j++) {
          if (v[j] === "\\") j++;
          else if (quote) { if (v[j] === quote) quote = ""; }
          else if (v[j] === '"' || v[j] === "'") quote = v[j];
        }
        out += v.slice(i, j + 1); i = j + 1;
      } else if (c === ":") {
        i += v[i + 1] === ":" ? 2 : 1;
        while (i < v.length && /[\w-]/.test(v[i])) i++;
        if (v[i] === "(") { let depth = 0; do { if (v[i] === "(") depth++; else if (v[i] === ")") depth--; i++; } while (i < v.length && depth > 0); }
        if (!out || /[\s>+~,]$/.test(out)) out += "*";
      } else { out += c; i++; }
    }
    return out.trim() || "*";
  };
  // First element the selector hits: null when there is none, and undefined when the selector cannot be looked up.
  const first = (v) => { try { return document.querySelector(strip(v)); } catch { return undefined; } };
  const HOVER = /(?<!\\):hover/;

  const motion = () => {
    const out = { transitions: 0, transitionAll: [], layoutProperties: [], overThreeHundred: [], linear: [], disabled: [], keyframes: 0, keyframesWithLayout: [], reducedMotionRules: 0, darkModeRules: 0, focusVisibleRules: 0, hoverRules: 0, hoverWithoutMedia: [], hoverTargets: [], activeRules: 0, durations: [], curves: [], bouncyCurves: [], scrollDriven: 0, viewTransitions: 0, startingStyle: 0, unreadableSheets: 0 };
    // Only rules that hit an element on this page count. A selector that cannot be looked up counts, to be safe.
    const used = (v) => first(v) !== null;
    const sec = (t) => (t.endsWith("ms") ? parseFloat(t) / 1000 : parseFloat(t));
    const durations = new Set(), curves = new Set();
    // A transition can be switched off by another rule (transition: none) or have been given another duration on everything the rule
    // hits. Then it moves nothing. That can only be decided for a selector without states: what it hits now, it always hits.
    // A ::before or ::after at the end of the selector is not a state.
    const stateless = (v) => {
      const plain = v.replace(/\\./g, "").replace(/\[[^\]]*\]/g, "");
      return !(plain.includes(",") ? plain : plain.replace(/::?(before|after)\s*$/, "")).includes(":");
    };
    const takesEffect = (v, pseudo, longest) => {
      let all;
      try { all = document.querySelectorAll(strip(v)); } catch { return true; }
      // If the selector hits more than are looked at, the rule counts, to be safe.
      if (all.length > 200) return true;
      for (const el of all) {
        if (getComputedStyle(el, pseudo ? `::${pseudo}` : null).transitionDuration.split(",").some((x) => Math.abs(sec(x.trim()) - longest) < 0.0015)) return true;
      }
      return false;
    };
    const matches = (m) => { try { return matchMedia(m).matches; } catch { return false; } };
    // When a transition or animation contains var(), the rule has no longhands to read. The variables are looked up on the element
    // the rule hits, and the lines are read again on a loose element.
    // When the shorthand with var() sits together with one of its own longhands (e.g. transition-delay on its own), the browser returns
    // the other longhands as empty. They are read on the element as it ends up.
    const probe = document.createElement("i"), EMPTY = /:\s*$/;
    const unfolded = (r, el) => {
      const lines = (r.style.cssText.match(/(?:^|;\s*)(?:transition|animation)[-a-z]*\s*:[^;]*/g) || []).map((l) => l.replace(/^;\s*/, ""));
      const empty = lines.filter((l) => EMPTY.test(l)).map((l) => l.split(":")[0].trim());
      if (!empty.length && !lines.some((l) => l.includes("var("))) return r.style;
      const cs = getComputedStyle(el || document.documentElement);
      let text = lines.filter((l) => !EMPTY.test(l)).join("; ");
      for (let n = 0; n < 3 && text.includes("var("); n++) {
        text = text.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*(?:\([^()]*\)[^()]*)*))?\)/g, (_, variable, fallback) => cs.getPropertyValue(variable).trim() || (fallback || "").trim());
      }
      probe.style.cssText = text;
      if (el && empty.length) {
        const pseudo = ((r.selectorText || "").match(/::?(before|after)\s*$/) || [])[1];
        const on = pseudo ? getComputedStyle(el, `::${pseudo}`) : cs;
        for (const p of empty) probe.style.setProperty(p, on.getPropertyValue(p));
      }
      return probe.style;
    };
    // applies: the rule is not inside something that can switch it off right now (an @media that does not match, or a wrapper that cannot be decided here).
    const walk = (rules, inHover, applies) => {
      for (const r of rules) {
        const kind = r.constructor ? r.constructor.name : "";
        if (r.type === CSSRule.MEDIA_RULE) {
          const m = r.conditionText || r.media.mediaText;
          if (/prefers-reduced-motion/.test(m)) out.reducedMotionRules += r.cssRules.length;
          if (/prefers-color-scheme:\s*dark/.test(m)) out.darkModeRules += r.cssRules.length;
          walk(r.cssRules, inHover || /\((any-)?hover\s*:\s*hover\)/.test(m), applies && matches(m));
        } else if (r.type === CSSRule.KEYFRAMES_RULE) {
          out.keyframes++;
          const props = new Set();
          for (const k of r.cssRules) for (const p of k.style) props.add(p);
          const bad = [...props].filter((p) => LAYOUT.test(p));
          if (bad.length) out.keyframesWithLayout.push(`@keyframes ${r.name}: ${bad.join(", ")}`);
          if (/bounce|wobble|jello|rubber|tada|shake|wiggle/i.test(r.name)) out.bouncyCurves.push(`@keyframes ${r.name}`);
        } else if (kind === "CSSStartingStyleRule") {
          out.startingStyle++;
        } else if (kind === "CSSViewTransitionRule") {
          out.viewTransitions++;
        } else if (r.cssRules && r.cssRules.length && !r.style) {
          // A layer (@layer) does not change what the rules hit. Whether @supports, @container and @scope apply is not decided here.
          walk(r.cssRules, inHover, applies && kind === "CSSLayerBlockRule");
        } else if (r.style) {
          const v = r.selectorText || "";
          if (/:focus-visible/.test(v)) out.focusVisibleRules++;
          if (HOVER.test(v)) {
            out.hoverRules++;
            // On a touch screen hover sticks after a tap. That hurts most when the rule moves or scales something.
            const moves = [...r.style].some((p) => /^(transform|translate|scale|rotate|top|left|right|bottom|inset|margin|width|height)/.test(p) && r.style.getPropertyValue(p) !== "none");
            if (!inHover && moves && used(v)) out.hoverWithoutMedia.push(v);
            for (const part of v.split(",")) {
              const base = part.split(HOVER)[0].trim();
              if (HOVER.test(part) && base && used(base)) out.hoverTargets.push(base);
            }
          }
          if (/:active/.test(v)) out.activeRules++;
          const el = first(v), isUsed = el !== null;
          const s = unfolded(r, el);
          if (s.animationTimeline && s.animationTimeline !== "auto") out.scrollDriven++;
          if (r.style.viewTransitionName && r.style.viewTransitionName !== "none") out.viewTransitions++;
          const tp = s.transitionProperty, td = s.transitionDuration;
          // A transition that applies to none of what the rule hits is switched off. Then neither its duration, properties nor curve count.
          let off = false;
          if ((tp || td) && isUsed) {
            const pseudo = (v.match(/::?(before|after)\s*$/) || [])[1];
            const times = (td || "0s").split(",").map((x) => sec(x.trim()));
            const longest = Math.max(...times);
            off = longest > 0 && applies && stateless(v) && !takesEffect(v, pseudo, longest);
            if (off) out.disabled.push(v);
            else {
              out.transitions++;
              // A rule that only sets the duration uses the properties the element's other rules have named.
              const props = (tp || (el ? getComputedStyle(el, pseudo ? `::${pseudo}` : null).transitionProperty : "")).split(",").map((x) => x.trim()).filter(Boolean);
              for (const t of times) if (t > 0) durations.add(Math.round(t * 1000));
              if (props.includes("all")) out.transitionAll.push(v);
              const lay = props.filter((p) => LAYOUT.test(p));
              if (lay.length) out.layoutProperties.push(`${v}: ${lay.join(", ")}`);
              if (longest > 0.3) out.overThreeHundred.push(`${v}: ${Math.round(longest * 1000)} ms`);
              if ((s.transitionTimingFunction || "").split(/,(?![^(]*\))/).some((x) => x.trim() === "linear")) out.linear.push(v);
            }
          }
          if (isUsed) {
            for (const k of [off ? "" : s.transitionTimingFunction, s.animationTimingFunction]) {
              if (!k) continue;
              for (const one of k.split(/,(?![^(]*\))/).map((x) => x.trim()).filter(Boolean)) {
                // A variable that could not be looked up is not a curve.
                if (one.includes("var(")) continue;
                curves.add(one);
                if (bounces(one)) out.bouncyCurves.push(`${v}: ${one}`);
              }
            }
            const ad = s.animationDuration;
            if (ad) for (const t of ad.split(",")) if (sec(t.trim()) > 0) durations.add(Math.round(sec(t.trim()) * 1000));
          }
          if (r.cssRules && r.cssRules.length) walk(r.cssRules, inHover, false);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules, false, !sheet.disabled && (!sheet.media.mediaText || matches(sheet.media.mediaText))); } catch { out.unreadableSheets++; }
    }
    for (const k of ["transitionAll", "layoutProperties", "overThreeHundred", "linear", "disabled", "hoverWithoutMedia", "hoverTargets", "bouncyCurves"]) out[k] = [...new Set(out[k])].slice(0, 20);
    out.durations = [...durations].sort((a, b) => a - b);
    out.curves = [...curves];
    return out;
  };

  // What an animation touches. Moving and scaling is what "reduce motion" should remove; a short fade or a colour change is fine.
  const MOVES = /^(transform|translate|scale|rotate|offset|top|left|right|bottom|inset|margin|width|height|max-|min-|background-position|clip-path|perspective|zoom|font-size)/;
  const describe = (a) => {
    const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {};
    let props = [];
    try {
      // Only properties that actually change value along the way. "background: red" in a keyframe also names background-position, without anything moving.
      const frames = a.effect.getKeyframes(), values = new Map();
      for (const k of frames) for (const [p, v] of Object.entries(k)) {
        if (["offset", "computedOffset", "easing", "composite"].includes(p)) continue;
        if (!values.has(p)) values.set(p, []);
        values.get(p).push(String(v));
      }
      props = [...values.entries()].filter(([, v]) => new Set(v).size > 1 || v.length < frames.length || frames.length < 2).map(([p]) => p.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()));
    } catch {}
    const target = a.effect && a.effect.target ? a.effect.target : null;
    return {
      name: a.animationName || a.transitionProperty || "(no name)", duration: typeof t.duration === "number" ? Math.round(t.duration) : null,
      infinite: t.iterations === Infinity, element: target ? label(target) : null, properties: props, moves: props.some((p) => MOVES.test(p)),
      // If the whole run is shorter than one frame on screen (17 ms), nobody gets to see anything move. That is how many sites switch their animations off: 0.01 ms and one iteration.
      instant: typeof t.activeDuration === "number" && t.activeDuration < 17,
    };
  };
  const running = () => document.getAnimations().filter((a) => a.playState === "running").map(describe);

  // Records every animation that runs while recording: first the three seconds after load (entrances),
  // and again when the measurement asks for it (e.g. while it scrolls through the page), so short animations are seen too.
  const log = new Map();
  const note = () => {
    try {
      for (const a of document.getAnimations()) {
        if (a.playState !== "running") continue;
        const b = describe(a);
        log.set(`${b.name}|${b.element}`, b);
      }
    } catch {}
  };
  const record = (ms = 3000) => {
    log.clear();
    const timer = setInterval(note, 40);
    setTimeout(() => clearInterval(timer), ms);
  };
  const recorded = () => { note(); return [...log.values()]; };
  record(3000);

  // Animations running nonstop on something that cannot be seen.
  const offscreen = () => {
    const out = [];
    for (const a of document.getAnimations()) {
      if (a.playState !== "running") continue;
      const b = describe(a);
      const el = a.effect && a.effect.target;
      if (!b.infinite || !el) continue;
      const r = el.getBoundingClientRect();
      const outside = r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth;
      if (outside || !visible(el)) out.push(`${b.name} on ${b.element}`);
    }
    return [...new Set(out)].slice(0, 10);
  };

  // Elements that fade in and slide into place: either with the same keyframes, or by waiting invisible and offset to be scrolled into view.
  // Must run before the page is scrolled through, because afterwards they are already in place.
  const entrances = () => {
    // Which properties does each set of keyframes touch? Read from the stylesheets, because a finished entrance no longer exists as an animation.
    const keys = new Map();
    const scan = (rules) => {
      for (const r of rules) {
        if (r.type === CSSRule.KEYFRAMES_RULE) {
          const p = new Set();
          for (const k of r.cssRules) for (const e of k.style) p.add(e);
          keys.set(r.name, p);
        } else if (r.cssRules && r.cssRules.length) scan(r.cssRules);
      }
    };
    for (const sheet of document.styleSheets) { try { scan(sheet.cssRules); } catch {} }
    const groups = new Map();
    const plus = (k, e) => groups.set(k, [...(groups.get(k) || []), label(e).split(" ")[0]]);
    for (const e of document.body.querySelectorAll("*")) {
      const s = getComputedStyle(e);
      const attr = e.getAttribute("data-aos") || e.getAttribute("data-animate") || e.getAttribute("data-reveal");
      if (s.animationName && s.animationName !== "none") {
        const names = s.animationName.split(",").map((x) => x.trim());
        const counts = s.animationIterationCount.split(",").map((x) => x.trim());
        names.forEach((n, i) => {
          const p = keys.get(n);
          if (!p || counts[i % counts.length] === "infinite") return;
          if (p.has("opacity") && [...p].some((x) => /^(transform|translate|scale)$/.test(x))) plus(`@keyframes ${n}`, e);
        });
      } else if (attr !== null) plus(`[data-aos/animate/reveal="${attr}"]`, e);
      else if (Number(s.opacity) === 0 && (s.transform !== "none" || (s.translate && s.translate !== "none")) && /opacity|all/.test(s.transitionProperty) && parseFloat(s.transitionDuration) > 0) plus("invisible and offset, waiting to be scrolled into view", e);
    }
    return [...groups.entries()].map(([key, elements]) => ({ key, elements }));
  };

  // AI look: patterns that make a page look like a thousand others. "clear" are findings; "suspect" is only a reminder to look.
  const aiLook = (entrancesBefore) => {
    const clear = [], suspect = [];
    const report = (list, rule, text, found) => { if (found.length) list.push({ rule, text, count: found.length, examples: [...new Set(found)].slice(0, 3) }); };
    const el = [...document.body.querySelectorAll("*")].filter(visible).map((e) => ({ e, s: getComputedStyle(e), r: e.getBoundingClientRect() }));
    const colours = (v) => (v.match(COLOUR) || []).map(rgba).filter((c) => c && c[3] > 0.2);
    const saturated = (c, min = 0.4) => { const [, s, l] = hsl(c); return s >= min && l > 0.15 && l < 0.9; };

    // The surface behind a text: the background colour, or the first colour in a gradient.
    const surface = (e) => {
      for (let p = e; p; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (/gradient\(/.test(ps.backgroundImage) && (ps.backgroundClip || "") !== "text") return colours(ps.backgroundImage)[0] || null;
        const c = rgba(ps.backgroundColor);
        if (c && c[3] > 0.5) return c;
      }
      return null;
    };

    const gradientText = [], purple = [], glow = [], emoji = [], glass = [], cardInCard = [], border = [], grey = [];
    const isCard = (x) => x.r.width > 120 && x.r.height > 60 && parseFloat(x.s.borderTopLeftRadius) >= 4 && (parseFloat(x.s.borderTopWidth) > 0 || x.s.boxShadow !== "none") && (parseFloat(x.s.paddingTop) >= 8 || parseFloat(x.s.paddingLeft) >= 8);
    const EMOJI = /(\p{Emoji_Presentation}|\p{Extended_Pictographic}️)/u;

    for (const x of el) {
      const { e, s, r } = x;
      const clip = s.backgroundClip || s.webkitBackgroundClip;
      const hasGradient = /gradient\(/.test(s.backgroundImage);
      if (clip === "text" && hasGradient && visibleText(e).trim()) gradientText.push(label(e));
      if (hasGradient && r.width >= 40 && r.height >= 20) {
        const hues = colours(s.backgroundImage).filter((c) => saturated(c, 0.35)).map((c) => hsl(c)[0]);
        const violet = hues.some((h) => h >= 255 && h <= 295);
        const neighbour = hues.some((h) => (h >= 195 && h < 255) || (h > 295 && h <= 345));
        if (violet && neighbour) purple.push(label(e));
      }
      // Glow: a wide, coloured shadow with no direction. A neutral shadow with a direction is depth, not glow.
      for (const source of [s.boxShadow, s.textShadow]) {
        if (!source || source === "none") continue;
        for (const part of source.split(/,(?![^(]*\))/)) {
          const c = colours(part)[0];
          const nums = part.replace(COLOUR, "").match(/-?[\d.]+px/g) || [];
          const [dx, dy, blur] = nums.map(parseFloat);
          if (c && c[3] >= 0.25 && saturated(c) && Math.abs(dx || 0) <= 2 && Math.abs(dy || 0) <= 2 && (blur || 0) >= 12 && !/inset/.test(part)) { glow.push(label(e)); break; }
        }
      }
      const own = ownText(e) || [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("");
      if (own) {
        const onlyEmoji = own.replace(/[\s️‍]/g, "").length <= 4 && EMOJI.test(own) && !/[\p{L}\p{N}]/u.test(own);
        const leading = e.matches("h1,h2,h3,h4,button,a,li,summary,label") && EMOJI.test(own.trim().slice(0, 3));
        if (onlyEmoji || leading) emoji.push(label(e));
      }
      // Blur behind a mask is an edge that fades out, not a surface of frosted glass.
      const bf = s.backdropFilter || s.webkitBackdropFilter, mask = s.maskImage || s.webkitMaskImage;
      if (bf && /blur/.test(bf) && !/fixed|sticky/.test(s.position) && (!mask || mask === "none")) glass.push(label(e));
      if (isCard(x)) {
        for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
          const ps = getComputedStyle(p), pr = p.getBoundingClientRect();
          if (isCard({ e: p, s: ps, r: pr })) { cardInCard.push(`${label(e).split(" ")[0]} inside ${label(p).split(" ")[0]}`); break; }
        }
      }
      const lw = parseFloat(s.borderLeftWidth), tw = parseFloat(s.borderTopWidth);
      if (lw >= 3 && tw <= 1 && e.tagName !== "BLOCKQUOTE" && r.height > 30) {
        const c = rgba(s.borderLeftColor);
        if (c && c[3] > 0.5 && saturated(c)) border.push(label(e));
      }
      if (ownText(e)) {
        const f = rgba(s.color), bg = surface(e);
        if (f && bg) {
          const [, fs, fl] = hsl(f);
          if (fs < 0.12 && fl > 0.3 && fl < 0.78 && saturated(bg, 0.45)) grey.push(label(e));
        }
      }
    }
    report(clear, "gradientText", "Text filled with a gradient", gradientText);
    report(clear, "purpleBlueGradient", "Purple gradient towards blue or pink", purple);
    report(clear, "glow", "Coloured glow around an element", glow);
    report(clear, "emojiAsIcon", "Emoji used as an icon", emoji);
    if (glass.length >= 3) report(clear, "glassOnManyCards", "Frosted glass on three or more surfaces", glass);
    else report(suspect, "glass", "Frosted glass (a single surface can be fine)", glass);
    if (cardInCard.length >= 2) report(clear, "cardInCard", "Cards inside cards", cardInCard);
    else report(suspect, "cardInCard", "A card inside a card", cardInCard);
    report(clear, "colouredLeftBorder", "Box with a thick coloured left border", border);
    report(clear, "greyTextOnColour", "Grey text on a coloured surface", grey);

    // Bouncy curves are in the CSS rules.
    const m = motion();
    report(clear, "bouncyCurve", "Curve that overshoots and bounces back", m.bouncyCurves);

    // The same "fade in and slide up" on many elements (measured before the page was scrolled through, see entrances()).
    for (const g of entrancesBefore || []) {
      if (g.elements.length >= 4) clear.push({ rule: "sameEntranceEverywhere", text: "The same entrance animation on four or more elements", count: g.elements.length, examples: [`${g.key}: ${[...new Set(g.elements)].slice(0, 3).join(", ")}`] });
      else if (g.elements.length >= 2) suspect.push({ rule: "sameEntrance", text: "The same entrance animation on several elements", count: g.elements.length, examples: [g.key] });
    }

    // Everything centred.
    const blocks = el.filter((x) => x.e.matches("h1,h2,h3,p") && visibleText(x.e).trim().length > 12);
    const centred = blocks.filter((x) => x.s.textAlign === "center");
    if (blocks.length >= 8 && centred.length / blocks.length >= 0.7) clear.push({ rule: "allCentred", text: "Almost all text is centred", count: centred.length, examples: [`${centred.length} of ${blocks.length} headings and paragraphs`] });

    // Suspect: patterns that often come along, but can also be a deliberate choice.
    const caps = [];
    for (const x of el) {
      if (!ownText(x.e) || x.s.textTransform !== "uppercase" || parseFloat(x.s.fontSize) > 14 || visibleText(x.e).trim().length > 40) continue;
      const next = x.e.nextElementSibling || (x.e.parentElement && x.e.parentElement.nextElementSibling);
      if (next && next.matches("h1,h2,h3")) caps.push(label(x.e));
    }
    if (caps.length >= 2) report(suspect, "capsLineAboveHeading", "Small line in capitals above the headings", caps);
    const numbers = el.filter((x) => /^0[1-9]\.?$/.test(ownText(x.e) || visibleText(x.e).trim()) && x.e.children.length === 0).map((x) => label(x.e));
    if (numbers.length >= 3) report(suspect, "numberedSections", "Sections numbered 01, 02, 03", numbers);
    const base = rgba(getComputedStyle(document.body).backgroundColor);
    const h = document.querySelector("h1,h2");
    if (base && h) {
      const [hue, sat, l] = hsl(base);
      const serif = /serif/.test(getComputedStyle(h).fontFamily) && !/sans-serif/.test(getComputedStyle(h).fontFamily.split(",").slice(0, 2).join(","));
      if (l > 0.9 && l < 0.99 && sat > 0.15 && hue >= 25 && hue <= 60 && serif) suspect.push({ rule: "creamAndSerif", text: "Cream background with serif headings", count: 1, examples: [`background ${getComputedStyle(document.body).backgroundColor}, heading ${getComputedStyle(h).fontFamily.split(",")[0]}`] });
    }
    // Three or more matching cards that each start with a small icon in a coloured square.
    for (const x of el) {
      const children = [...x.e.children].filter(visible);
      if (children.length < 3 || !/flex|grid/.test(x.s.display)) continue;
      const withIcon = children.filter((c) => {
        const f = c.firstElementChild;
        if (!f || !c.querySelector("h2,h3,h4") || !c.querySelector("p")) return false;
        const fr = f.getBoundingClientRect(), fs = getComputedStyle(f);
        return fr.width >= 28 && fr.width <= 72 && Math.abs(fr.width - fr.height) < 4 && parseFloat(fs.borderTopLeftRadius) > 0 && (rgba(fs.backgroundColor) || [0, 0, 0, 0])[3] > 0;
      });
      if (withIcon.length >= 3) { suspect.push({ rule: "threeMatchingFeatureCards", text: "Row of matching cards with an icon in a coloured square, a heading and text", count: withIcon.length, examples: [label(x.e).split(" ")[0]] }); break; }
    }
    // One font carries almost all the text, and it is one of those every template starts with.
    const chars = new Map();
    for (const x of el) {
      const t = ownText(x.e);
      if (!t) continue;
      const f = x.s.fontFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
      chars.set(f, (chars.get(f) || 0) + t.length);
    }
    const total = [...chars.values()].reduce((a, b) => a + b, 0);
    const [largest, charCount] = [...chars.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];
    const DEFAULT = ["inter", "roboto", "arial", "helvetica", "helvetica neue", "open sans", "poppins", "montserrat", "system-ui", "-apple-system", "blinkmacsystemfont", "segoe ui", "sans-serif", "ui-sans-serif"];
    if (largest && DEFAULT.includes(largest) && charCount / total >= 0.7) suspect.push({ rule: "defaultFont", text: "A default font carries almost all the text", count: 1, examples: [`${largest}: ${Math.round((charCount / total) * 100)} % of the text`] });
    return { clear, suspect };
  };

  // Where a response to hover, press or focus can show.
  const STYLE = ["color", "backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "borderTopColor", "borderBottomColor", "boxShadow", "transform", "translate", "scale", "rotate", "opacity", "filter", "clipPath", "textDecorationLine", "textDecorationColor", "textDecorationThickness", "fontWeight", "outlineStyle", "outlineWidth", "outlineColor", "visibility", "display"];
  // Fields, checkboxes and select lists: everything you fill in or choose in, and that is not a button.
  const FILLABLE = "input:not([type=submit]):not([type=button]), select, textarea";
  // The style of an element, of its ::before and ::after, and of the first twelve elements inside it. A response can sit on a line
  // drawn under a link, or on an arrow that moves.
  const style = (el, prefix = "", inside = 12) => {
    const targets = [el, ...[...el.querySelectorAll("*")].slice(0, inside)];
    // What animates nonstop (a spinning ring, a pulsing dot) changes by itself and says nothing about a response.
    const restless = new Map();
    try {
      for (const a of el.getAnimations({ subtree: true })) {
        const e = a.effect;
        if (!e || e.getComputedTiming().iterations !== Infinity) continue;
        const key = `${targets.indexOf(e.target)}${e.pseudoElement || ""}`;
        if (!restless.has(key)) restless.set(key, new Set());
        for (const k of e.getKeyframes()) for (const p of Object.keys(k)) restless.get(key).add(p);
      }
    } catch {}
    const out = {};
    targets.forEach((m, n) => {
      for (const pseudo of ["", "::before", "::after"]) {
        const s = getComputedStyle(m, pseudo || null);
        if (pseudo && s.content === "none") continue;
        const moving = restless.get(`${n}${pseudo}`), head = `${prefix}${n ? `inside ${n} ` : ""}${pseudo ? `${pseudo} ` : ""}`;
        // A line drawn with the width or height of a pseudo-element is also a response.
        for (const k of pseudo ? [...STYLE, "width", "height"] : STYLE) if (!moving || !moving.has(k)) out[head + k] = s[k];
      }
    });
    return out;
  };
  // A field can show its focus on what surrounds it: a frame with :focus-within, a label, or the track that draws a switch.
  const around = (el) => (el.matches(FILLABLE) ? [...new Set([el.parentElement, el.previousElementSibling, el.nextElementSibling, ...(el.labels || [])])].filter((x) => x && x !== document.body && !x.matches(CLICKABLE)) : []);
  const fullStyle = (el) => Object.assign(style(el), ...around(el).map((x, n) => style(x, `around ${n + 1} `, 0)));
  // Transitions in progress are fast-forwarded, so the end state is compared, not a point along the way.
  const finish = (el) => {
    try { for (const a of el.getAnimations({ subtree: true })) if (a instanceof CSSTransition) a.finish(); } catch {}
    forgetSeen();
  };
  const now = (el) => { for (const x of [el, ...around(el)]) finish(x); return fullStyle(el); };
  const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).map((k) => `${k}: ${b[k] ?? "gone"}`);

  // Groups where Tab stops only once and the arrow keys move between the members: the composite roles and radio buttons with the same name.
  const COMPOSITE = "[role=tablist], [role=radiogroup], [role=menu], [role=menubar], [role=toolbar], [role=listbox], [role=tree], [role=grid], [role=treegrid]";
  // Roles that say the element can be pressed. Anything else that only has a tabindex is there to take focus: a scroll area, a tab panel.
  const PRESS_ROLE = /(^|\s)(button|link|tab|menuitem|menuitemcheckbox|menuitemradio|option|switch|checkbox|radio|slider|spinbutton|combobox|textbox|searchbox|treeitem|gridcell)(\s|$)/;

  // Marks every clickable element with data-pc and remembers its resting style, so the keyboard and hover tests can compare.
  // What cannot be seen at rest is remembered too: if it appears when it gets focus (a skip link), that is its way of showing focus.
  let resting = new Map(), hiddenAtRest = new WeakSet();
  const mark = () => {
    const out = [];
    let i = 0;
    resting = new Map();
    hiddenAtRest = new WeakSet();
    const groups = new Map();
    const group = (el) => {
      const key = el.matches("input[type=radio]") && el.name ? `${el.name}|${[...document.forms].indexOf(el.form)}` : el.closest(COMPOSITE);
      if (!key) return null;
      if (!groups.has(key)) groups.set(key, groups.size);
      return groups.get(key);
    };
    for (const el of document.querySelectorAll("[data-pc]")) el.removeAttribute("data-pc");
    for (const el of document.querySelectorAll(CLICKABLE)) {
      // What is disabled (disabled or inert) can neither take focus nor be pressed. It is not tested.
      if (el.matches(":disabled") || el.closest("[inert]")) continue;
      if (!visible(el)) {
        hiddenAtRest.add(el);
        // A field made invisible (a switch or a checkbox drawn by a track next to it) can still take focus.
        if (el.matches(FILLABLE)) resting.set(el, fullStyle(el));
        continue;
      }
      el.setAttribute("data-pc", String(i));
      resting.set(el, fullStyle(el));
      const r = el.getBoundingClientRect();
      const field = el.matches(FILLABLE);
      const button = !field && (el.matches("button, [role=button], input, summary") || getComputedStyle(el).display !== "inline");
      // The selected item (the page you are on; the selected tab) should not respond to mouse and press: a press changes nothing.
      const selected = el.matches('[aria-current]:not([aria-current="false"]):not([aria-current=""]), [role=tab][aria-selected="true"]');
      // An element that can only take focus cannot be pressed, so it should not respond either. It must still be reachable with Tab and show its focus.
      const focusOnly = !el.matches("a[href], button, input, select, textarea, summary, [onclick]") && !PRESS_ROLE.test(el.getAttribute("role") || "") && getComputedStyle(el).cursor !== "pointer";
      // Where a link leads. Two links with the same target are two ways to the same place, and it is enough that Tab reaches one.
      const href = el instanceof HTMLAnchorElement ? (el.getAttribute("href") || "").trim() : "";
      const target = href && href !== "#" && !/^javascript:/i.test(href) ? el.href : null;
      out.push({ i, element: label(el), y: Math.round(r.top + scrollY), x: Math.round(r.left), field, button, selected, focusOnly, group: group(el), target });
      i++;
    }
    return out;
  };
  // Takes the resting style again right before a test, so what has happened on the page since marking (an image that faded in)
  // does not look like a response. If the mouse is already on the element, the old one is kept.
  const rest = (i) => {
    const el = document.querySelector(`[data-pc="${i}"]`);
    if (el && !el.matches(":hover")) resting.set(el, now(el));
  };
  const change = (i) => {
    const el = document.querySelector(`[data-pc="${i}"]`);
    return el && resting.has(el) ? diff(resting.get(el), now(el)) : null;
  };
  // The mouse's last position. The page can move a target when the mouse arrives (a fan that opens), so the mouse ends up beside it.
  let mouseX = null, mouseY = null;
  addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; }, { capture: true, passive: true });
  // Is the mouse on the element or on something inside it? If the mouse position is unknown, the answer is yes, and the test judges as before.
  const underMouse = (i) => {
    const el = document.querySelector(`[data-pc="${i}"]`);
    if (!el || mouseX === null) return true;
    const on = document.elementFromPoint(mouseX, mouseY);
    return !!on && el.contains(on);
  };
  // The Tab walk remembers where focus has been, so it knows when it has gone all the way round. That also works on a page with hundreds of stops.
  // Smooth scrolling is switched off during the walk. Otherwise the position is read while the page is still gliding to where focus is.
  let walked = new Set(), previous = null, scrollBefore = null;
  const startWalk = () => {
    walked = new Set(); previous = null;
    const root = document.documentElement;
    if (!scrollBefore) scrollBefore = { hasStyle: root.hasAttribute("style"), value: root.style.getPropertyValue("scroll-behavior"), important: root.style.getPropertyPriority("scroll-behavior") };
    root.style.setProperty("scroll-behavior", "auto", "important");
  };
  const endWalk = () => {
    if (!scrollBefore) return;
    const root = document.documentElement;
    root.style.removeProperty("scroll-behavior");
    if (scrollBefore.value) root.style.setProperty("scroll-behavior", scrollBefore.value, scrollBefore.important);
    if (!scrollBefore.hasStyle && !root.getAttribute("style")) root.removeAttribute("style");
    scrollBefore = null;
  };
  // The latest press of Tab. The listener is first in the queue, because this script runs before the page's own, so it sees the press even when the page stops it.
  // Whether the page swallowed the press (preventDefault) can be read afterwards, once the press has been handled.
  let lastTab = null;
  addEventListener("keydown", (e) => { if (e.key === "Tab") lastTab = e; }, true);
  // If focus is inside a shadow root, the innermost element with focus is the one looked at.
  const active = () => {
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
    return el;
  };
  // What is fixed on the screen (fixed or sticky) has no position on the page that says anything about the order.
  const fixedOnScreen = (el) => {
    for (let p = el; p && p.nodeType === 1 && p !== document.documentElement; p = p.parentElement || p.getRootNode().host) if (/^(fixed|sticky)$/.test(getComputedStyle(p).position)) return true;
    return false;
  };
  // The part of the element's box that can be seen: cut by the screen and by every parent that clips its content (overflow).
  // A parent only clips what it is the containing block for: an element with position absolute is first clipped by the nearest positioned parent,
  // and one with position fixed only by a parent that contains fixed elements. Scrolling on html and body belongs to the screen.
  const visiblePart = (el) => {
    const r = el.getBoundingClientRect(), root = document.documentElement, rootStyle = getComputedStyle(root);
    const bodyClips = rootStyle.overflowX !== "visible" || rootStyle.overflowY !== "visible";
    let x1 = Math.max(r.left, 0), y1 = Math.max(r.top, 0), x2 = Math.min(r.right, innerWidth), y2 = Math.min(r.bottom, innerHeight);
    let pos = getComputedStyle(el).position;
    for (let p = el; !inTopLayer(p); ) {
      p = up(p);
      if (!p || p.nodeType !== 1 || p === root) break;
      const s = getComputedStyle(p);
      if (pos === "fixed" ? !containsFixed(s) : pos === "absolute" && s.position === "static" && !containsFixed(s)) continue;
      pos = s.position;
      if ((s.overflowX === "visible" && s.overflowY === "visible") || (p === document.body && !bodyClips)) continue;
      const k = p.getBoundingClientRect();
      if (s.overflowX !== "visible") { x1 = Math.max(x1, k.left); x2 = Math.min(x2, k.right); }
      if (s.overflowY !== "visible") { y1 = Math.max(y1, k.top); y2 = Math.min(y2, k.bottom); }
    }
    return x2 - x1 >= 1 && y2 - y1 >= 1 ? { x1, y1, x2, y2 } : null;
  };
  // Infinite animations on the element or a parent (a ticker, a carousel). They can move the element while it has focus.
  const infinite = (el) => {
    const out = [];
    try {
      for (let p = el; p && p.nodeType === 1; p = up(p)) for (const a of p.getAnimations()) {
        const t = a.effect && !a.effect.pseudoElement && a.effect.getComputedTiming();
        if (t && a.currentTime !== null && t.iterations === Infinity && typeof t.duration === "number" && t.duration > 0) out.push(a);
      }
    } catch {}
    return out;
  };
  // Focus is only obscured when none of it can be seen: the centre and four points towards the corners all hit something else.
  // A link spanning several lines is tested in the middle of each piece, because its overall box also covers the neighbours' text.
  const isObscured = (el, part) => {
    if (getComputedStyle(el).pointerEvents === "none") return false;
    const root = el.getRootNode(), from = root.elementFromPoint ? root : document;
    const pieces = [...el.getClientRects()].filter((k) => k.width >= 1 && k.height >= 1);
    let points = pieces.length > 1 ? pieces.map((k) => [k.left + k.width / 2, k.top + k.height / 2]).filter(([x, y]) => x >= part.x1 && x < part.x2 && y >= part.y1 && y < part.y2) : [];
    if (!points.length) points = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].map(([fx, fy]) => [part.x1 + (part.x2 - part.x1) * fx, part.y1 + (part.y2 - part.y1) * fy]);
    return points.every(([x, y]) => { const top = from.elementFromPoint(x, y); return !!top && top !== el && !el.contains(top) && !top.contains(el); });
  };
  // Where focus sits on the screen: outside it (none of the element can be seen) or covered by something else.
  // If the element moves along in an infinite animation, the position depends on when focus arrives. Then the whole run is tested,
  // and it counts if the element is out of sight somewhere in it.
  const PHASES = 24;
  const position = (el) => {
    const anim = infinite(el), part = visiblePart(el);
    let offscreen = !part;
    if (anim.length && !offscreen) {
      const before = anim.map((a) => a.currentTime);
      try {
        for (let k = 0; k < PHASES && !offscreen; k++) {
          for (const a of anim) { const t = a.effect.getComputedTiming(); a.currentTime = (t.delay || 0) + (t.duration * k) / PHASES; }
          offscreen = !visiblePart(el);
        }
      } catch {}
      anim.forEach((a, n) => { try { a.currentTime = before[n]; } catch {} });
    }
    return { offscreen, obscured: !offscreen && isObscured(el, part), moving: anim.length > 0 };
  };
  const focus = () => {
    // swallowed: the page's own code stopped the Tab press. If focus is still in the same place, it is a trap and not a field with several parts.
    const el = active(), swallowed = !!lastTab && lastTab.defaultPrevented;
    lastTab = null;
    if (!el || el === document.body || el === document.documentElement) { previous = null; return null; }
    // same: Tab did not move focus. round: focus has been here before in this walk, so it has gone all the way round.
    const same = el === previous, round = !same && walked.has(el);
    previous = el;
    walked.add(el);
    const i = el.getAttribute("data-pc");
    // What appears when it gets focus (a skip link, a menu that opens) may be on its way. Transitions are fast-forwarded before reading.
    try { for (let p = el; p && p.nodeType === 1; p = up(p)) for (const a of p.getAnimations()) if (a instanceof CSSTransition) a.finish(); } catch {}
    forgetSeen();
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    // An invisible field can only show its focus on what surrounds it. Its own ring is not seen.
    // appeared: the element could not be seen at rest and can be seen now. That is also a way of showing focus.
    const shows = visible(el), appeared = shows && hiddenAtRest.has(el);
    const ring = shows && s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
    const changed = resting.has(el) ? diff(resting.get(el), now(el)).filter((x) => shows || x.startsWith("around ")) : [];
    // In a frame (iframe) focus is inside the frame's own page, which cannot be seen from here.
    const frame = /^(IFRAME|FRAME|OBJECT|EMBED)$/.test(el.tagName);
    // The position is read last, when the element's own transitions are fast-forwarded. An invisible field and a frame have no position to judge.
    const where = shows && !frame ? position(el) : { offscreen: false, obscured: false, moving: false };
    return { i: i === null ? null : Number(i), element: label(el), y: Math.round(r.top + scrollY), x: Math.round(r.left), right: Math.round(r.right), fixed: fixedOnScreen(el), frame, same, round, swallowed, visible: ring || changed.length > 0 || appeared, ring, changed: changed.slice(0, 8), ...where };
  };
  // Reads the position again once the page stands still: the element's box and the scroll must be the same three times in a row.
  // Used when the first reading says obscured or out of sight, because the page may itself have started a scroll or a transition.
  const focusSettled = async () => {
    const el = active();
    if (!el || el === document.body || el === document.documentElement) return null;
    const place = () => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height, scrollX, scrollY].map(Math.round).join(); };
    for (let n = 0, same = 0, before = place(); n < 20 && same < 2; n++) {
      await new Promise((f) => setTimeout(f, 50));
      const here = place();
      same = here === before ? same + 1 : 0;
      before = here;
    }
    const { offscreen, obscured } = position(el);
    return { offscreen, obscured };
  };

  // When a rule has a shorthand with var() and one of the shorthand's longhands on its own (border: 1px solid var(--line); border-bottom: 0),
  // the browser returns the other longhands as empty ("border-top-width: ;"). Written like that, they would be missing from the copy.
  const LOST = /(?:^|[;{]\s*)(?!--)[a-z-]+: ;/;
  const sheetRules = (sheet) => [...sheet.cssRules].map((r) => r.cssText).join("\n");
  // The addresses of the loaded stylesheets that have lost values. Their own text cannot be read in here; it is fetched from outside and passed to copy().
  const sheetsWithLoss = () => {
    const out = [];
    for (const sheet of document.styleSheets) { try { if (sheet.href && LOST.test(sheetRules(sheet))) out.push(sheet.href); } catch { /* a sheet that may not be read */ } }
    return out;
  };

  // A copy of the page as it stands right now, with all CSS inlined and no scripts. Used for stress tests and previews,
  // so they do not have to load the page again (and submit forms again).
  const copy = (sources = {}) => {
    const css = [], imports = [];
    for (const sheet of document.styleSheets) {
      try {
        const base = sheet.href || location.href, rules = sheetRules(sheet);
        // If the rules have lost values, the sheet's own text is used: a <style> has it itself, a loaded sheet gets it from outside.
        const own = LOST.test(rules) ? (sheet.ownerNode && sheet.ownerNode.tagName === "STYLE" ? sheet.ownerNode.textContent : sources[sheet.href]) : null;
        // The whole quoted address is read at once, so a url() inside a data address (e.g. an SVG filter) is not rewritten.
        const text = (own ? own.replace(/@import\s+(?:"([^"]*)"|'([^']*)')/g, (_, a, b) => `@import url("${a ?? b}")`) : rules).replace(/url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^"')\s]+))\s*\)/g, (all, a, b, c) => {
          const u = a ?? b ?? c;
          if (/^(data:|#|about:|blob:)/i.test(u)) return all;
          try { return `url("${new URL(u, base).href}")`; } catch { return all; }
        });
        css.push(sheet.media && sheet.media.mediaText ? `@media ${sheet.media.mediaText} {\n${text}\n}` : text);
      } catch { if (sheet.href) imports.push(`@import url("${sheet.href}");`); }
    }
    const fieldsNow = [...document.querySelectorAll("input, textarea, select")];
    const clone = document.documentElement.cloneNode(true);
    const fieldsClone = [...clone.querySelectorAll("input, textarea, select")];
    fieldsNow.forEach((f, i) => {
      const k = fieldsClone[i];
      if (!k) return;
      if (f.type === "password") return;
      if (f.tagName === "TEXTAREA") k.textContent = f.value;
      else if (f.tagName === "SELECT") [...k.options].forEach((o, n) => (f.options[n] && f.options[n].selected ? o.setAttribute("selected", "") : o.removeAttribute("selected")));
      else if (f.type === "checkbox" || f.type === "radio") (f.checked ? k.setAttribute("checked", "") : k.removeAttribute("checked"));
      else k.setAttribute("value", f.value);
    });
    clone.querySelectorAll("script, noscript, link[rel=stylesheet], link[rel=preload], link[rel=modulepreload], style, iframe, base").forEach((e) => e.remove());
    clone.querySelectorAll("[data-pc]").forEach((e) => e.removeAttribute("data-pc"));
    const head = clone.querySelector("head") || clone.insertBefore(document.createElement("head"), clone.firstChild);
    const baseTag = document.createElement("base");
    baseTag.setAttribute("href", location.href);
    head.insertBefore(baseTag, head.firstChild);
    const styleTag = document.createElement("style");
    styleTag.setAttribute("data-pc-page", "");
    styleTag.textContent = `${imports.join("\n")}\n${css.join("\n")}`.replace(/<\/style/gi, "<\\/style");
    head.appendChild(styleTag);
    return "<!doctype html>\n" + clone.outerHTML;
  };

  // Stress test 1: makes every text on buttons, links, labels and headings 35 % longer, as a German translation typically does.
  const lengthen = (share = 0.35) => {
    let n = 0;
    for (const el of document.querySelectorAll("button, a, label, h1, h2, h3, h4, th, legend, summary, [role=button]")) {
      if (!visible(el)) continue;
      for (const node of el.childNodes) {
        if (node.nodeType !== 3 || node.textContent.trim().length < 3) continue;
        node.textContent = node.textContent.replace(/[\p{L}]{4,}/gu, (word) => word + word.slice(0, Math.ceil(word.length * share)).toLowerCase());
        n++;
      }
    }
    return n;
  };
  // Stress test 2: a long word without spaces (an email address, a web address) in headings, paragraphs, lists and table cells.
  const longWord = () => {
    let n = 0;
    const word = "a.very.long.name.without.any.spaces@example-domain.com";
    for (const el of document.querySelectorAll("p, h1, h2, h3, td, dd, li")) {
      if (!visible(el)) continue;
      // Only running text and longer headings: that is where users' own words typically end up. A short label does not get an email address.
      const node = [...el.childNodes].find((x) => x.nodeType === 3 && x.textContent.trim().length >= 25);
      if (!node) continue;
      node.textContent = `${word} ${node.textContent}`;
      n++;
    }
    return n;
  };

  // ---------- the screen as a user sees it (used by scripts/browse.mjs) ----------
  //
  // Visible text in reading order, with everything that can be pressed or typed in as numbered brackets:
  //   [3 link: the guide]   [4 field: Your email address · empty]   [5 button: Send me a link]
  // Only what the eye can see counts. An aria-label is not a name here: a button without visible text is called "icon without visible text".
  // Text for screen readers, text clipped away by a closed box and text outside the screen's edges are left out.
  // The page is not changed. The elements behind the numbers are remembered, so browse.mjs can press them with control(nr).

  const CONTROL = "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=menuitem], [role=checkbox], [role=radio], [role=switch], [role=option], [contenteditable=''], [contenteditable='true']";
  const NO_TEXT = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "TITLE", "META", "LINK", "OPTION", "OPTGROUP", "DATALIST"]);
  const EMBEDDED = { IFRAME: "embedded frame that cannot be read here", VIDEO: "video", CANVAS: "drawn surface", OBJECT: "embedded content", EMBED: "embedded content" };
  const ALL = { top: -Infinity, bottom: Infinity, left: -Infinity, right: Infinity };
  const cut = (a, r) => ({ top: Math.max(a.top, r.top), bottom: Math.min(a.bottom, r.bottom), left: Math.max(a.left, r.left), right: Math.min(a.right, r.right) });
  const within = (r, k) => Math.min(r.bottom, k.bottom) - Math.max(r.top, k.top) >= 1 && Math.min(r.right, k.right) - Math.max(r.left, k.left) >= 1;
  const shorten = (t, n = 80) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
  // Text that is only there for screen readers: a box of at most 2 × 2 px that clips its content.
  const screenReaderOnly = (el, s) => {
    if (s.position !== "absolute" && s.position !== "fixed") return false;
    const r = el.getBoundingClientRect();
    return r.width <= 2 && r.height <= 2 && (s.overflowX !== "visible" || s.clip !== "auto" || s.clipPath !== "none");
  };
  const gone = (el, s) => s.display === "none" || Number(s.opacity) <= 0.05 || screenReaderOnly(el, s);
  const inLine = (s) => s.display.startsWith("inline") || s.display === "contents" || s.display === "table-cell";
  // What a closed <details> hides, and what content-visibility: hidden skips, cannot be seen.
  const childrenOf = (el, s) => {
    if (s && s.contentVisibility === "hidden") return [];
    if (el.tagName === "DETAILS" && !el.open) return [...el.children].filter((b) => b.tagName === "SUMMARY").slice(0, 1);
    if (el.shadowRoot) return el.shadowRoot.childNodes;
    if (el.tagName === "SLOT") { const assigned = el.assignedNodes({ flatten: true }); if (assigned.length) return assigned; }
    return el.childNodes;
  };
  const rectOf = (textNode) => { const range = document.createRange(); range.selectNodeContents(textNode); return range.getBoundingClientRect(); };

  // The text in an element the eye can see. Used for the name of a button, a link or a label.
  const visibleIn = (root) => {
    let out = "";
    const walk = (n) => {
      if (n.nodeType === 3) {
        if (!n.textContent.trim()) { out += " "; return; }
        const r = rectOf(n);
        if (r.width >= 1 && r.height >= 1 && !(n.parentElement && getComputedStyle(n.parentElement).visibility === "hidden")) out += n.textContent;
        return;
      }
      if (n.nodeType !== 1 || NO_TEXT.has(n.tagName) || n.namespaceURI !== "http://www.w3.org/1999/xhtml") return;
      const s = getComputedStyle(n);
      if (gone(n, s)) return;
      const block = n.tagName === "BR" || !inLine(s);
      if (block) out += " ";
      for (const b of childrenOf(n, s)) walk(b);
      if (block) out += " ";
    };
    for (const b of childrenOf(root)) walk(b);
    return out.replace(/\s+/g, " ").trim();
  };
  const labelText = (el) => {
    const parts = [...(el.labels || [])].filter(visible).map(visibleIn);
    if (!parts.length) for (const id of (el.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean)) {
      const m = document.getElementById(id);
      if (m && visible(m)) parts.push(visibleIn(m));
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
  };

  // What kind of control is it, what is it called, and what state is it in right now?
  const describeControl = (el) => {
    const tag = el.tagName, type = (el.getAttribute("type") || "").toLowerCase(), role = el.getAttribute("role") || "";
    if ((tag === "INPUT" && (type === "checkbox" || type === "radio")) || ["checkbox", "radio", "switch"].includes(role)) {
      const on = tag === "INPUT" ? el.checked : el.getAttribute("aria-checked") === "true";
      return { kind: type === "radio" || role === "radio" ? "radio" : "checkbox", name: shorten(labelText(el) || visibleIn(el)) || "no visible text", state: [on ? "checked" : "not checked"] };
    }
    if (tag === "SELECT") {
      const options = [...el.options].map((o) => o.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
      const chosen = [...el.selectedOptions].map((o) => o.textContent.replace(/\s+/g, " ").trim()).join(", ");
      return { kind: "select", name: shorten(labelText(el)) || "no visible label", state: [`selected: ${chosen || "nothing"}`, `options: ${options.slice(0, 8).map((m) => shorten(m, 40)).join(", ")}${options.length > 8 ? ` and ${options.length - 8} more` : ""}`] };
    }
    const writable = tag === "TEXTAREA" || (tag === "INPUT" && !["submit", "button", "reset", "image"].includes(type));
    if (writable || (el.isContentEditable && tag !== "INPUT")) {
      const KINDS = { password: "password", date: "date", time: "time", "datetime-local": "date and time", month: "month", week: "week", file: "file", number: "number", range: "slider", color: "colour", search: "search" };
      const value = writable ? el.value || "" : visibleIn(el);
      const state = [];
      if (KINDS[type]) state.push(KINDS[type]);
      if (tag === "TEXTAREA") state.push("multiple lines");
      const placeholder = el.getAttribute("placeholder");
      if (!value && placeholder) state.push(`placeholder "${shorten(placeholder, 50)}"`);
      state.push(!value ? "empty" : type === "password" ? "filled in (hidden)" : `contains "${shorten(value, 60)}"`);
      return { kind: "field", name: shorten(labelText(el)) || "no visible label", state, password: type === "password" };
    }
    let name = tag === "INPUT" ? el.value || (type === "submit" ? "Submit" : type === "reset" ? "Reset" : "") : shorten(visibleIn(el));
    if (!name) {
      const image = el.querySelector("img[alt]:not([alt=''])");
      name = image ? `image: ${shorten(image.alt, 50)}` : "icon without visible text";
      if (el.title) name += `, shows "${shorten(el.title, 50)}" on hover`;
    }
    const state = [];
    if (tag === "SUMMARY" && el.parentElement && el.parentElement.tagName === "DETAILS") state.push(el.parentElement.open ? "open" : "closed");
    const kind = tag === "A" || role === "link" ? "link" : tag === "SUMMARY" ? "disclosure" : role === "tab" ? "tab" : role === "menuitem" ? "menu item" : role === "option" ? "option"
      : tag === "BUTTON" || tag === "INPUT" || role === "button" ? "button" : "clickable";
    return { kind, name, state };
  };

  let controlEls = [];
  const control = (nr) => controlEls[nr - 1] || null;

  const screen = () => {
    controlEls = [];
    const lines = [], all = [];
    let cur = null, level = 0, sideways = 0;
    const close = () => {
      if (cur) {
        const joined = (parts) => parts.join("").replace(/\s+/g, " ").replace(/ \| (?=\||$)/g, " ").trim();
        const text = joined(cur.parts);
        if (text && cur.top !== Infinity) lines.push({ ...cur, text, plain: joined(cur.plainParts) });
      }
      cur = null;
    };
    const add = (text, plain, r, soft) => {
      cur = cur || { parts: [], plainParts: [], top: Infinity, bottom: -Infinity, left: Infinity, right: -Infinity, level, controls: [], brackets: [], hasText: false, soft: ALL };
      cur.parts.push(text);
      cur.plainParts.push(plain);
      if (!r) return;
      cur.top = Math.min(cur.top, r.top); cur.bottom = Math.max(cur.bottom, r.bottom);
      cur.left = Math.min(cur.left, r.left); cur.right = Math.max(cur.right, r.right);
      cur.soft = soft;
    };
    // el is what gets pressed. field is what is described (a hidden checkbox behind a visible label).
    const setControl = (el, field, soft) => {
      const r = el.getBoundingClientRect();
      const b = describeControl(field);
      const disabled = field.matches(":disabled") || field.getAttribute("aria-disabled") === "true";
      let nr = null, obscured = false;
      if (!disabled) {
        controlEls.push(el);
        nr = controlEls.length;
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        if (x >= 0 && x < innerWidth && y >= 0 && y < innerHeight) {
          const root = el.getRootNode();
          const top = (root.elementFromPoint ? root : document).elementFromPoint(x, y);
          obscured = !!top && top !== el && !el.contains(top) && !top.contains(el);
        }
      }
      const head = `${b.kind}${disabled ? ", disabled" : ""}: ${b.name}`;
      const tail = `${b.state.length ? ` · ${b.state.join(" · ")}` : ""}${obscured ? " (covered by something else)" : ""}`;
      const bracket = `[${nr === null ? "" : `${nr} `}${head}${tail}]`;
      add(` ${bracket} `, ` [${head}] `, r, soft);
      cur.brackets.push(bracket);
      const k = { nr, kind: b.kind, name: b.name, state: b.state, disabled, obscured, password: !!b.password, list: field.tagName === "SELECT", writable: b.kind === "field" };
      cur.controls.push(k);
      all.push(k);
    };
    // Looks like something that can be pressed without being a real control: the cursor turns into a hand.
    const pointer = (n, s) => s.cursor === "pointer" && n.tagName !== "LABEL" && n.tagName !== "BODY" && n.tagName !== "HTML"
      && (!n.parentElement || getComputedStyle(n.parentElement).cursor !== "pointer") && !n.querySelector(CONTROL);

    // hard: what closed boxes (overflow: hidden) clip away. Text outside it cannot be seen.
    // soft: what scroll boxes show right now. Text outside it can be seen by scrolling.
    const walk = (n, hard, soft) => {
      if (n.nodeType === 3) {
        const t = n.textContent.replace(/\s+/g, " ");
        if (!t.trim()) { if (cur) { cur.parts.push(" "); cur.plainParts.push(" "); } return; }
        const r = rectOf(n);
        if (r.width < 1 || r.height < 1 || !within(r, hard) || (n.parentElement && getComputedStyle(n.parentElement).visibility === "hidden")) return;
        add(t, t, r, soft);
        cur.hasText = true;
        return;
      }
      if (n.nodeType !== 1 || NO_TEXT.has(n.tagName) || n.namespaceURI !== "http://www.w3.org/1999/xhtml") return;
      const s = getComputedStyle(n);
      if (gone(n, s)) return;
      if (n.tagName === "BR") return close();
      if (s.position === "fixed") { hard = ALL; soft = ALL; }
      const block = !inLine(s);
      const r = n.getBoundingClientRect();

      if (n.tagName === "LABEL" && n.control) {
        const field = n.control;
        if (!visible(field)) {
          if (visible(n) && within(r, hard)) { if (block) close(); setControl(n, field, soft); if (block) close(); }
          return;
        }
        // The label's text is the field's name and sits in the field's bracket. It is not repeated as loose text.
        if ([...n.querySelectorAll(CONTROL)].every((k) => k === field)) { if (n.contains(field)) walk(field, hard, soft); return; }
      }
      if (n.matches(CONTROL) || pointer(n, s)) {
        if (!visible(n) || !within(r, hard)) return;
        if (block) close();
        setControl(n, n, soft);
        if (block) close();
        return;
      }
      if (n.tagName === "IMG" || EMBEDDED[n.tagName]) {
        if (s.visibility === "hidden" || !within(r, hard)) return;
        if (n.tagName === "IMG") { if (r.width >= 24 && r.height >= 24 && (n.alt || (r.width >= 96 && r.height >= 96))) { const t = n.alt ? ` (image: ${shorten(n.alt, 60)}) ` : " (image) "; add(t, t, r, soft); } }
        else if (r.width >= 96 && r.height >= 96) { close(); const t = `(${EMBEDDED[n.tagName]})`; add(t, t, r, soft); close(); }
        return;
      }

      const h = /^H[1-6]$/.test(n.tagName) ? Number(n.tagName[1]) : n.getAttribute("role") === "heading" ? Number(n.getAttribute("aria-level")) || 2 : 0;
      if (block || h) close();
      if (s.display === "table-cell" && cur) { cur.parts.push(" | "); cur.plainParts.push(" | "); }
      const before = level;
      if (h) level = h;
      let innerHard = hard, innerSoft = soft;
      if (n !== document.body && (s.overflowX !== "visible" || s.overflowY !== "visible")) {
        const scrolls = /auto|scroll/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 4 || /auto|scroll/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 4;
        // In a scroll box all content can be reached by scrolling, so only what the box shows right now counts as "on screen".
        if (scrolls) { if (!within(r, hard)) { level = before; return; } innerHard = ALL; innerSoft = cut(soft, r); }
        else innerHard = cut(hard, r);
      }
      for (const b of childrenOf(n, s)) walk(b, innerHard, innerSoft);
      if (block || h) close();
      level = before;
    };
    walk(document.body, ALL, ALL);
    close();

    // Where is the line compared with what the screen shows right now?
    const kept = [];
    for (const l of lines) {
      const shown = { top: Math.max(0, l.soft.top), bottom: Math.min(innerHeight, l.soft.bottom), left: Math.max(0, l.soft.left), right: Math.min(innerWidth, l.soft.right) };
      const vertical = Math.min(l.bottom, shown.bottom) - Math.max(l.top, shown.top) >= 1, horizontal = Math.min(l.right, shown.right) - Math.max(l.left, shown.left) >= 1;
      // To the side of what is shown: a drawer outside the edge or a card in a row that scrolls horizontally.
      if (!horizontal && (vertical || l.right <= 0 || l.left >= innerWidth)) { sideways += 1; for (const k of l.controls) k.where = "side"; continue; }
      l.where = vertical && horizontal ? "on" : l.bottom <= shown.top + 1 ? "above" : "below";
      for (const k of l.controls) k.where = l.where;
      // What sits in the same row (a menu, a row in a grid) is gathered on one line.
      const f = kept[kept.length - 1];
      if (f && f.where === l.where && !f.level && !l.level && Math.abs(f.top - l.top) < 6 && Math.abs(f.bottom - l.bottom) < 6 && l.left >= f.right - 2 && f.text.length + l.text.length <= 160) {
        f.text += "  " + l.text; f.plain += "  " + l.plain; f.right = l.right; f.controls.push(...l.controls); f.brackets.push(...l.brackets); f.hasText = f.hasText || l.hasText;
      } else kept.push(l);
    }
    const d = document.documentElement, focused = document.activeElement;
    return {
      title: document.title, url: location.href, width: innerWidth, height: innerHeight,
      scrolled: Math.round(scrollY), scrollable: Math.max(0, Math.round(d.scrollHeight - innerHeight)), sideways,
      // The number of the control that has keyboard focus.
      focus: controlEls.findIndex((el) => el === focused || (el.tagName === "LABEL" && el.control === focused)) + 1 || null,
      lines: kept.map((l) => { const h = l.level ? "#".repeat(l.level) + " " : ""; return { text: h + l.text, plain: h + l.plain, where: l.where, heading: l.level > 0, brackets: l.brackets }; }),
      controls: all,
    };
  };

  return { contrast, overflow, clipped, targets, fields, form, structure, typography, alignment, system, motion, running, record, recorded, offscreen, entrances, aiLook, mark, rest, change, underMouse, focus, focusSettled, startWalk, endWalk, sheetsWithLoss, copy, lengthen, longWord, screen, control };
})();
