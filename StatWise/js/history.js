/* ==========================================================
   STATWISE — ANALYSIS HISTORY
   Each record is a row. Selecting a row expands its full
   details directly underneath it (accordion style).
   ========================================================== */

(function () {
    "use strict";

    const SW = window.StatWise;
    if (!SW.auth.current()) return;

    const esc = SW.escapeHtml;
    const list = document.getElementById("historyList");
    const clearButton = document.getElementById("clearHistory");

    let filter = "all";
    let openId = null;

    const num = (v, digits = 4) =>
        Number.isFinite(v) ? Number(v.toFixed(digits)).toLocaleString("en-US", { maximumFractionDigits: digits }) : "—";

    function formatTime(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
            " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }

    /* ---------- detail renderers ---------- */

    function kv(rows) {
        return `<dl class="kv-list">${rows.map(([k, v]) =>
            `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
    }

    function regressionDetail(item) {
        const r = item.result;
        const xName = item.input.xName || "X";
        const yName = item.input.yName || "Y";
        const rows = item.input.data.map((p, i) =>
            `<tr><td>${i + 1}</td><td>${num(p.x)}</td><td>${num(p.y)}</td></tr>`).join("");

        return `
            <div class="detail-grid">
                <div>
                    <h4>Results</h4>
                    ${kv([
                        ...(item.input.xName || item.input.yName
                            ? [["Variables", `X = ${xName}, Y = ${yName}`]] : []),
                        ["Equation", r.equation],
                        ["Slope (B)", num(r.slope)],
                        ["Y-intercept (A)", num(r.intercept)],
                        ["Correlation (r)", r.correlation === null ? "Undefined" : num(r.correlation)],
                        ["R² (r squared)", r.rSquared === null ? "Undefined" : num(r.rSquared)],
                        ["Strength", r.strength],
                        ["Data pairs (n)", r.n]
                    ])}
                    <h4>Interpretation</h4>
                    <p>${esc(r.interpretation)}</p>
                </div>

                <div>
                    <h4>Scatter plot</h4>
                    <div data-plot="${esc(item.id)}"></div>

                    <h4>Paired data</h4>
                    <div class="detail-pairs">
                        <table class="data-table">
                            <thead><tr><th>#</th><th>${esc(xName)}</th><th>${esc(yName)}</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    function hypothesisDetail(item) {
        const i = item.input;
        const r = item.result;
        const two = i.test.startsWith("two");
        const t = i.test.endsWith("T");
        const sdSym = t ? "s" : "σ";

        const sample1 = [
            ["Sample mean (x̄₁)", num(i.mean1)],
            [`${t ? "Sample" : "Population"} std. dev. (${sdSym}₁)`, num(i.sd1)],
            ["Sample size (n₁)", num(i.n1, 0)]
        ];

        const sample2 = two ? [
            ["Sample mean (x̄₂)", num(i.mean2)],
            [`${t ? "Sample" : "Population"} std. dev. (${sdSym}₂)`, num(i.sd2)],
            ["Sample size (n₂)", num(i.n2, 0)]
        ] : [];

        return `
            <div class="detail-grid">
                <div>
                    <h4>Inputs</h4>
                    ${kv([
                        ["Test", item.title],
                        ["Significance level (α)", num(i.alpha, 2)],
                        ["Alternative", i.tailName],
                        [two ? "Hypothesized difference (μ₁ − μ₂)" : "Hypothesized mean (μ₀)", num(i.mu0)],
                        ...sample1,
                        ...sample2
                    ])}
                </div>

                <div>
                    <h4>Results</h4>
                    ${kv([
                        ["Test statistic", num(r.statistic)],
                        ["Critical value", `${i.tail === "two" ? "±" : ""}${num(Math.abs(r.criticalValue))}`],
                        ["Confidence level", `${num(r.confidence, 0)}%`],
                        ["Degrees of freedom", r.df === null ? "Not applicable (Z-test)" : `${num(r.df, 0)}  (${r.dfFormula})`],
                        ["Rejection region", r.rejectionRegion]
                    ])}
                    <div class="detail-decision${r.reject ? " reject" : ""}">${esc(r.decision)}</div>
                </div>
            </div>`;
    }

    function itemHtml(item) {
        const open = item.id === openId;
        const detail = item.type === "regression" ? regressionDetail(item) : hypothesisDetail(item);

        return `
            <article class="history-item${open ? " open" : ""}" id="${esc(item.id)}">
                <button type="button" class="history-row" aria-expanded="${open}"
                        aria-controls="detail-${esc(item.id)}" data-toggle="${esc(item.id)}">
                    <span class="card-icon">${SW.icons[item.type]}</span>
                    <span class="grow">
                        <strong>${esc(item.title)}</strong>
                        <span class="summary">${esc(item.summary)}</span>
                        <small>${esc(formatTime(item.time))}</small>
                    </span>
                    <svg class="icon chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
                </button>

                ${open ? `
                <div class="history-detail" id="detail-${esc(item.id)}">
                    ${detail}
                    <div class="detail-actions">
                        <button type="button" class="btn btn-secondary btn-sm" data-reopen="${esc(item.id)}">Open in ${item.type === "regression" ? "Regression" : "Hypothesis"} tool</button>
                        <button type="button" class="btn btn-danger btn-sm" data-delete="${esc(item.id)}">Delete record</button>
                    </div>
                </div>` : ""}
            </article>`;
    }

    function render() {
        const all = SW.history.list();
        const items = filter === "all" ? all : all.filter(i => i.type === filter);

        clearButton.hidden = all.length === 0;

        if (!items.length) {
            list.innerHTML = `
                <div class="card empty-state">
                    <div class="empty-icon">∑</div>
                    <h3>${all.length ? "No records in this filter" : "No analyses yet"}</h3>
                    <p>${all.length
                        ? "Try a different filter."
                        : "Run a regression or a hypothesis test and it will be saved here automatically."}</p>
                    ${all.length ? "" : `
                        <a class="btn btn-primary" href="regression.html">Open regression tool</a>`}
                </div>`;
            return;
        }

        list.innerHTML = items.map(itemHtml).join("");

        // Draw scatter plot for the open regression record
        const open = items.find(i => i.id === openId && i.type === "regression");
        if (open) {
            const box = list.querySelector(`[data-plot="${open.id}"]`);
            if (box && window.SWCharts) {
                SWCharts.scatter(box, {
                    data: open.input.data,
                    intercept: open.result.intercept,
                    slope: open.result.slope,
                    xLabel: open.input.xName,
                    yLabel: open.input.yName,
                    compact: true
                });
            }
        }
    }

    /* ---------- events ---------- */

    list.addEventListener("click", event => {
        const toggle = event.target.closest("[data-toggle]");
        const reopen = event.target.closest("[data-reopen]");
        const remove = event.target.closest("[data-delete]");

        if (toggle) {
            const id = toggle.dataset.toggle;
            openId = openId === id ? null : id;
            render();

            if (openId) {
                const el = document.getElementById(openId);
                if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        }

        if (reopen) {
            const item = SW.history.get(reopen.dataset.reopen);
            if (!item) return;
            SW.history.stageRestore(item.id);
            location.href = item.type === "regression" ? "regression.html" : "hypothesis.html";
        }

        if (remove) {
            if (!confirm("Delete this record from your history?")) return;
            SW.history.remove(remove.dataset.delete);
            openId = null;
            render();
        }
    });

    document.querySelectorAll("[data-filter]").forEach(button => {
        button.addEventListener("click", () => {
            filter = button.dataset.filter;
            openId = null;
            document.querySelectorAll("[data-filter]").forEach(b =>
                b.setAttribute("aria-pressed", String(b === button)));
            render();
        });
    });

    clearButton.addEventListener("click", () => {
        if (!confirm("Delete ALL saved analyses? This cannot be undone.")) return;
        SW.history.clear();
        openId = null;
        render();
    });

    // Deep link from the dashboard: history.html#<id>
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash && SW.history.get(hash)) openId = hash;

    render();

    if (openId) {
        const el = document.getElementById(openId);
        if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 50);
    }
})();