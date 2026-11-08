
/* ========================================
   STATWISE - LINEAR REGRESSION
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const dataRows = document.getElementById("dataRows");
    const addRowButton = document.getElementById("addRow");
    const clearButton = document.getElementById("clearData");
    const sampleButton = document.getElementById("loadSample");
    const calculateButton = document.getElementById("calculateRegression");
    const errorMessage = document.getElementById("errorMessage");

    const emptyResults = document.getElementById("emptyResults");
    const resultsContent = document.getElementById("resultsContent");
    const resultStatus = document.getElementById("resultStatus");

    let regression = null;
    const chartBox = document.getElementById("regressionChart");
    const tableScroll = document.getElementById("tableScroll");
    const scrollHint = document.getElementById("scrollHint");
    const SW = window.StatWise;

    const xNameInput = document.getElementById("xName");
    const yNameInput = document.getElementById("yName");
    const xHead = document.getElementById("xHead");
    const yHead = document.getElementById("yHead");
    const insightEmpty = document.getElementById("insightEmpty");
    const insightContent = document.getElementById("insightContent");

    const numberFormat = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 4
    });

    function formatNumber(value) {
        if (!Number.isFinite(value)) return "—";
        return numberFormat.format(value);
    }

    // Names typed by the user; fall back to plain X / Y when left blank.
    function names() {
        return {
            x: xNameInput.value.trim() || "X",
            y: yNameInput.value.trim() || "Y"
        };
    }

    // Keep everything that shows a variable name in sync with the two name fields.
    function applyNames() {
        const n = names();
        const xTyped = xNameInput.value.trim();
        const yTyped = yNameInput.value.trim();

        xHead.textContent = xTyped || "X Value";
        yHead.textContent = yTyped || "Y Value";

        dataRows.querySelectorAll(".x-input").forEach(input =>
            input.setAttribute("aria-label", `${n.x} value`));
        dataRows.querySelectorAll(".y-input").forEach(input =>
            input.setAttribute("aria-label", `${n.y} value`));

        document.getElementById("predictLabel").textContent = `${n.x} (X)`;
        document.getElementById("predictX").placeholder = `Enter ${n.x}`;
        document.getElementById("predictionHint").textContent =
            `Enter a value of ${n.x} to estimate ${n.y}.`;
        document.querySelector(".prediction-card h3").textContent = `Predict ${n.y}`;

        if (regression) {
            document.getElementById("interpretationResult").textContent =
                interpret(regression);
            renderChart(regression);
        }
    }

    function createRow(x = "", y = "") {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td></td>
            <td>
                <input type="number" step="any"
                    class="x-input" aria-label="X value" placeholder="Enter X">
            </td>
            <td>
                <input type="number" step="any"
                    class="y-input" aria-label="Y value" placeholder="Enter Y">
            </td>
            <td>
                <button type="button" class="remove-row"
                    aria-label="Remove row" title="Remove row">×</button>
            </td>
        `;

        row.querySelector(".x-input").value = x;
        row.querySelector(".y-input").value = y;

        dataRows.appendChild(row);
        updateRowNumbers();
        applyRowLabels(row);
        return row;
    }

    function applyRowLabels(row) {
        const n = names();
        row.querySelector(".x-input").setAttribute("aria-label", `${n.x} value`);
        row.querySelector(".y-input").setAttribute("aria-label", `${n.y} value`);
    }

    function updateRowNumbers() {
        [...dataRows.rows].forEach((row, index) => {
            row.cells[0].textContent = index + 1;
        });

        // The table shows 5 rows and scrolls after that.
        scrollHint.hidden = dataRows.rows.length <= 5;
    }

    function resetResults() {
        regression = null;

        emptyResults.hidden = false;
        emptyResults.style.display = "";

        resultsContent.hidden = true;
        resultsContent.style.display = "none";

        resultStatus.textContent = "Waiting for data";
        resultStatus.classList.remove("ready");

        insightEmpty.hidden = false;
        insightContent.hidden = true;

        document.getElementById("chartCaption").textContent =
            "Calculate a regression model to display your chart.";

        chartBox.innerHTML =
            '<div class="chart-empty">Your chart will appear here after you calculate.</div>';
    }

    function getData() {
        const rows = [...dataRows.querySelectorAll("tr")];
        const data = [];

        for (let i = 0; i < rows.length; i++) {
            const xInput = rows[i].querySelector(".x-input");
            const yInput = rows[i].querySelector(".y-input");

            const xText = xInput.value.trim();
            const yText = yInput.value.trim();

            // Ignore a row only when both fields are empty.
            if (xText === "" && yText === "") continue;

            // Reject incomplete pairs instead of silently ignoring them.
            if (xText === "" || yText === "") {
                throw new Error(
                    `Row ${i + 1} is incomplete. Enter both X and Y values.`
                );
            }

            const x = Number(xText);
            const y = Number(yText);

            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                throw new Error(`Row ${i + 1} contains an invalid number.`);
            }

            data.push({ x, y });
        }

        if (data.length < 3) {
            throw new Error("Please enter at least three complete data pairs.");
        }

        return data;
    }

    function calculate(data) {
        const n = data.length;

        const meanX = data.reduce((sum, point) => sum + point.x, 0) / n;
        const meanY = data.reduce((sum, point) => sum + point.y, 0) / n;

        const sxx = data.reduce(
            (sum, point) => sum + (point.x - meanX) ** 2, 0
        );

        const syy = data.reduce(
            (sum, point) => sum + (point.y - meanY) ** 2, 0
        );

        const sxy = data.reduce(
            (sum, point) =>
                sum + (point.x - meanX) * (point.y - meanY), 0
        );

        if (sxx === 0) {
            throw new Error(
                "All X values are identical. Regression cannot be calculated."
            );
        }

        const slope = sxy / sxx;
        const intercept = meanY - slope * meanX;

        const correlation = syy === 0
            ? null
            : Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));

        const predictions = data.map(point => ({
            x: point.x,
            y: intercept + slope * point.x
        }));

        const residualSumSquares = data.reduce(
            (sum, point) =>
                sum + (point.y - (intercept + slope * point.x)) ** 2,
            0
        );

        // R² = 1 - SSE / SST. If Y is constant, SST is zero,
        // so R² is undefined by this formula.
        const rSquared = syy === 0
            ? null
            : 1 - residualSumSquares / syy;

        return {
            data,
            n,
            meanX,
            meanY,
            slope,
            intercept,
            correlation,
            rSquared,
            predictions
        };
    }

    function buildEquation(intercept, slope) {
        const sign = slope < 0 ? "−" : "+";

        return `y′ = ${formatNumber(intercept)} ${sign} ${
            formatNumber(Math.abs(slope))
        }x`;
    }

    // Short, plain-language interpretation using the user's variable names.
    function interpret(result) {
        const { slope, correlation } = result;
        const n = names();
        let message;

        if (slope > 0) {
            message = `For every 1-unit increase in ${n.x}, ${n.y} is predicted to increase by ${formatNumber(slope)}.`;
        } else if (slope < 0) {
            message = `For every 1-unit increase in ${n.x}, ${n.y} is predicted to decrease by ${formatNumber(Math.abs(slope))}.`;
        } else {
            message = `${n.y} is predicted to stay the same as ${n.x} changes.`;
        }

        if (correlation === null) {
            message += ` The correlation cannot be computed because ${n.y} does not vary.`;
        } else {
            const label = strengthLabel(correlation).toLowerCase();
            message += ` ${n.x} and ${n.y} show a ${label} correlation (r = ${formatNumber(correlation)}).`;
        }

        return message;
    }

    function renderRelationship(result) {
        const r = result.correlation;
        const directionElement = document.getElementById("relationshipDirection");
        const strengthElement = document.getElementById("relationshipStrength");
        const titleElement = document.getElementById("relationshipTitle");
        const iconElement = document.getElementById("relationshipIcon");
        const markerElement = document.getElementById("relationshipMarker");
        const descriptionElement = document.getElementById("relationshipDescription");

        directionElement.className = "relationship-badge";
        strengthElement.className = "relationship-badge strength-badge";
        titleElement.textContent = "Strength and Direction of Correlation";

        if (r === null) {
            directionElement.textContent = "Correlation Undefined";
            directionElement.classList.add("neutral");
            strengthElement.textContent = "Cannot Determine";
            strengthElement.classList.add("neutral");
            iconElement.textContent = "—";
            markerElement.style.left = "50%";
            descriptionElement.textContent =
                "Pearson's correlation coefficient is undefined because all Y values are identical.";
            return;
        }

        const magnitude = Math.abs(r);
        let strength;

        // Module 7: Rule of thumb for interpreting size of correlation coefficient.
        if (magnitude >= 0.90) strength = "Very high";
        else if (magnitude >= 0.70) strength = "High";
        else if (magnitude >= 0.50) strength = "Moderate";
        else if (magnitude >= 0.30) strength = "Low";
        else strength = "Negligible";

        if (r > 0) {
            directionElement.textContent = "Positive Relationship";
            iconElement.textContent = "↗";
        } else if (r < 0) {
            directionElement.textContent = "Negative Relationship";
            directionElement.classList.add("negative");
            iconElement.textContent = "↘";
        } else {
            directionElement.textContent = "Zero Correlation";
            directionElement.classList.add("neutral");
            iconElement.textContent = "↔";
        }

        strengthElement.textContent = `${strength} Correlation`;
        if (magnitude < 0.30) strengthElement.classList.add("neutral");

        markerElement.style.left = `${((r + 1) / 2) * 100}%`;

        let explanation;
        if (r > 0) {
            explanation = `Pearson's correlation coefficient is r = ${formatNumber(r)}. This indicates a ${strength.toLowerCase()} positive linear correlation: the two variables tend to change in the same direction.`;
        } else if (r < 0) {
            explanation = `Pearson's correlation coefficient is r = ${formatNumber(r)}. This indicates a ${strength.toLowerCase()} negative linear correlation: the variables tend to change in opposite directions.`;
        } else {
            explanation = "Pearson's correlation coefficient is r = 0, indicating negligible linear correlation.";
        }

        descriptionElement.textContent = explanation;
    }

    function renderResults(result) {
        // Hide the placeholder directly
        emptyResults.style.display = "none";

        // Show the results
        resultsContent.hidden = false;
        resultsContent.style.display = "";

        // Update status
        resultStatus.textContent = `${result.n} data pairs analyzed`;
        resultStatus.classList.add("ready");

        // Regression equation
        document.getElementById("equationResult").textContent =
            buildEquation(result.intercept, result.slope);

        // Slope
        document.getElementById("slopeResult").textContent =
            formatNumber(result.slope);

        // Y-intercept
        document.getElementById("interceptResult").textContent =
            formatNumber(result.intercept);

        // Correlation
        document.getElementById("correlationResult").textContent =
            result.correlation === null
                ? "Undefined"
                : formatNumber(result.correlation);

        // Interpretation + prediction card (separate card below)
        insightEmpty.hidden = true;
        insightContent.hidden = false;
        document.getElementById("interpretationResult").textContent =
            interpret(result);

        // Relationship
        renderRelationship(result);

        // Prediction
        applyNames();
        document.getElementById("predictionOutput").textContent =
            `Enter a value of ${names().x} to calculate a prediction.`;

        document.getElementById("predictX").value = "";

        // Chart
        renderChart(result);
    }

    function renderChart(result) {
        SWCharts.scatter(chartBox, {
            data: result.data,
            intercept: result.intercept,
            slope: result.slope,
            xLabel: xNameInput.value.trim(),
            yLabel: yNameInput.value.trim()
        });

        document.getElementById("chartCaption").textContent =
            `The chart displays ${result.n} observed data points and the least-squares regression line.`;
    }

    function strengthLabel(r) {
        if (r === null) return "Undefined";
        const m = Math.abs(r);
        const label = m >= 0.90 ? "Very high" : m >= 0.70 ? "High" :
                      m >= 0.50 ? "Moderate" : m >= 0.30 ? "Low" : "Negligible";
        return `${label} ${r > 0 ? "positive" : r < 0 ? "negative" : ""}`.trim();
    }

    function saveToHistory(result) {
        const r = result.correlation;

        SW.history.add({
            type: "regression",
            title: "Simple Linear Regression",
            summary: `${buildEquation(result.intercept, result.slope)}  ·  r = ${
                r === null ? "undefined" : formatNumber(r)} (${result.n} pairs)`,
            input: {
                data: result.data,
                xName: xNameInput.value.trim(),
                yName: yNameInput.value.trim()
            },
            result: {
                n: result.n,
                equation: buildEquation(result.intercept, result.slope),
                slope: result.slope,
                intercept: result.intercept,
                correlation: r,
                rSquared: result.rSquared,
                strength: strengthLabel(r),
                interpretation: interpret(result)
            }
        });
    }

    addRowButton.addEventListener("click", () => {
        const row = createRow();
        errorMessage.textContent = "";

        // Keep the new row in view when the table is scrolling.
        tableScroll.scrollTop = tableScroll.scrollHeight;
        row.querySelector(".x-input").focus({ preventScroll: true });
    });

    dataRows.addEventListener("click", event => {
        const removeButton = event.target.closest(".remove-row");

        if (!removeButton) return;

        removeButton.closest("tr").remove();
        updateRowNumbers();
        errorMessage.textContent = "";
    });

    clearButton.addEventListener("click", () => {
        xNameInput.value = "";
        yNameInput.value = "";
        dataRows.innerHTML = "";
        createRow();
        createRow();
        createRow();
        applyNames();
        resetResults();
        errorMessage.textContent = "";
    });

    sampleButton.addEventListener("click", () => {
        // Module 7, Sample #1: study hours (X) and exam score (Y)
        const sample = [
            [2, 65], [3, 75], [4, 82], [5, 88], [6, 92],
            [7, 98], [8, 105], [9, 112], [10, 118], [11, 122]
        ];

        xNameInput.value = "Study Hours";
        yNameInput.value = "Exam Score";

        dataRows.innerHTML = "";

        sample.forEach(([x, y]) => createRow(x, y));
        applyNames();

        errorMessage.textContent = "";
        resetResults();
    });

    calculateButton.addEventListener("click", () => {
        errorMessage.textContent = "";

        try {
            const data = getData();
            regression = calculate(data);
            renderResults(regression);
            saveToHistory(regression);
        } catch (error) {
            errorMessage.textContent = error.message;
        }
    });

    document.getElementById("predictButton").addEventListener("click", () => {
        const output = document.getElementById("predictionOutput");
        const input = document.getElementById("predictX");
        const rawValue = input.value.trim();

        if (!regression) {
            output.textContent = "Calculate the regression model first.";
            return;
        }

        if (rawValue === "" || !Number.isFinite(Number(rawValue))) {
            output.textContent = `Please enter a valid number for ${names().x}.`;
            return;
        }

        const x = Number(rawValue);
        const y = regression.intercept + regression.slope * x;

        const minX = Math.min(...regression.data.map(point => point.x));
        const maxX = Math.max(...regression.data.map(point => point.x));

        const n = names();
        let message = `If ${n.x} = ${formatNumber(x)}, the predicted ${n.y} is ${formatNumber(y)}.`;

        if (x < minX || x > maxX) {
            message +=
                " Warning: this value is outside the range of your data, so the prediction may be unreliable.";
        }

        output.textContent = message;
    });

    xNameInput.addEventListener("input", applyNames);
    yNameInput.addEventListener("input", applyNames);

    // Start with three empty rows (placeholders show the expected format)
    [["2", "5"], ["4", "7"], ["6", "9"]].forEach(([x, y]) => {
        const row = createRow();
        row.querySelector(".x-input").placeholder = `e.g. ${x}`;
        row.querySelector(".y-input").placeholder = `e.g. ${y}`;
    });

    // Re-open an analysis chosen from the History page
    const restored = SW.history.takeRestore("regression");

    if (restored) {
        xNameInput.value = restored.input.xName || "";
        yNameInput.value = restored.input.yName || "";
        dataRows.innerHTML = "";
        restored.input.data.forEach(point => createRow(point.x, point.y));

        try {
            regression = calculate(getData());
            renderResults(regression);
        } catch (error) {
            errorMessage.textContent = error.message;
        }
    }
});