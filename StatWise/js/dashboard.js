/* ==========================================================
   STATWISE — DASHBOARD
   Every number here is calculated from the signed-in
   account's saved analysis history.
   ========================================================== */

(function () {
    "use strict";

    const SW = window.StatWise;
    const me = SW.auth.current();
    if (!me) return;

    const $ = id => document.getElementById(id);

    // Fill icon slots
    document.querySelectorAll("[data-icon]").forEach(el => {
        el.innerHTML = SW.icons[el.dataset.icon] || "";
    });

    /* Greeting */
    const hour = new Date().getHours();
    const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    const first = me.guest ? "" : ", " + me.name.split(" ")[0];
    $("greeting").textContent = `Good ${part}${first}!`;

    /* Stats */
    const items = SW.history.list();
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;

    function setStat(valueId, deltaId, subset) {
        const week = subset.filter(i => new Date(i.time).getTime() >= weekAgo).length;
        $(valueId).textContent = subset.length;

        const delta = $(deltaId);
        if (week > 0) {
            delta.textContent = `+${week} this week`;
            delta.classList.remove("flat");
        } else {
            delta.textContent = subset.length ? "None this week" : "Nothing yet";
            delta.classList.add("flat");
        }
    }

    setStat("statTotal", "statTotalDelta", items);
    setStat("statRegression", "statRegressionDelta", items.filter(i => i.type === "regression"));
    setStat("statHypothesis", "statHypothesisDelta", items.filter(i => i.type === "hypothesis"));

    /* Activity chart: analyses per day, last 7 days */
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        days.push(d);
    }

    const counts = days.map(day => {
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        return items.filter(item => {
            const t = new Date(item.time).getTime();
            return t >= day.getTime() && t < next.getTime();
        }).length;
    });

    const labels = days.map(d => d.toLocaleDateString("en-US", { weekday: "short" }));

    function drawActivity() {
        SWCharts.activity($("activityChart"), { labels, values: counts });
    }

    function init() {
        drawActivity();
        const total = counts.reduce((a, b) => a + b, 0);
        $("activityCaption").textContent = total
            ? `${total} ${total === 1 ? "analysis" : "analyses"} in the last 7 days.`
            : "Run an analysis and your activity will appear here.";
    }

    // charts.js is deferred; wait until both scripts have run.
    if (window.SWCharts) init();
    else window.addEventListener("load", init);

    /* Recent analyses */
    const recent = $("recentList");

    if (!items.length) {
        recent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">∑</div>
                <h3>No analyses yet</h3>
                <p>Your completed analyses will be saved here automatically.</p>
            </div>`;
    } else {
        recent.innerHTML = items.slice(0, 4).map(item => `
            <a class="recent-item" href="history.html#${SW.escapeHtml(item.id)}">
                <span class="card-icon">${SW.icons[item.type]}</span>
                <span class="grow">
                    <strong>${SW.escapeHtml(item.title)}</strong>
                    <small>${SW.escapeHtml(item.summary)}</small>
                </span>
            </a>`).join("");
    }
})();
