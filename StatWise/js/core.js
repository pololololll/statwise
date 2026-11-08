/* ==========================================================
   STATWISE — CORE (loaded in <head>, runs before the page paints)
   1. Theme  (light / dark, remembered, follows system by default)
   2. Accounts + session (stored in this browser only)
   3. Analysis history (per account, stored in this browser only)
   4. Page guard (redirects to login.html when signed out)
   ========================================================== */

(function () {
    "use strict";

    const KEYS = {
        theme: "statwise.theme",
        users: "statwise.users",
        session: "statwise.session",
        history: "statwise.history.",      // + account key
        restore: "statwise.restore"
    };

    /* ---------- safe storage (private mode / blocked storage) ---------- */

    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) { return fallback; }
    }

    function write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (e) { return false; }
    }

    function drop(key) {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }

    /* ---------- 1. THEME ---------- */

    const theme = {
        get() {
            let saved = null;
            try { saved = localStorage.getItem(KEYS.theme); } catch (e) { /* ignore */ }
            if (saved === "light" || saved === "dark") return saved;
            return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark" : "light";
        },
        apply(mode) {
            document.documentElement.setAttribute("data-theme", mode);
            document.dispatchEvent(new CustomEvent("themechange", { detail: mode }));
        },
        set(mode) {
            try { localStorage.setItem(KEYS.theme, mode); } catch (e) { /* ignore */ }
            theme.apply(mode);
        },
        toggle() {
            theme.set(theme.get() === "dark" ? "light" : "dark");
        }
    };

    document.documentElement.setAttribute("data-theme", theme.get());

    /* ---------- 2. ACCOUNTS ---------- */

    function randomSalt() {
        const bytes = new Uint8Array(16);
        (window.crypto || window.msCrypto).getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    }

    async function hashPassword(password, salt) {
        const text = salt + ":" + password;

        if (window.crypto && window.crypto.subtle) {
            const data = new TextEncoder().encode(text);
            const digest = await window.crypto.subtle.digest("SHA-256", data);
            return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
        }

        // Fallback for very old browsers / insecure contexts (not cryptographic).
        let h = 5381;
        for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
        return "x" + (h >>> 0).toString(16);
    }

    function normalizeEmail(email) {
        return String(email || "").trim().toLowerCase();
    }

    const auth = {
        isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
        },

        async signUp(name, email, password) {
            name = String(name || "").trim();
            email = normalizeEmail(email);

            if (name.length < 2) throw new Error("Please enter your name.");
            if (!auth.isValidEmail(email)) throw new Error("Please enter a valid email address.");
            if (String(password).length < 6) throw new Error("Password must be at least 6 characters.");

            const users = read(KEYS.users, {});
            if (users[email]) throw new Error("An account with this email already exists. Try logging in.");

            const salt = randomSalt();
            users[email] = {
                name, email, salt,
                hash: await hashPassword(password, salt),
                created: new Date().toISOString()
            };

            if (!write(KEYS.users, users)) {
                throw new Error("Your browser is blocking storage, so the account could not be saved.");
            }

            write(KEYS.session, { type: "user", email });
            return users[email];
        },

        async logIn(email, password) {
            email = normalizeEmail(email);
            const users = read(KEYS.users, {});
            const user = users[email];

            if (!user) throw new Error("No account found for that email. Sign up first.");

            const attempt = await hashPassword(password, user.salt);
            if (attempt !== user.hash) throw new Error("Incorrect password. Please try again.");

            write(KEYS.session, { type: "user", email });
            return user;
        },

        guest() {
            write(KEYS.session, { type: "guest" });
        },

        logOut() {
            drop(KEYS.session);
        },

        // Returns { name, email, guest, key } or null when signed out.
        current() {
            const session = read(KEYS.session, null);
            if (!session) return null;

            if (session.type === "guest") {
                return { name: "Guest", email: "Guest session", guest: true, key: "guest" };
            }

            const user = read(KEYS.users, {})[session.email];
            if (!user) return null;

            return { name: user.name, email: user.email, guest: false, key: user.email };
        }
    };

    /* ---------- 3. HISTORY ---------- */

    const MAX_HISTORY = 100;

    function historyKey() {
        const me = auth.current();
        return KEYS.history + (me ? me.key : "guest");
    }

    const history = {
        list() {
            return read(historyKey(), []);
        },

        get(id) {
            return history.list().find(item => item.id === id) || null;
        },

        // entry: { type, title, summary, input, result }
        add(entry) {
            const items = history.list();
            const record = Object.assign({
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                time: new Date().toISOString()
            }, entry);

            items.unshift(record);
            write(historyKey(), items.slice(0, MAX_HISTORY));
            return record;
        },

        remove(id) {
            write(historyKey(), history.list().filter(item => item.id !== id));
        },

        clear() {
            drop(historyKey());
        },

        // Lets the history page hand an entry back to a tool page.
        stageRestore(id) {
            try { sessionStorage.setItem(KEYS.restore, id); } catch (e) { /* ignore */ }
        },

        takeRestore(type) {
            let id = null;
            try { id = sessionStorage.getItem(KEYS.restore); } catch (e) { /* ignore */ }
            if (!id) return null;

            const item = history.get(id);
            if (!item || item.type !== type) return null;

            try { sessionStorage.removeItem(KEYS.restore); } catch (e) { /* ignore */ }
            return item;
        }
    };

    /* ---------- 4. PAGE GUARD ---------- */

    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const isLoginPage = page === "login.html";
    const signedIn = !!auth.current();

    if (!isLoginPage && !signedIn) {
        location.replace("login.html");
    } else if (isLoginPage && signedIn) {
        location.replace("index.html");
    }

    window.StatWise = { theme, auth, history, page };
})();
