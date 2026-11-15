/* Elite Engineerings — site interactions (no dependencies) */
(function () {
  "use strict";

  window.__ee = 1;
  var doc = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Theme: auto (device) → light → dark ---------- */
  var THEMES = ["auto", "light", "dark"];
  var LABELS = { auto: "Auto", light: "Light", dark: "Dark" };
  var DESC = { auto: "auto (follows your device)", light: "light", dark: "dark" };
  function currentTheme() { var t = doc.getAttribute("data-theme"); return t === "light" || t === "dark" ? t : "auto"; }
  function applyTheme(mode) {
    if (mode === "auto") doc.removeAttribute("data-theme"); else doc.setAttribute("data-theme", mode);
    try { if (mode === "auto") localStorage.removeItem("ee-theme"); else localStorage.setItem("ee-theme", mode); } catch (e) {}
    $$(".theme-toggle").forEach(function (b) {
      b.setAttribute("data-mode", mode);
      b.setAttribute("aria-label", "Colour theme: " + DESC[mode] + ". Click to change.");
      var l = $(".tt-label", b); if (l) l.textContent = LABELS[mode];
    });
  }
  applyTheme(currentTheme());
  $$(".theme-toggle").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
      applyTheme(next);
    });
  });

  /* ---------- Header: solid on scroll, hide on scroll down ---------- */
  var header = $(".site-header");
  var lastY = window.scrollY;
  var fab = $(".fab");
  function onScrollHeader() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle("is-solid", y > 24);
      var goingDown = y > lastY && y > 400;
      if (!doc.classList.contains("menu-open")) header.classList.toggle("is-hidden", goingDown);
    }
    if (fab) fab.classList.toggle("show", y > 500);
    lastY = y;
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Mobile menu ---------- */
  var toggle = $(".menu-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = doc.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      header.classList.remove("is-hidden");
    });
    $$(".mobile-menu a").forEach(function (a) {
      a.addEventListener("click", function () { doc.classList.remove("menu-open"); toggle.setAttribute("aria-expanded", "false"); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && doc.classList.contains("menu-open")) { doc.classList.remove("menu-open"); toggle.setAttribute("aria-expanded", "false"); toggle.focus(); }
    });
  }

  /* ---------- Split headings into words ---------- */
  function splitWords(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    var i = 0;
    nodes.forEach(function (node) {
      var parts = node.textContent.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
        var w = document.createElement("span"); w.className = "word";
        var inner = document.createElement("span"); inner.textContent = p;
        inner.style.transitionDelay = (i++ * 0.055).toFixed(3) + "s";
        w.appendChild(inner); frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }
  $$(".split").forEach(splitWords);

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$(".reveal, .split, .line-draw");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Count-up numbers ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var dur = 1600, start = null;
    var fmt = function (n) { return el.hasAttribute("data-plain") ? String(Math.round(n)) : Math.round(n).toLocaleString("en-IN"); };
    if (reduceMotion) { el.textContent = fmt(target); return; }
    function tick(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(target * e);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- Scroll-driven effects (single rAF loop) ---------- */
  var statement = $(".statement");
  var statementWords = [];
  if (statement) {
    var walker = document.createTreeWalker(statement, NodeFilter.SHOW_TEXT, null);
    var tn = []; while (walker.nextNode()) tn.push(walker.currentNode);
    tn.forEach(function (node) {
      var hl = node.parentNode.classList && node.parentNode.classList.contains("hl-src");
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
        var s = document.createElement("span"); s.className = "w" + (hl ? " hl" : ""); s.textContent = p;
        frag.appendChild(s); statementWords.push(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }
  var processEl = $(".process");
  var steps = $$(".step");
  var parallax = $$("[data-parallax]");

  var ticking = false;
  function onScrollFx() {
    ticking = false;
    var vh = window.innerHeight;
    if (statementWords.length) {
      var r = statement.getBoundingClientRect();
      var p = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
      p = Math.max(0, Math.min(1, p));
      var n = reduceMotion ? statementWords.length : Math.round(p * statementWords.length);
      for (var i = 0; i < statementWords.length; i++) statementWords[i].classList.toggle("lit", i < n);
    }
    if (processEl) {
      var pr = processEl.getBoundingClientRect();
      var pp = (vh * 0.75 - pr.top) / (pr.height + vh * 0.1);
      pp = Math.max(0, Math.min(1, pp));
      processEl.style.setProperty("--p", pp.toFixed(3));
      steps.forEach(function (s, idx) { s.classList.toggle("active", pp >= (idx / steps.length) + 0.02 || pp >= 0.98); });
    }
    if (!reduceMotion) {
      parallax.forEach(function (el) {
        var host = el.parentElement.getBoundingClientRect();
        if (host.bottom < 0 || host.top > vh) return;
        var k = parseFloat(el.getAttribute("data-parallax")) || 0.1;
        var c = (host.top + host.height / 2 - vh / 2) * -k;
        el.style.transform = "translate3d(0," + c.toFixed(1) + "px,0) scale(1.12)";
      });
    }
  }
  function requestFx() { if (!ticking) { ticking = true; requestAnimationFrame(onScrollFx); } }
  window.addEventListener("scroll", requestFx, { passive: true });
  window.addEventListener("resize", requestFx);
  onScrollFx();

  /* ---------- Industries hover preview ---------- */
  var preview = $(".ind-preview");
  if (preview && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var imgs = $$("img", preview);
    var px = 0, py = 0, cx = 0, cy = 0, raf = null;
    var follow = function () {
      cx += (px - cx) * 0.18; cy += (py - cy) * 0.18;
      preview.style.left = cx + "px"; preview.style.top = cy + "px";
      raf = Math.abs(px - cx) + Math.abs(py - cy) > 0.5 ? requestAnimationFrame(follow) : null;
    };
    $$(".ind-row").forEach(function (row) {
      row.addEventListener("mouseenter", function (e) {
        var key = row.getAttribute("data-img");
        imgs.forEach(function (im) { im.classList.toggle("on", im.getAttribute("data-key") === key); });
        if (!preview.classList.contains("show")) { cx = px = e.clientX + 170; cy = py = e.clientY; }
        preview.classList.add("show");
      });
      row.addEventListener("mousemove", function (e) {
        px = e.clientX + 170; py = e.clientY;
        if (!raf) raf = requestAnimationFrame(follow);
      });
      row.addEventListener("mouseleave", function () { preview.classList.remove("show"); });
    });
  }

  /* ---------- Testimonials carousel ---------- */
  var track = $(".tst-track");
  if (track) {
    var step = function () { var c = $(".tst", track); return c ? c.getBoundingClientRect().width + 24 : 400; };
    var prev = $("[data-tst='prev']"), next = $("[data-tst='next']");
    if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    if (next) next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }); });
  }

  /* ---------- Hotspots (tap to open on touch) ---------- */
  $$(".hotspot").forEach(function (h) {
    h.addEventListener("click", function (e) {
      e.stopPropagation();
      var was = h.classList.contains("open");
      $$(".hotspot.open").forEach(function (o) { o.classList.remove("open"); });
      if (!was) h.classList.add("open");
    });
  });
  document.addEventListener("click", function () { $$(".hotspot.open").forEach(function (o) { o.classList.remove("open"); }); });

  /* ---------- Video ---------- */
  $$(".video-block").forEach(function (block) {
    var btn = $(".play-btn", block), video = $("video", block);
    if (!btn || !video) return;
    btn.addEventListener("click", function () {
      if (!video.getAttribute("src")) video.setAttribute("src", video.getAttribute("data-src"));
      video.controls = true;
      block.classList.add("playing");
      var p = video.play(); if (p && p.catch) p.catch(function () {});
    });
  });

  /* ---------- Products filter ---------- */
  var filters = $$(".filter");
  if (filters.length) {
    filters.forEach(function (f) {
      f.addEventListener("click", function () {
        var cat = f.getAttribute("data-filter");
        filters.forEach(function (x) { x.classList.toggle("active", x === f); x.setAttribute("aria-pressed", x === f ? "true" : "false"); });
        $$(".prod").forEach(function (p) {
          p.classList.toggle("hide", cat !== "all" && p.getAttribute("data-cat") !== cat);
        });
      });
    });
  }

  /* ---------- Contact / quote form ---------- */
  var form = $("#quote-form");
  if (form) {
    var params = new URLSearchParams(window.location.search);
    var product = params.get("product"), service = params.get("service");
    var msg = form.elements.message, subject = form.elements.subject;
    if (product && msg && !msg.value) {
      msg.value = "Hi, I'd like a quotation for: " + product + ".\n\nQuantity: \nMaterial / grade: \nTarget delivery: ";
      if (subject) subject.value = "Quote request — " + product;
    }
    if (service) {
      $$("input[name='services']", form).forEach(function (c) { if (c.value === service) c.checked = true; });
      if (subject && !subject.value) subject.value = "Enquiry — " + service;
    }

    var status = $(".form-status", form);
    var btn = $("button[type='submit']", form);
    var setStatus = function (cls, text) { status.className = "form-status " + cls; status.textContent = text; };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      var ok = true;
      ["name", "email", "message"].forEach(function (n) {
        var el = form.elements[n]; var f = el.closest(".field");
        var bad = !el.value.trim() || (n === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
        f.classList.toggle("invalid", bad); if (bad && ok) { el.focus(); ok = false; }
      });
      if (!ok) { setStatus("err", "Please fill in your name, a valid email and a short message."); return; }
      if (form.elements.company_website && form.elements.company_website.value) { setStatus("ok", "Thank you — your message has been sent."); form.reset(); return; }

      var services = $$("input[name='services']:checked", form).map(function (c) { return c.value; });
      var lines = [];
      var phone = form.elements.phone && form.elements.phone.value.trim();
      var company = form.elements.company && form.elements.company.value.trim();
      if (company) lines.push("Company: " + company);
      if (phone) lines.push("Phone: " + phone);
      if (services.length) lines.push("Interested in: " + services.join(", "));
      var body = (lines.length ? lines.join("\n") + "\n\n" : "") + form.elements.message.value.trim();
      var subj = (subject && subject.value.trim()) || (services.length ? "Enquiry — " + services.join(", ") : "Website enquiry");

      var data = new URLSearchParams();
      data.append("name", form.elements.name.value.trim());
      data.append("email", form.elements.email.value.trim());
      data.append("subject", subj);
      data.append("message", body);
      if (company) data.append("company", company);
      if (phone) data.append("phone", phone);

      form.classList.add("is-sending"); btn.disabled = true;
      fetch(form.getAttribute("action"), { method: "POST", body: data })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r; })
        .then(function () {
          setStatus("ok", "Thank you — your message is on its way. We usually reply within one working day.");
          form.reset();
        })
        .catch(function () {
          setStatus("err", "Sorry, the message couldn't be sent. Please call +91 99755 57545 or email elitenggs@gmail.com.");
        })
        .then(function () { form.classList.remove("is-sending"); btn.disabled = false; });
    });
    $$("input, textarea", form).forEach(function (el) {
      el.addEventListener("input", function () { var f = el.closest(".field"); if (f) f.classList.remove("invalid"); });
    });
  }

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
