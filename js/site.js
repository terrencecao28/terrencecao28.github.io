/* Builds every page from the files in content/.
   You shouldn't need to edit this file: change text and photos in the
   online editor (Pages CMS) or in the content/*.json files. */
(function () {
  const page = document.body.dataset.page;
  const PAGE_FILES = {
    home: ["home", "galleries"],
    galleries: ["galleries"],
    gallery: ["galleries"],
    about: ["about"],
    contact: ["contact"],
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slugify = (s) => String(s || "").toLowerCase().normalize("NFKD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gallery";
  // The editor saves image paths like "/images/photo.jpg". Make them relative
  // so the site also works when hosted in a sub-folder (e.g. GitHub Pages).
  const img = (p) => {
    const src = typeof p === "string" ? p : p && p.src;
    if (!src) return "";
    return /^\/(?!\/)/.test(src) ? src.slice(1) : src;
  };
  // Width and height of each photo (from galleries.json), and a smaller copy
  // of it for the grids, so pages can be laid out and shown quickly.
  let SIZES = {};
  const small = (p) => {
    const src = img(p);
    return SIZES[src] && src.startsWith("images/gallery/") ? "images/small/" + src.slice(15) : src;
  };
  const paragraphs = (text) => String(text || "").split(/\n\s*\n/)
    .filter((t) => t.trim()).map((t) => `<p>${esc(t.trim()).replace(/\n/g, "<br>")}</p>`).join("");

  async function load(name) {
    const res = await fetch(`content/${name}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`content/${name}.json: ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      const err = new Error(`content/${name}.json — ${e.message}`);
      err.typo = `${name}.json`;
      throw err;
    }
  }

  /* ---------- Header & footer ---------- */
  function renderChrome(SITE) {
    const header = document.createElement("header");
    header.className = "site-header";
    const link = (href, label, keys) =>
      `<a href="${href}"${keys.includes(page) ? ' class="active" aria-current="page"' : ""}>${label}</a>`;
    header.innerHTML = `
      <a class="brand" href="index.html">
        <span class="brand-name">${esc(SITE.name)}</span>
        <span class="brand-tag">${esc(SITE.tagline)}</span>
      </a>
      <nav class="nav">
        ${link("galleries.html", "Galleries", ["galleries", "gallery"])}
        ${link("about.html", "About", ["about"])}
        ${link("contact.html", "Contact", ["contact"])}
      </nav>
      ${SITE.instagram ? `
      <a class="header-icon" href="${esc(SITE.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
      </a>` : ""}
      <button class="nav-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>`;
    document.body.prepend(header);

    const toggle = header.querySelector(".nav-toggle");
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open);
    });

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <span>&copy; ${new Date().getFullYear()} ${esc(SITE.name)}. All rights reserved.</span>
      <span class="social">${SITE.instagram ? `<a href="${esc(SITE.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""}</span>`;
    document.body.append(footer);

    if (SITE.name) {
      document.title = page === "home"
        ? (SITE.tagline ? `${SITE.name} — ${SITE.tagline}` : SITE.name)
        : `${document.title} — ${SITE.name}`;
    }
    if (SITE.description) {
      const meta = document.querySelector('meta[name="description"]') || document.head.appendChild(
        Object.assign(document.createElement("meta"), { name: "description" }));
      meta.content = SITE.description;
    }
  }

  /* ---------- Home: a single row of photos around your signature ---------- */
  function renderHome(SITE, HOME, GALLERIES) {
    const strip = document.getElementById("home-strip");

    // Photos chosen in the editor; if none, the cover photos of the galleries
    // listed in "coverGalleries" (or of all galleries), in a random order.
    let picks = (HOME.photos || []).filter(Boolean).slice(0, 6);
    if (!picks.length) {
      const wanted = (HOME.coverGalleries || []).map(slugify);
      picks = GALLERIES
        .filter((g) => !wanted.length || wanted.includes(g.slug))
        .map((g) => g.cover || g.photos[0])
        .filter(Boolean);
      for (let i = picks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [picks[i], picks[j]] = [picks[j], picks[i]];
      }
      picks = picks.slice(0, 6);
    }
    const photo = (src, i) => `
      <a class="strip-photo" href="galleries.html" style="animation-delay:${200 + i * 110}ms">
        <img src="${esc(small(src))}" alt="">
      </a>`;
    const signature = HOME.signature
      ? `<img src="${esc(img(HOME.signature))}" alt="${esc(SITE.name)}">`
      : `<span>${esc(SITE.name)}</span>`;
    const sigHTML = `
      <a class="signature${HOME.signature ? " has-logo" : ""}" href="galleries.html" aria-label="View galleries">${signature}</a>
      <span class="strip-break" aria-hidden="true"></span>`;
    strip.innerHTML = sigHTML; // logo first, photos once their shapes are known

    // Find each photo's shape, then lay them out: on each side of the logo,
    // the tall photos sit next to the logo and the wide ones further out.
    const shapeOf = (src) => new Promise((done) => {
      const known = SIZES[img(src)];
      if (known) return done({ src, r: known[0] / known[1] });  // no need to wait for the download
      const im = new Image();
      im.onload = () => done({ src, r: im.naturalWidth / im.naturalHeight || 1 });
      im.onerror = () => done(null);
      im.src = img(src);
    });
    Promise.all(picks.map(shapeOf)).then((list) => {
      list = list.filter(Boolean);
      const tall = list.filter((p) => p.r < 1), wide = list.filter((p) => p.r >= 1);
      const sides = [{ tall: [], wide: [] }, { tall: [], wide: [] }];
      tall.forEach((p, i) => sides[i % 2].tall.push(p));
      wide.forEach((p, i) => sides[i % 2].wide.push(p));

      // Each side: the wide photos stacked on top of each other on the outside,
      // the tall photo next to the logo. Nothing is cropped.
      let n = 0;
      const tile = (p) => { p.i = n; return photo(p.src, n++); };
      const stack = (s) => s.wide.length ? `<div class="strip-stack">${s.wide.map(tile).join("")}</div>` : "";
      const talls = (s) => s.tall.map(tile).join("");
      strip.insertAdjacentHTML("afterbegin", `<div class="strip-side">${stack(sides[0])}${talls(sides[0])}</div>`);
      strip.insertAdjacentHTML("beforeend", `<div class="strip-side">${talls(sides[1])}${stack(sides[1])}</div>`);
      const tiles = [...strip.querySelectorAll(".strip-photo")];
      tiles.forEach((t) => t.classList.add("sized"));

      // Work out the largest height that fits, then size every photo exactly.
      const fit = () => {
        const mobile = window.matchMedia("(max-width: 760px)").matches;
        const g = parseFloat(getComputedStyle(strip).columnGap) || 0;
        const header = document.querySelector("header");
        const hCap = Math.max(200, window.innerHeight - (header ? header.offsetHeight : 0) - (mobile ? 140 : 90));
        const shape = sides.map((s) => {
          const k = s.wide.reduce((sum, p) => sum + 1 / p.r, 0);
          const cols = (s.wide.length ? 1 : 0) + s.tall.length;
          const a = (k ? 1 / k : 0) + s.tall.reduce((sum, p) => sum + p.r, 0);
          const b = (k ? g * (s.wide.length - 1) / k : 0) - g * Math.max(cols - 1, 0);
          return { k, a, b };  // side width = height * a - b
        });
        const sig = strip.querySelector(".signature");
        const avail = strip.clientWidth;
        let heights;
        if (mobile) {
          heights = shape.map((sh) => sh.a ? Math.min((avail + sh.b) / sh.a, hCap) : 0);
        } else {
          const room = avail - sig.offsetWidth - 2 * g;
          const A = shape[0].a + shape[1].a, B = shape[0].b + shape[1].b;
          const H = A ? Math.min((room + B) / A, hCap) : 0;
          heights = [H, H];
        }
        sides.forEach((s, i) => {
          const H = Math.max(heights[i], 60), k = shape[i].k;
          const W = k ? (H - g * (s.wide.length - 1)) / k : 0;
          s.wide.forEach((p) => { tiles[p.i].style.width = W + "px"; tiles[p.i].style.height = W / p.r + "px"; });
          s.tall.forEach((p) => { tiles[p.i].style.width = H * p.r + "px"; tiles[p.i].style.height = H + "px"; });
        });
      };
      fit();
      window.addEventListener("resize", fit);
    });

    // Shrink the name until its longest word fits between the photos.
    const span = strip.querySelector(".signature span");
    if (span) {
      const fitText = () => {
        span.style.fontSize = "";
        const box = span.parentElement;
        const room = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) * 2;
        let size = parseFloat(getComputedStyle(span).fontSize);
        while (span.scrollWidth > room && size > 14) {
          size -= 1;
          span.style.fontSize = size + "px";
        }
      };
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitText);
      window.addEventListener("resize", fitText);
    }
  }


  /* ---------- Galleries: gallery tiles ---------- */
  function renderGalleries(GALLERIES) {
    const grid = document.getElementById("portfolio-grid");
    grid.innerHTML = GALLERIES.map((g, i) => `
      <a class="tile" href="gallery.html?g=${encodeURIComponent(g.slug)}" style="animation-delay:${i * 120}ms">
        <img src="${esc(small(g.cover || g.photos[0]))}" alt="${esc(g.title)}" loading="${i < 4 ? "eager" : "lazy"}">
        <div class="tile-overlay">
          <h2 class="tile-title">${esc(g.title)}</h2>
          <span class="tile-count">${g.photos.length} photograph${g.photos.length === 1 ? "" : "s"}</span>
        </div>
      </a>`).join("");

    // On touch screens there is no hover, so reveal the tile nearest the
    // middle of the screen as the visitor scrolls.
    if (window.matchMedia("(hover: none)").matches && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => e.target.classList.toggle("revealed", e.isIntersecting));
      }, { rootMargin: "-40% 0px -40% 0px" });
      grid.querySelectorAll(".tile").forEach((t) => io.observe(t));
    }
  }

  /* ---------- Single gallery page ---------- */
  function renderGallery(SITE, GALLERIES) {
    const slug = new URLSearchParams(location.search).get("g");
    const index = GALLERIES.findIndex((g) => g.slug === slug);
    const g = GALLERIES[index];
    const head = document.getElementById("gallery-head");
    const wall = document.getElementById("masonry");

    if (!g) {
      head.innerHTML = `<a class="back-link" href="galleries.html">&larr; All galleries</a><h1>Gallery not found</h1>`;
      return;
    }
    document.title = `${g.title} — ${SITE.name}`;
    head.innerHTML = `
      <a class="back-link" href="galleries.html">&larr; All galleries</a>
      <h1>${esc(g.title)}</h1>
      ${g.description ? `<p>${esc(g.description)}</p>` : ""}`;

    wall.innerHTML = g.photos.map((p, i) => `
      <button type="button" data-i="${i}" aria-label="Open photo ${i + 1}">
        <img src="${esc(small(p))}" alt="${esc(g.title + " " + (i + 1))}" loading="lazy"${SIZES[img(p)] ? ` width="${SIZES[img(p)][0]}" height="${SIZES[img(p)][1]}"` : ""}>
      </button>`).join("");
    wall.querySelectorAll("img").forEach((el) => {
      if (el.complete) el.classList.add("loaded");
      else el.addEventListener("load", () => el.classList.add("loaded"));
    });

    if (GALLERIES.length > 1) {
      const prev = GALLERIES[(index - 1 + GALLERIES.length) % GALLERIES.length];
      const next = GALLERIES[(index + 1) % GALLERIES.length];
      document.getElementById("gallery-nav").innerHTML = `
        <a href="gallery.html?g=${encodeURIComponent(prev.slug)}">&larr; ${esc(prev.title)}</a>
        <a href="gallery.html?g=${encodeURIComponent(next.slug)}">${esc(next.title)} &rarr;</a>`;
    }

    setupLightbox(g.photos.map(img), wall);
  }

  function setupLightbox(photos, wall) {
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.innerHTML = `
      <img alt="">
      <button class="lb-btn lb-close" aria-label="Close">&times;</button>
      <button class="lb-btn lb-prev" aria-label="Previous">&#8249;</button>
      <button class="lb-btn lb-next" aria-label="Next">&#8250;</button>
      <div class="lb-counter"></div>`;
    document.body.append(lb);
    const view = lb.querySelector("img");
    const counter = lb.querySelector(".lb-counter");
    let current = 0;

    const show = (i) => {
      current = (i + photos.length) % photos.length;
      view.src = photos[current];
      counter.textContent = `${current + 1} / ${photos.length}`;
    };
    const open = (i) => { show(i); lb.classList.add("open"); document.body.style.overflow = "hidden"; };
    const close = () => { lb.classList.remove("open"); document.body.style.overflow = ""; };

    wall.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-i]");
      if (btn) open(+btn.dataset.i);
    });
    lb.querySelector(".lb-close").onclick = close;
    lb.querySelector(".lb-prev").onclick = () => show(current - 1);
    lb.querySelector(".lb-next").onclick = () => show(current + 1);
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
    let startX = null;
    lb.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- About ---------- */
  function renderAbout(ABOUT) {
    const el = document.getElementById("about");
    const awards = (ABOUT.awards || []).length ? `
      <div class="about-awards">
        <h2>${esc(ABOUT.awardsHeading || "Awards")}</h2>
        <ul class="awards">${ABOUT.awards.map((a) => `
          <li class="award">
            ${a.link
              ? `<a class="award-logo" href="${esc(a.link)}" target="_blank" rel="noopener" aria-label="${esc(a.title || "")} website">${a.logo ? `<img src="${esc(img(a.logo))}" alt="">` : ""}</a>`
              : `<span class="award-logo">${a.logo ? `<img src="${esc(img(a.logo))}" alt="${esc(a.title || "")}">` : ""}</span>`}
            <span class="award-text">
              <span class="award-title">${esc(a.title || "")}</span>
              ${a.details ? `<span class="award-org">${esc(a.details)}</span>` : ""}
            </span>
            ${a.year ? `<span class="award-year">${esc(a.year)}</span>` : ""}
          </li>`).join("")}
        </ul>
      </div>` : "";
    el.innerHTML = `
      ${awards}
      <div class="about-side">
        ${ABOUT.portrait ? `<img class="about-photo" src="${esc(img(ABOUT.portrait))}" alt="Portrait">` : ""}
        ${ABOUT.headline ? `<h1>${esc(ABOUT.headline)}</h1>` : ""}
        ${paragraphs(ABOUT.bio)}
        ${ABOUT.buttonText ? `<a class="button" href="contact.html">${esc(ABOUT.buttonText)}</a>` : ""}
      </div>`;
  }


  /* ---------- Contact ---------- */
  function renderContact(SITE, CONTACT) {
    document.getElementById("contact-intro").innerHTML = `
      <h1>${esc(CONTACT.headline)}</h1>
      ${paragraphs(CONTACT.intro)}
      ${CONTACT.showEmail !== false && SITE.email
        ? `<p>Or email me directly at <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></p>` : ""}
      ${CONTACT.photo ? `<img class="contact-photo" src="${esc(img(CONTACT.photo))}" alt="">` : ""}`;

    const form = document.getElementById("contact-form");
    const select = form.querySelector("#subject");
    const interests = CONTACT.interests || [];
    if (interests.length) select.innerHTML = interests.map((o) => `<option>${esc(o)}</option>`).join("");
    else select.closest(".field").remove();
    form.querySelector("button[type=submit]").textContent = CONTACT.buttonText || "Send message";
    const status = form.querySelector(".form-status");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (data.get("_honey")) return; // spam bot filled the hidden field

      // Messages are emailed to you by Web3Forms (using your access key).
      // Without a key, FormSubmit is used with the email in Site settings.
      const subject = `New message from ${data.get("name")} — ${data.get("subject") || "website"}`;
      let endpoint, body, headers = { Accept: "application/json" };
      if (SITE.web3formsKey) {
        endpoint = "https://api.web3forms.com/submit";
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          access_key: SITE.web3formsKey,
          subject,
          from_name: SITE.name || "Website",
          name: data.get("name"),
          email: data.get("email"),
          "interested in": data.get("subject") || "",
          message: data.get("message"),
          botcheck: "",
        });
      } else if (SITE.formEndpoint || SITE.email) {
        endpoint = SITE.formEndpoint || `https://formsubmit.co/ajax/${encodeURIComponent(SITE.email)}`;
        data.append("_subject", subject);
        data.append("_template", "table");
        data.append("_captcha", "false");
        body = data;
      } else {
        status.className = "form-status err";
        status.textContent = "This form isn't set up yet.";
        return;
      }

      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      status.className = "form-status";
      status.textContent = "Sending…";
      try {
        const res = await fetch(endpoint, { method: "POST", body, headers });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === "false" || json.success === false) {
          // e.g. FormSubmit hasn't been activated yet: say so instead of a vague error.
          console.warn("Contact form:", json.message || res.status);
          if (/activat/i.test(json.message || "")) {
            status.className = "form-status err";
            status.textContent = `This form is still being set up, so your message wasn't delivered. Please email me directly at ${SITE.email}.`;
            return;
          }
          throw new Error();
        }
        form.reset();
        status.className = "form-status ok";
        status.textContent = CONTACT.successMessage || "Thanks — your message has been sent.";
      } catch {
        status.className = "form-status err";
        status.textContent = SITE.email
          ? `Something went wrong. Please email me directly at ${SITE.email}.`
          : "Something went wrong. Please try again later.";
      } finally {
        button.disabled = false;
      }
    });
  }

  /* ---------- Start ---------- */
  async function start() {
    let SITE, data;
    try {
      const names = PAGE_FILES[page] || [];
      const results = await Promise.all(["site", ...names].map(load));
      SITE = results[0];
      data = Object.fromEntries(names.map((n, i) => [n, results[i + 1]]));
    } catch (err) {
      console.error(err);
      document.body.innerHTML = `
        <div style="max-width:560px;margin:15vh auto;padding:0 20px;font-family:system-ui;color:#ddd;line-height:1.6">
          ${err.typo ? `
          <h1 style="font-weight:400">There's a small typo in <b>${esc(err.typo)}</b></h1>
          <p>Open <b>content/${esc(err.typo)}</b> and check what you last changed.
          The usual cause is a missing or extra comma or quote mark, or curly quotes
          (“ ”) where there should be straight ones (").</p>` : `
          <h1 style="font-weight:400">The website couldn't load its content.</h1>
          <p>If you opened this file directly from your computer, double-click
          <b>preview.command</b> in the website folder instead. It opens the site
          the way it will look online.</p>`}
          <p style="color:#888;font-size:14px">${esc(err.message)}</p>
        </div>`;
      return;
    }

    SIZES = (data.galleries && data.galleries.sizes) || {};
    const GALLERIES = ((data.galleries && data.galleries.galleries) || [])
      .filter((g) => g && g.title)
      .map((g) => ({ ...g, slug: slugify(g.title), photos: (g.photos || []).filter(Boolean) }))
      .filter((g) => g.photos.length); // a gallery with no photos yet stays hidden

    renderChrome(SITE);
    if (page === "home") renderHome(SITE, data.home || {}, GALLERIES);
    if (page === "galleries") renderGalleries(GALLERIES);
    if (page === "gallery") renderGallery(SITE, GALLERIES);
    if (page === "about") renderAbout(data.about);
    if (page === "contact") renderContact(SITE, data.contact);
  }

  start();
})();
