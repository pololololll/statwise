/* ==========================================================
   STATWISE — SVG CHARTS (no external libraries)
   Colours come from CSS variables, so charts follow light/dark
   mode automatically. Used by the regression page and history.
   ========================================================== */

(function () {
    "use strict";

    function niceStep(range, targetTicks) {
        const rough = range / Math.max(1, targetTicks);
        const pow = Math.pow(10, Math.floor(Math.log10(rough)));
        const frac = rough / pow;
        const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
        return nice * pow;
    }

    function niceScale(min, max, targetTicks) {
        if (min === max) { min -= 1; max += 1; }
        const step = niceStep(max - min, targetTicks);
        const lo = Math.floor(min / step) * step;
        const hi = Math.ceil(max / step) * step;
        const ticks = [];
        for (let v = lo; v <= hi + step / 2; v += step) {
            ticks.push(Number(v.toPrecision(12)));
        }
        return { lo, hi, ticks };
    }

    function fmt(v) {
        if (!Number.isFinite(v)) return "—";
        return Number(v.toFixed(4)).toLocaleString("en-US", { maximumFractionDigits: 4 });
    }

    function esc(text) {
        return String(text).replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    /**
     * Scatter plot with a least-squares line.
     * options: { data:[{x,y}], intercept, slope, compact:boolean,
     *            xLabel:string, yLabel:string }   (labels are optional)
     */
    function scatter(container, options) {
        const { data, intercept, slope } = options;
        const compact = !!options.compact;
        const xLabel = esc(options.xLabel || "X — Independent variable");
        const yLabel = esc(options.yLabel || "Y — Dependent variable");

        const W = compact ? 620 : 860;
        const H = compact ? 320 : 440;
        const m = { top: 20, right: 28, bottom: compact ? 58 : 70, left: compact ? 62 : 78 };

        const xs = data.map(p => p.x);
        const ys = data.map(p => p.y);
        const fitAt = x => intercept + slope * x;

        const xScale = niceScale(Math.min(...xs), Math.max(...xs), compact ? 5 : 7);
        const yMin = Math.min(...ys, fitAt(xScale.lo), fitAt(xScale.hi));
        const yMax = Math.max(...ys, fitAt(xScale.lo), fitAt(xScale.hi));
        const yScale = niceScale(yMin, yMax, compact ? 5 : 7);

        const px = x => m.left + (x - xScale.lo) / (xScale.hi - xScale.lo) * (W - m.left - m.right);
        const py = y => H - m.bottom - (y - yScale.lo) / (yScale.hi - yScale.lo) * (H - m.top - m.bottom);

        const grid = yScale.ticks.map(v => `
            <line class="grid" x1="${m.left}" x2="${W - m.right}" y1="${py(v)}" y2="${py(v)}"/>
            <text x="${m.left - 12}" y="${py(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join("");

        const xTicks = xScale.ticks.map(v => `
            <line class="axis" x1="${px(v)}" x2="${px(v)}" y1="${H - m.bottom}" y2="${H - m.bottom + 6}"/>
            <text x="${px(v)}" y="${H - m.bottom + 26}" text-anchor="middle">${fmt(v)}</text>`).join("");

        const points = data.map((p, i) => `
            <circle class="pt" cx="${px(p.x)}" cy="${py(p.y)}" r="${compact ? 6 : 7}">
                <title>Point ${i + 1}: (${fmt(p.x)}, ${fmt(p.y)})</title>
            </circle>`).join("");

        container.innerHTML = `
            <svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img"
                 aria-label="Scatter plot of ${data.length} data points with the least-squares regression line">
                ${grid}
                <line class="axis" x1="${m.left}" x2="${W - m.right}" y1="${H - m.bottom}" y2="${H - m.bottom}"/>
                <line class="axis" x1="${m.left}" x2="${m.left}" y1="${m.top}" y2="${H - m.bottom}"/>
                ${xTicks}
                <line class="fit" x1="${px(xScale.lo)}" y1="${py(fitAt(xScale.lo))}"
                      x2="${px(xScale.hi)}" y2="${py(fitAt(xScale.hi))}"/>
                ${points}
                <text class="axis-title" x="${(m.left + W - m.right) / 2}" y="${H - 10}" text-anchor="middle">${xLabel}</text>
                <text class="axis-title" transform="translate(16 ${(m.top + H - m.bottom) / 2}) rotate(-90)" text-anchor="middle">${yLabel}</text>
            </svg>`;
    }

    /**
     * Small line/area chart for the dashboard activity card.
     * options: { labels:[..], values:[..] }
     */
    function activity(container, options) {
        const { labels, values } = options;
        const W = 720, H = 260;
        const m = { top: 24, right: 24, bottom: 44, left: 44 };

        const top = Math.max(4, Math.ceil(Math.max(...values) / 2) * 2);
        const px = i => m.left + i / (values.length - 1) * (W - m.left - m.right);
        const py = v => H - m.bottom - v / top * (H - m.top - m.bottom);

        const ticks = [0, top / 4, top / 2, top * 3 / 4, top].map(v => Math.round(v * 10) / 10);

        const line = values.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");
        const area = `${line} L${px(values.length - 1)} ${py(0)} L${px(0)} ${py(0)} Z`;

        container.innerHTML = `
            <svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img"
                 aria-label="Analyses completed per day over the last ${values.length} days">
                <defs>
                    <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--chart-line)" stop-opacity=".35"/>
                        <stop offset="100%" stop-color="var(--chart-line)" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                ${ticks.map(v => `
                    <line class="grid" x1="${m.left}" x2="${W - m.right}" y1="${py(v)}" y2="${py(v)}"/>
                    <text x="${m.left - 10}" y="${py(v) + 4}" text-anchor="end">${v}</text>`).join("")}
                <path d="${area}" fill="url(#actFill)"/>
                <path class="curve" d="${line}"/>
                ${values.map((v, i) => `
                    <circle class="pt" cx="${px(i)}" cy="${py(v)}" r="5">
                        <title>${labels[i]}: ${v} ${v === 1 ? "analysis" : "analyses"}</title>
                    </circle>
                    <text x="${px(i)}" y="${H - 14}" text-anchor="middle">${labels[i]}</text>`).join("")}
            </svg>`;
    }

    window.SWCharts = { scatter, activity, fmt };
})();