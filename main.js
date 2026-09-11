/* KARAVAAN 2027 — site behaviour */
(function () {
  "use strict";

  /* ---------- nav ---------- */
  const nav = document.querySelector(".nav");
  const navToggle = document.querySelector(".nav__toggle");
  const navLinks = document.querySelectorAll(".nav__links a, .nav__mobile a");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  }, { passive: true });

  if (navToggle) {
    navToggle.addEventListener("click", () => nav.classList.toggle("is-open"));
  }
  navLinks.forEach((a) =>
    a.addEventListener("click", () => nav.classList.remove("is-open"))
  );

  const sections = document.querySelectorAll("main section[id]");
  if ("IntersectionObserver" in window && sections.length) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((a) => {
              a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`);
            });
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => obs.observe(s));
  }

  /* ---------- countdown ---------- */
  const festStart = new Date("2027-01-23T00:00:00+05:30").getTime();
  const els = {
    d: document.getElementById("cd-days"),
    h: document.getElementById("cd-hours"),
    m: document.getElementById("cd-mins"),
    s: document.getElementById("cd-secs"),
  };
  function tickCountdown() {
    const diff = festStart - Date.now();
    if (diff <= 0) {
      Object.values(els).forEach((el) => el && (el.textContent = "00"));
      return;
    }
    const pad = (n) => String(n).padStart(2, "0");
    if (els.d) els.d.textContent = pad(Math.floor(diff / 86400000));
    if (els.h) els.h.textContent = pad(Math.floor((diff / 3600000) % 24));
    if (els.m) els.m.textContent = pad(Math.floor((diff / 60000) % 60));
    if (els.s) els.s.textContent = pad(Math.floor((diff / 1000) % 60));
  }
  if (els.d) {
    tickCountdown();
    setInterval(tickCountdown, 1000);
  }

  /* ---------- schedule ---------- */
  const tabsEl = document.getElementById("dayTabs");
  const panelsEl = document.getElementById("dayPanels");
  const searchEl = document.getElementById("scheduleSearch");

  if (tabsEl && panelsEl && window.SCHEDULE) {
    const fmtDate = (iso) => {
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    };

    // Build tabs
    tabsEl.innerHTML = SCHEDULE.map(
      (day, i) => `
      <button class="day-tab${i === 0 ? " active" : ""}" data-day="${day.id}" type="button">
        ${day.label}
        <span class="n">${fmtDate(day.date)} · ${day.day.slice(0, 3)}</span>
      </button>`
    ).join("");

    function eventCard(ev) {
      if (ev.transition) {
        return `
          <div class="tl-item is-transition">
            <div class="tl-card">
              <div class="tl-time">${ev.time}</div>
              <div class="tl-title">${ev.title}</div>
            </div>
          </div>`;
      }
      const parts = ev.parts
        ? `<div class="tl-parts">${ev.parts
            .map(
              (p) => `
              <div class="tl-part">
                <span class="tl-part__time">${p.time}</span>
                <span class="tl-part__label">${p.label}</span>
                <span class="tl-part__venue">— ${p.venue}</span>
              </div>`
            )
            .join("")}</div>`
        : "";
      const desc = ev.desc ? `<p class="tl-desc">${ev.desc}</p>` : "";
      const note = ev.note ? `<span class="tl-note">${ev.note}</span>` : "";
      return `
        <div class="tl-item">
          <div class="tl-card">
            <div class="tl-time">${ev.time}</div>
            <h4 class="tl-title">${ev.title}</h4>
            <div class="tl-meta">
              ${ev.organiser ? `<span><b>Organised by</b> ${ev.organiser}</span>` : ""}
              ${ev.venue ? `<span><b>Venue</b> ${ev.venue}</span>` : ""}
            </div>
            ${desc}
            ${parts}
            ${note}
          </div>
        </div>`;
    }

    // Build panels
    panelsEl.innerHTML = SCHEDULE.map(
      (day, i) => `
      <div class="day-panel${i === 0 ? " active" : ""}" data-day="${day.id}">
        <div class="day-panel__head">
          <h3>${day.label} — ${day.day}</h3>
          <span>${new Date(day.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
        <div class="timeline">${day.events.map(eventCard).join("")}</div>
      </div>`
    ).join("");

    const allTabs = () => Array.from(tabsEl.querySelectorAll(".day-tab"));
    const allPanels = () => Array.from(panelsEl.querySelectorAll(".day-panel"));

    tabsEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".day-tab");
      if (!btn) return;
      if (searchEl) searchEl.value = "";
      panelsEl.classList.remove("is-searching");
      allTabs().forEach((t) => t.classList.toggle("active", t === btn));
      allPanels().forEach((p) => p.classList.toggle("active", p.dataset.day === btn.dataset.day));
    });

    // Simple text search across all days — flattens into a single result list
    if (searchEl) {
      const resultsEl = document.createElement("div");
      resultsEl.className = "day-panel";
      resultsEl.id = "searchResults";
      panelsEl.appendChild(resultsEl);

      searchEl.addEventListener("input", () => {
        const q = searchEl.value.trim().toLowerCase();
        if (!q) {
          panelsEl.classList.remove("is-searching");
          resultsEl.classList.remove("active");
          const activeTab = tabsEl.querySelector(".day-tab.active") || allTabs()[0];
          allPanels().forEach((p) => p.classList.toggle("active", p.dataset.day === activeTab.dataset.day));
          return;
        }
        panelsEl.classList.add("is-searching");
        allTabs().forEach((t) => t.classList.remove("active"));
        allPanels().forEach((p) => p.classList.remove("active"));

        const matches = [];
        SCHEDULE.forEach((day) => {
          day.events.forEach((ev) => {
            const hay = [ev.title, ev.organiser, ev.venue, ev.desc].filter(Boolean).join(" ").toLowerCase();
            const partHay = (ev.parts || []).map((p) => `${p.label} ${p.venue}`).join(" ").toLowerCase();
            if (hay.includes(q) || partHay.includes(q)) {
              matches.push({ day, ev });
            }
          });
        });

        resultsEl.innerHTML = matches.length
          ? `<div class="timeline">${matches
              .map(
                (m) => `
              <div style="margin-bottom:6px;font-family:var(--display);font-size:.72rem;color:var(--muted-2);letter-spacing:.08em;text-transform:uppercase;">${m.day.label} · ${fmtDate(m.day.date)}</div>
              ${eventCard(m.ev)}`
              )
              .join("")}</div>`
          : `<div class="sched-empty">No events match “${searchEl.value}”. Try a different day, club or venue.</div>`;
        resultsEl.classList.add("active");
      });
    }
  }

  /* ---------- print ---------- */
  const printBtn = document.getElementById("printSchedule");
  if (printBtn) printBtn.addEventListener("click", () => window.print());

})();
