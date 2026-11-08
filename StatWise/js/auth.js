/* ==========================================================
   STATWISE — LOGIN / SIGN UP PAGE
   ========================================================== */

(function () {
    "use strict";

    const SW = window.StatWise;
    const $ = id => document.getElementById(id);

    const loginForm = $("loginForm");
    const signupForm = $("signupForm");
    const tabLogin = $("tabLogin");
    const tabSignup = $("tabSignup");
    const switchLine = $("switchLine");

    function showTab(which) {
        const login = which === "login";

        loginForm.hidden = !login;
        signupForm.hidden = login;

        tabLogin.setAttribute("aria-selected", String(login));
        tabSignup.setAttribute("aria-selected", String(!login));

        switchLine.innerHTML = login
            ? `Don't have an account? <button type="button" id="switchButton">Sign up</button>`
            : `Already have an account? <button type="button" id="switchButton">Log in</button>`;

        $("switchButton").addEventListener("click", () => showTab(login ? "signup" : "login"));

        $("loginError").hidden = true;
        $("signupError").hidden = true;
    }

    tabLogin.addEventListener("click", () => showTab("login"));
    tabSignup.addEventListener("click", () => showTab("signup"));
    $("switchButton").addEventListener("click", () => showTab("signup"));

    // Show / hide password
    document.querySelectorAll("[data-toggle-pw]").forEach(button => {
        button.addEventListener("click", () => {
            const input = $(button.dataset.togglePw);
            const show = input.type === "password";
            input.type = show ? "text" : "password";
            button.setAttribute("aria-label", show ? "Hide password" : "Show password");
        });
    });

    function showError(id, message) {
        const el = $(id);
        el.textContent = message;
        el.hidden = false;
    }

    function done() {
        location.href = "index.html";
    }

    loginForm.addEventListener("submit", async event => {
        event.preventDefault();
        $("loginError").hidden = true;

        const email = $("loginEmail").value;
        const password = $("loginPassword").value;

        if (!email.trim() || !password) {
            showError("loginError", "Enter your email and password.");
            return;
        }

        try {
            await SW.auth.logIn(email, password);
            done();
        } catch (error) {
            showError("loginError", error.message);
        }
    });

    signupForm.addEventListener("submit", async event => {
        event.preventDefault();
        $("signupError").hidden = true;

        const password = $("signupPassword").value;

        if (password !== $("signupConfirm").value) {
            showError("signupError", "The two passwords do not match.");
            return;
        }

        try {
            await SW.auth.signUp($("signupName").value, $("signupEmail").value, password);
            done();
        } catch (error) {
            showError("signupError", error.message);
        }
    });

    $("guestButton").addEventListener("click", () => {
        SW.auth.guest();
        done();
    });

    // Logo images swap with the theme
    SW.syncThemeImages = function () {
        const dark = document.documentElement.getAttribute("data-theme") === "dark";
        document.querySelectorAll("img.theme-img").forEach(img => {
            img.src = dark ? img.dataset.dark : img.dataset.light;
        });
    };
    SW.syncThemeImages();
    document.addEventListener("themechange", SW.syncThemeImages);
})();
