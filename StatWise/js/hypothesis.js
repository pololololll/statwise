
/* =========================================
   STATWISE - HYPOTHESIS TESTING
   Automatic Statistic, Critical Value,
   Decision, and Distribution Curve
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const SW = window.StatWise;

    const form = $("hypothesisForm");
    const testType = $("testType");
    const sample2Section = $("sample2Section");
    const resultsCard = $("resultsCard");
    const formError = $("formError");

    let currentResult = null;

    const fields = {
        mean1: $("mean1"),
        mu0: $("mu0"),
        sd1: $("sd1"),
        n1: $("n1"),
        mean2: $("mean2"),
        sd2: $("sd2"),
        n2: $("n2")
    };

    function isTwoSample() {
        return testType.value.startsWith("two");
    }

    function isTTest() {
        return testType.value.endsWith("T");
    }

    function formatNumber(value, digits = 4) {
        if (!Number.isFinite(value)) return "N/A";
        return Number(value.toFixed(digits)).toString();
    }

    function readNumber(field, label) {
        if (field.value.trim() === "") {
            throw new Error(`Please enter ${label}.`);
        }

        const value = Number(field.value);

        if (!Number.isFinite(value)) {
            throw new Error(`Please enter a valid value for ${label}.`);
        }

        return value;
    }

    function positiveNumber(field, label) {
        const value = readNumber(field, label);

        if (value <= 0) {
            throw new Error(`${label} must be greater than zero.`);
        }

        return value;
    }

    function readSampleSize(field, label) {
        const value = positiveNumber(field, label);

        if (!Number.isInteger(value)) {
            throw new Error(`${label} must be a whole number.`);
        }

        return value;
    }

    function updateTestFields() {
        const twoSample = isTwoSample();
        const tTest = isTTest();

        sample2Section.hidden = !twoSample;

        fields.mean2.required = twoSample;
        fields.sd2.required = twoSample;
        fields.n2.required = twoSample;

        fields.mean2.disabled = !twoSample;
        fields.sd2.disabled = !twoSample;
        fields.n2.disabled = !twoSample;

        $("mu0Label").textContent = twoSample
            ? "Hypothesized Difference (μ₁ − μ₂)"
            : "Hypothesized Mean (μ₀)";

        $("sd1Label").textContent = tTest
            ? "Sample Standard Deviation (s₁)"
            : "Population Standard Deviation (σ₁)";

        $("sd2Label").textContent = tTest
            ? "Sample Standard Deviation (s₂)"
            : "Population Standard Deviation (σ₂)";

        const hint = $("dfHint");

        if (tTest) {
            hint.hidden = false;
            hint.innerHTML = twoSample
                ? "<strong>Degrees of freedom:</strong> df = min(n₁ − 1, n₂ − 1) — the smaller of the two sample df is used."
                : "<strong>Degrees of freedom:</strong> df = n − 1.";
        } else {
            hint.hidden = true;
        }

        currentResult = null;
        resultsCard.hidden = true;
        formError.hidden = true;
    }

    /* -----------------------------------------
       GAMMA AND BETA FUNCTIONS FOR T-DISTRIBUTION
    ----------------------------------------- */

    function logGamma(z) {
        const coefficients = [
            676.5203681218851,
            -1259.1392167224028,
            771.3234287776531,
            -176.6150291621406,
            12.507343278686905,
            -0.13857109526572012,
            9.984369578019572e-6,
            1.5056327351493116e-7
        ];

        if (z < 0.5) {
            return Math.log(Math.PI)
                - Math.log(Math.sin(Math.PI * z))
                - logGamma(1 - z);
        }

        z -= 1;

        let x = 0.9999999999998099;

        for (let i = 0; i < coefficients.length; i++) {
            x += coefficients[i] / (z + i + 1);
        }

        const t = z + coefficients.length - 0.5;

        return 0.5 * Math.log(2 * Math.PI)
            + (z + 0.5) * Math.log(t)
            - t + Math.log(x);
    }

    function betaContinuedFraction(a, b, x) {
        const maxIterations = 300;
        const epsilon = 3e-14;
        const tiny = 1e-300;

        const qab = a + b;
        const qap = a + 1;
        const qam = a - 1;

        let c = 1;
        let d = 1 - qab * x / qap;

        if (Math.abs(d) < tiny) d = tiny;

        d = 1 / d;
        let h = d;

        for (let m = 1; m <= maxIterations; m++) {
            const m2 = 2 * m;

            let aa = m * (b - m) * x /
                ((qam + m2) * (a + m2));

            d = 1 + aa * d;
            if (Math.abs(d) < tiny) d = tiny;

            c = 1 + aa / c;
            if (Math.abs(c) < tiny) c = tiny;

            d = 1 / d;
            h *= d * c;

            aa = -(a + m) * (qab + m) * x /
                ((a + m2) * (qap + m2));

            d = 1 + aa * d;
            if (Math.abs(d) < tiny) d = tiny;

            c = 1 + aa / c;
            if (Math.abs(c) < tiny) c = tiny;

            d = 1 / d;

            const delta = d * c;
            h *= delta;

            if (Math.abs(delta - 1) < epsilon) break;
        }

        return h;
    }

    function regularizedBeta(x, a, b) {
        if (x <= 0) return 0;
        if (x >= 1) return 1;

        const factor = Math.exp(
            logGamma(a + b) -
            logGamma(a) -
            logGamma(b) +
            a * Math.log(x) +
            b * Math.log1p(-x)
        );

        if (x < (a + 1) / (a + b + 2)) {
            return factor * betaContinuedFraction(a, b, x) / a;
        }

        return 1 - factor *
            betaContinuedFraction(b, a, 1 - x) / b;
    }

    /* -----------------------------------------
       DISTRIBUTION FUNCTIONS
    ----------------------------------------- */

    // Standard normal cumulative distribution function.
    // Uses a numerical approximation.
    function normalCDF(z) {
        const x = Math.abs(z);
        const t = 1 / (1 + 0.2316419 * x);

        const density =
            0.3989422804014327 * Math.exp(-x * x / 2);

        const polynomial = t * (
            0.319381530 +
            t * (
                -0.356563782 +
                t * (
                    1.781477937 +
                    t * (
                        -1.821255978 +
                        t * 1.330274429
                    )
                )
            )
        );

        const upperTail = density * polynomial;

        return z >= 0 ? 1 - upperTail : upperTail;
    }

    // Student's t cumulative distribution function.
    function studentTCDF(t, df) {
        if (!(df > 0) || !Number.isFinite(t)) {
            throw new Error("Invalid t-distribution parameters.");
        }

        if (t === 0) return 0.5;

        const x = df / (df + t * t);
        const beta = regularizedBeta(x, df / 2, 0.5);

        return t > 0 ? 1 - beta / 2 : beta / 2;
    }

    // Numerically invert a CDF to find its critical value.
    function inverseCDF(probability, cdf) {
        if (!(probability > 0 && probability < 1)) {
            throw new Error("Invalid probability for critical value.");
        }

        let low = -10;
        let high = 10;

        while (cdf(low) > probability) {
            low *= 2;

            if (Math.abs(low) > 1e12) {
                throw new Error("Could not calculate critical value.");
            }
        }

        while (cdf(high) < probability) {
            high *= 2;

            if (Math.abs(high) > 1e12) {
                throw new Error("Could not calculate critical value.");
            }
        }

        for (let i = 0; i < 160; i++) {
            const mid = (low + high) / 2;

            if (cdf(mid) < probability) {
                low = mid;
            } else {
                high = mid;
            }
        }

        return (low + high) / 2;
    }

    // Degrees of freedom (Module 9 rules)
    //   one-sample t-test: df = n - 1
    //   two-sample t-test: df = min(n1 - 1, n2 - 1)  (the smaller sample's df)
    function calculateDegreesOfFreedom(n1, n2) {
        if (n2 === undefined) return n1 - 1;
        return Math.min(n1 - 1, n2 - 1);
    }

    /* -----------------------------------------
       CALCULATE TEST STATISTIC
    ----------------------------------------- */

    function calculateStatistic() {
        const twoSample = isTwoSample();
        const tTest = isTTest();

        const mean1 = readNumber(fields.mean1, "the sample mean");
        const nullValue = readNumber(
            fields.mu0,
            twoSample
                ? "the hypothesized difference"
                : "the hypothesized mean"
        );

        const sd1 = positiveNumber(
            fields.sd1,
            "the standard deviation for Sample 1"
        );

        const n1 = readSampleSize(fields.n1, "Sample 1 size");

        if (tTest && n1 < 2) {
            throw new Error("A one-sample t-test needs at least 2 observations.");
        }

        let statistic;
        let df = null;

        if (!twoSample) {
            statistic = (mean1 - nullValue) /
                (sd1 / Math.sqrt(n1));

            if (tTest) {
                df = calculateDegreesOfFreedom(n1);
            }
        } else {
            const mean2 = readNumber(fields.mean2, "the Sample 2 mean");
            const sd2 = positiveNumber(
                fields.sd2,
                "the standard deviation for Sample 2"
            );
            const n2 = readSampleSize(fields.n2, "Sample 2 size");

            if (tTest && n2 < 2) {
                throw new Error("A two-sample t-test needs at least 2 observations in each sample.");
            }

            const standardError = Math.sqrt(
                sd1 * sd1 / n1 +
                sd2 * sd2 / n2
            );

            statistic = (mean1 - mean2 - nullValue) / standardError;

            if (tTest) {
                df = calculateDegreesOfFreedom(n1, n2);
            }
        }

        if (!Number.isFinite(statistic)) {
            throw new Error("Unable to calculate the test statistic. Check your inputs.");
        }

        return {
            statistic,
            df,
            tTest,
            twoSample,
            alpha: Number($("alpha").value),
            tail: $("tail").value,
            type: testType.value,
            inputs: collectInputs(twoSample)
        };
    }

    /* -----------------------------------------
       AUTOMATIC CRITICAL VALUE
    ----------------------------------------- */

    function calculateCriticalValue(result) {
        let probability;

        if (result.tail === "two") {
            probability = 1 - result.alpha / 2;
        } else if (result.tail === "right") {
            probability = 1 - result.alpha;
        } else {
            probability = result.alpha;
        }

        const cdf = result.tTest
            ? value => studentTCDF(value, result.df)
            : normalCDF;

        return inverseCDF(probability, cdf);
    }

    function describeRejectionRegion(result) {
        const c = Math.abs(result.criticalValue);

        if (result.tail === "two") {
            return `Below −${formatNumber(c)} or above +${formatNumber(c)}`;
        }

        if (result.tail === "right") {
            return `Above ${formatNumber(c)}`;
        }

        return `Below −${formatNumber(c)}`;
    }

    /* -----------------------------------------
       AUTOMATIC DECISION
    ----------------------------------------- */

    function makeDecision(result) {
        const statistic = result.statistic;
        const critical = result.criticalValue;

        if (result.tail === "two") {
            return Math.abs(statistic) > critical;
        }

        if (result.tail === "right") {
            return statistic > critical;
        }

        return statistic < critical;
    }

    function showDecision(result) {
        const output = $("decisionOutput");
        const title = $("decisionTitle");
        const explanation = $("decisionExplanation");

        const reject = makeDecision(result);
        const statistic = formatNumber(result.statistic);
        const critical = formatNumber(Math.abs(result.criticalValue));

        output.hidden = false;
        output.classList.toggle("reject", reject);

        title.textContent = reject
            ? "Reject the Null Hypothesis"
            : "Fail to reject the Null Hypothesis";

        explanation.textContent = reject
            ? `The test statistic (${statistic}) falls in the rejection region. The critical value is ${critical}, with α = ${result.alpha}. There is sufficient evidence against the null hypothesis under the selected test.`
            : `The test statistic (${statistic}) does not fall in the rejection region. The critical value is ${critical}, with α = ${result.alpha}. There is insufficient evidence to reject the null hypothesis under the selected test.`;
    }

    /* -----------------------------------------
       BELL CURVE DRAWING
    ----------------------------------------- */

    function distributionDensity(x, result) {
        if (!result.tTest) {
            return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
        }

        const df = result.df;

        return Math.exp(
            logGamma((df + 1) / 2) -
            logGamma(df / 2) -
            0.5 * Math.log(df * Math.PI) -
            ((df + 1) / 2) * Math.log1p(x * x / df)
        );
    }

    function drawBellCurve(result) {
        const svg = $("bellCurve");
        const description = $("bellCurveDescription");

        const W = 700;
        const H = 300;
        const left = 45;
        const right = 665;
        const baseline = 235;
        const top = 35;
        const range = 4.2;
        const critical = Math.abs(result.criticalValue);
        const statistic = result.statistic;

        const points = [];
        const count = 320;

        for (let i = 0; i <= count; i++) {
            const x = -range + (2 * range * i / count);

            points.push({
                x,
                y: distributionDensity(x, result)
            });
        }

        const maxDensity = Math.max(...points.map(point => point.y));

        function px(x) {
            return left + ((x + range) / (2 * range)) * (right - left);
        }

        function py(y) {
            return baseline - (y / maxDensity) * (baseline - top);
        }

        function curvePath() {
            return points.map((point, index) =>
                `${index === 0 ? "M" : "L"} ${px(point.x).toFixed(2)} ${py(point.y).toFixed(2)}`
            ).join(" ");
        }

        function areaPath(from, to) {
            const visible = points.filter(
                point => point.x >= from && point.x <= to
            );

            if (visible.length < 2) return "";

            return `M ${px(visible[0].x)} ${baseline} ` +
                visible.map(point =>
                    `L ${px(point.x).toFixed(2)} ${py(point.y).toFixed(2)}`
                ).join(" ") +
                ` L ${px(visible[visible.length - 1].x)} ${baseline} Z`;
        }

        const fillPath = (from, to) =>
            `<path class="reject-fill" d="${areaPath(from, to)}"/>`;

        let shadedRegions = "";

        if (result.tail === "two") {
            shadedRegions = fillPath(-range, -critical) + fillPath(critical, range);
        } else if (result.tail === "right") {
            shadedRegions = fillPath(critical, range);
        } else {
            shadedRegions = fillPath(-range, -critical);
        }

        const criticalMarker = (value, label) => `
            <line class="reject-line" x1="${px(value)}" y1="${baseline}"
                  x2="${px(value)}" y2="${py(distributionDensity(value, result))}"/>
            <text class="reject-label" x="${px(value)}" y="${baseline - 12}"
                  text-anchor="middle">${label}</text>`;

        let criticalLines = "";

        if (result.tail === "two") {
            criticalLines =
                criticalMarker(-critical, `−${critical.toFixed(2)}`) +
                criticalMarker(critical, `+${critical.toFixed(2)}`);
        } else {
            const signed = result.tail === "right" ? critical : -critical;
            criticalLines = criticalMarker(signed, signed.toFixed(2));
        }

        const ticks = [-4, -3, -2, -1, 0, 1, 2, 3, 4]
            .map(value => `
                <line class="axis" x1="${px(value)}" y1="${baseline}"
                      x2="${px(value)}" y2="${baseline + 5}"/>
                <text x="${px(value)}" y="${baseline + 24}"
                      text-anchor="middle">${value}</text>
            `).join("");

        const visibleStatistic = Math.max(-range, Math.min(range, statistic));

        const statX = px(visibleStatistic);
        const statY = py(distributionDensity(visibleStatistic, result));

        const statLabelY = Math.max(top + 12, statY - 14);
        const statLabelX = Math.max(left + 45, Math.min(right - 45, statX));

        svg.innerHTML = `
            <line class="axis" x1="${left}" y1="${baseline}" x2="${right}" y2="${baseline}"/>

            ${shadedRegions}

            <path class="curve" d="${curvePath()}"/>

            ${criticalLines}

            <line class="stat-line" x1="${statX}" y1="${baseline}" x2="${statX}" y2="${statY}"/>
            <circle class="stat-dot" cx="${statX}" cy="${statY}" r="5.5"/>

            <text class="stat-label" x="${statLabelX}" y="${statLabelY}"
                  text-anchor="middle">Test statistic</text>

            ${ticks}

            <text class="axis-title" x="${W / 2}" y="${H - 10}"
                  text-anchor="middle">Standardized test statistic</text>
        `;

        description.textContent =
            `${result.tTest ? "Student's t-distribution" : "Standard normal distribution"} · ` +
            `Critical value: ${result.tail === "two" ? "±" : ""}${critical.toFixed(4)} · ` +
            `Test statistic: ${result.statistic.toFixed(4)}`;
    }

    function describeDf(result) {
        if (!result.tTest) return "Z-test: uses the normal curve";

        if (!result.twoSample) {
            return `df = n − 1 = ${result.inputs.n1} − 1`;
        }

        return `df = min(n₁ − 1, n₂ − 1) = min(${result.inputs.n1 - 1}, ${result.inputs.n2 - 1})`;
    }

    function collectInputs(twoSample) {
        const inputs = {
            mean1: Number(fields.mean1.value),
            mu0: Number(fields.mu0.value),
            sd1: Number(fields.sd1.value),
            n1: Number(fields.n1.value)
        };

        if (twoSample) {
            inputs.mean2 = Number(fields.mean2.value);
            inputs.sd2 = Number(fields.sd2.value);
            inputs.n2 = Number(fields.n2.value);
        }

        return inputs;
    }

    const TEST_NAMES = {
        oneZ: "One-Sample Z-Test",
        twoZ: "Two-Sample Z-Test",
        oneT: "One-Sample t-Test",
        twoT: "Two-Sample t-Test"
    };

    const TAIL_NAMES = {
        two: "Two-tailed (≠)",
        right: "Right-tailed (>)",
        left: "Left-tailed (<)"
    };

    function saveToHistory(result) {
        const reject = makeDecision(result);
        const critical = formatNumber(Math.abs(result.criticalValue));

        SW.history.add({
            type: "hypothesis",
            title: TEST_NAMES[result.type],
            summary: `${result.tTest ? "t" : "z"} = ${formatNumber(result.statistic)}  ·  ` +
                `critical ${result.tail === "two" ? "±" : ""}${critical}  ·  ` +
                (reject ? "Reject H₀" : "Fail to reject H₀"),
            input: Object.assign({
                test: result.type,
                alpha: result.alpha,
                tail: result.tail,
                tailName: TAIL_NAMES[result.tail]
            }, result.inputs),
            result: {
                statistic: result.statistic,
                criticalValue: result.criticalValue,
                df: result.df,
                dfFormula: describeDf(result),
                rejectionRegion: describeRejectionRegion(result),
                confidence: (1 - result.alpha) * 100,
                reject,
                decision: reject ? "Reject the Null Hypothesis" : "Fail to reject the Null Hypothesis"
            }
        });
    }

    /* -----------------------------------------
       SAMPLE DATA
    ----------------------------------------- */

    // Illustrative values; they change with the selected test.
    const SAMPLES = {
        oneZ: { mean1: 75, mu0: 70, sd1: 10, n1: 36 },
        twoZ: { mean1: 78, mu0: 0, sd1: 10, n1: 40, mean2: 74, sd2: 12, n2: 45 },
        oneT: { mean1: 53.8, mu0: 50, sd1: 6.4, n1: 16 },
        twoT: { mean1: 82.4, mu0: 0, sd1: 6.1, n1: 12, mean2: 76.9, sd2: 7.3, n2: 15 }
    };

    function fillFields(values) {
        Object.keys(fields).forEach(key => {
            fields[key].value = values[key] === undefined ? "" : values[key];
        });
    }

    /* -----------------------------------------
       DISPLAY ALL RESULTS
    ----------------------------------------- */

    function displayResults(result) {
        $("testStatistic").textContent = formatNumber(result.statistic);

        $("resultAlpha").textContent = result.alpha.toFixed(2);

        $("confidenceLevel").textContent =
            `${((1 - result.alpha) * 100).toFixed(0)}%`;

        $("degreesFreedom").textContent =
            result.df === null
                ? "Not applicable"
                : formatNumber(result.df, 0);

        $("dfFormula").textContent = describeDf(result);

        $("resultStatus").textContent =
            result.tTest ? "t-test calculated" : "Z-test calculated";

        $("criticalValueDisplay").textContent =
            result.tail === "two"
                ? `±${formatNumber(Math.abs(result.criticalValue))}`
                : formatNumber(result.criticalValue);

        $("rejectionRegionDisplay").textContent =
            describeRejectionRegion(result);

        resultsCard.hidden = false;

        // Automatically make the decision and draw the curve.
        showDecision(result);
        drawBellCurve(result);

        formError.hidden = true;

        resultsCard.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    /* -----------------------------------------
       FORM EVENTS
    ----------------------------------------- */

    testType.addEventListener("change", updateTestFields);

    $("alpha").addEventListener("change", () => {
        currentResult = null;
        resultsCard.hidden = true;
    });

    $("tail").addEventListener("change", () => {
        currentResult = null;
        resultsCard.hidden = true;
    });

    form.addEventListener("submit", event => {
        event.preventDefault();

        try {
            currentResult = calculateStatistic();

            currentResult.criticalValue =
                calculateCriticalValue(currentResult);

            displayResults(currentResult);
            saveToHistory(currentResult);
        } catch (error) {
            formError.textContent = error.message;
            formError.hidden = false;
            resultsCard.hidden = true;
        }
    });

    form.addEventListener("reset", () => {
        currentResult = null;

        setTimeout(() => {
            resultsCard.hidden = true;
            formError.hidden = true;
            updateTestFields();
        }, 0);
    });

    $("loadSample").addEventListener("click", () => {
        fillFields(SAMPLES[testType.value]);
        currentResult = null;
        resultsCard.hidden = true;
        formError.hidden = true;
        fields.mean1.focus({ preventScroll: true });
    });

    updateTestFields();

    // Re-open an analysis chosen from the History page
    const restored = SW.history.takeRestore("hypothesis");

    if (restored) {
        const input = restored.input;

        testType.value = input.test;
        $("alpha").value = Number(input.alpha).toFixed(2);
        $("tail").value = input.tail;
        updateTestFields();
        fillFields(input);

        try {
            currentResult = calculateStatistic();
            currentResult.criticalValue = calculateCriticalValue(currentResult);
            displayResults(currentResult);
        } catch (error) {
            formError.textContent = error.message;
            formError.hidden = false;
        }
    }
});

