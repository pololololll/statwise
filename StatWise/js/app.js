/* ==========================================================
   STATWISE — APP SHELL
   Renders the shared sidebar + top bar on every signed-in page
   so navigation only has to be edited in ONE place (NAV below).
   Each page declares itself on <body>:
     data-nav="regression"   which sidebar link is active
     data-section="Workspace" / data-title="Linear Regression"  breadcrumb
   ========================================================== */

(function () {
    "use strict";

    const SW = window.StatWise;
    if (!SW) return;

    /* ---------- icons (inline SVG, inherit text colour) ---------- */

    const svg = inner =>
        `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;

    const ICONS = {
        dashboard: svg('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
        regression: svg('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>'),
        hypothesis: svg('<path d="M2 18c3 0 4-12 10-12s7 12 10 12"/><path d="M2 21h20"/>'),
        history: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'),
        book: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
        info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>'),
        sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
        moon: svg('<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>'),
        menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
        logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>')
    };

    SW.icons = ICONS;
    SW.svg = svg;

    const NAV = [
        {
            heading: "WORKSPACE",
            items: [
                { key: "dashboard", href: "index.html", icon: "dashboard", label: "Dashboard" },
                { key: "regression", href: "regression.html", icon: "regression", label: "Linear Regression" },
                { key: "hypothesis", href: "hypothesis.html", icon: "hypothesis", label: "Hypothesis Testing" },
                { key: "history", href: "history.html", icon: "history", label: "Analysis History" }
            ]
        },
        {
            heading: "LEARN",
            items: [
                { key: "module7", href: "module7.html", icon: "book", label: "Module 7" },
                { key: "module9", href: "module9.html", icon: "book", label: "Module 9" },
                { key: "about", href: "about.html", icon: "info", label: "About StatWise" }
            ]
        }
    ];

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => (
            { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
        ));
    }
    SW.escapeHtml = escapeHtml;

    function initials(name) {
        const parts = String(name).trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "?";
        const first = parts[0][0];
        const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
        return (first + last).toUpperCase();
    }
    SW.initials = initials;

    /* ---------- theme toggle (works on every page, incl. login) ---------- */

    function themeToggleHtml() {
        return `<button type="button" class="icon-button theme-toggle" data-theme-toggle
                    aria-label="Switch between light and dark mode" title="Light / dark mode">
                    <span class="i-moon">${ICONS.moon}</span><span class="i-sun">${ICONS.sun}</span>
                </button>`;
    }
    SW.themeToggleHtml = themeToggleHtml;

    document.addEventListener("click", event => {
        if (event.target.closest("[data-theme-toggle]")) SW.theme.toggle();
    });

    /* ---------- shell ---------- */

    const me = SW.auth.current();
    const body = document.body;
    if (!me) return;                         // login page, or redirecting

    const activeKey = body.dataset.nav;
    const sidebar = document.getElementById("sidebar");
    const topbar = document.getElementById("topbar");

    if (sidebar) {
        sidebar.innerHTML = `
            <a href="index.html" class="brand" aria-label="StatWise dashboard">
                <img class="brand-mark theme-img" data-light="assets/logo-mark-light.png"
                     data-dark="assets/logo-mark-dark.png" src="assets/logo-mark-light.png" alt="">
                <span class="brand-name">StatWise</span>
            </a>
            ${NAV.map(group => `
                <p class="nav-heading">${group.heading}</p>
                <nav class="navigation" aria-label="${group.heading.toLowerCase()}">
                    ${group.items.map(item => `
                        <a href="${item.href}" class="nav-link${item.key === activeKey ? " active" : ""}"
                           ${item.key === activeKey ? 'aria-current="page"' : ""}>
                            ${ICONS[item.icon]}<span>${item.label}</span>
                        </a>`).join("")}
                </nav>`).join("")}
            <div class="sidebar-foot">
                <strong>Analyze · Understand · Decide</strong>
                <span>Statistics made clear.</span>
            </div>`;
    }

    if (topbar) {
        const section = body.dataset.section || "Workspace";
        const title = body.dataset.title || document.title.split("|")[0].trim();

        topbar.innerHTML = `
            <div style="display:flex;align-items:center;gap:14px;min-width:0">
                <button type="button" id="menuToggle" class="menu-toggle"
                        aria-label="Toggle navigation" aria-expanded="false">${ICONS.menu}</button>
                <div class="breadcrumb">
                    <span class="crumb-section" style="margin:0">${escapeHtml(section)}</span>
                    <span class="crumb-sep">/</span><strong>${escapeHtml(title)}</strong>
                </div>
            </div>
            <div class="topbar-right">
                ${themeToggleHtml()}
                <div class="user-menu">
                    <button type="button" class="user-button" id="userButton"
                            aria-haspopup="true" aria-expanded="false">
                        <span class="avatar">${escapeHtml(initials(me.name))}</span>
                        <span class="user-name">${escapeHtml(me.name.split(" ")[0])}</span>
                    </button>
                    <div class="user-dropdown" id="userDropdown" hidden>
                        <div class="who"><strong>${escapeHtml(me.name)}</strong>
                            <span>${escapeHtml(me.email)}</span></div>
                        <button type="button" id="logoutButton">${ICONS.logout} Log out</button>
                    </div>
                </div>
            </div>`;
    }

    /* icon slots: <span data-icon="regression"></span> */
    document.querySelectorAll("[data-icon]").forEach(el => {
        el.innerHTML = ICONS[el.dataset.icon] || "";
    });

    /* theme-aware images (logo) */
    function syncThemeImages() {
        const dark = document.documentElement.getAttribute("data-theme") === "dark";
        document.querySelectorAll("img.theme-img").forEach(img => {
            img.src = dark ? img.dataset.dark : img.dataset.light;
        });
    }
    syncThemeImages();
    document.addEventListener("themechange", syncThemeImages);
    SW.syncThemeImages = syncThemeImages;

    /* ---------- mobile sidebar ---------- */

    const overlay = document.getElementById("sidebarOverlay");
    const menuToggle = document.getElementById("menuToggle");

    function setSidebarOpen(open) {
        if (!sidebar || !menuToggle || !overlay) return;
        sidebar.classList.toggle("open", open);
        overlay.classList.toggle("show", open);
        menuToggle.setAttribute("aria-expanded", String(open));
    }

    if (menuToggle) menuToggle.addEventListener("click", () => setSidebarOpen(!sidebar.classList.contains("open")));
    if (overlay) overlay.addEventListener("click", () => setSidebarOpen(false));

    /* ---------- user menu ---------- */

    const userButton = document.getElementById("userButton");
    const userDropdown = document.getElementById("userDropdown");

    function setMenuOpen(open) {
        if (!userButton || !userDropdown) return;
        userDropdown.hidden = !open;
        userButton.setAttribute("aria-expanded", String(open));
    }

    if (userButton) {
        userButton.addEventListener("click", event => {
            event.stopPropagation();
            setMenuOpen(userDropdown.hidden);
        });
    }

    document.addEventListener("click", event => {
        if (userDropdown && !userDropdown.contains(event.target)) setMenuOpen(false);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") { setSidebarOpen(false); setMenuOpen(false); }
    });

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            SW.auth.logOut();
            location.href = "login.html";
        });
    }

    /* ---------- footer year ---------- */

    document.querySelectorAll("[data-year]").forEach(el => {
        el.textContent = new Date().getFullYear();
    });
})();
