
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
    let chart = null;

    const numberFormat = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 4
    });

    function formatNumber(value) {
        if (!Number.isFinite(value)) return "—";
        return numberFormat.format(value);
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
    }

    function updateRowNumbers() {
        [...dataRows.rows].forEach((row, index) => {
            row.cells[0].textContent = index + 1;
        });
    }

    function resetResults() {
        regression = null;

        emptyResults.hidden = false;
        emptyResults.style.display = "";

        resultsContent.hidden = true;
        resultsContent.style.display = "none";

        resultStatus.textContent = "Waiting for data";
        resultStatus.classList.remove("ready");

        document.getElementById("chartCaption").textContent =
            "Calculate a regression model to display your chart.";

        if (chart) {
            chart.destroy();
            chart = null;
        }
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

    function interpret(result) {
        const { slope, intercept, correlation } = result;
        let message = `The regression equation is ${buildEquation(intercept, slope)}. `;

        if (slope > 0) {
            message += `For each one-unit increase in X, the predicted value of Y increases by ${formatNumber(slope)} units. `;
        } else if (slope < 0) {
            message += `For each one-unit increase in X, the predicted value of Y decreases by ${formatNumber(Math.abs(slope))} units. `;
        } else {
            message += "The fitted regression line has a slope of zero. ";
        }

        message += `The y-intercept is ${formatNumber(intercept)}, the predicted Y value when X is zero. `;

        if (correlation === null) {
            message += "Pearson's correlation coefficient is undefined because Y does not vary.";
        } else {
            message += `Pearson's correlation coefficient is r = ${formatNumber(correlation)}, describing the strength and direction of the linear relationship.`;
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

        // Interpretation
        document.getElementById("interpretationResult").textContent =
            interpret(result);

        // Relationship
        renderRelationship(result);

        // Prediction
        document.getElementById("predictionOutput").textContent =
            "Enter an X value to calculate a prediction.";

        document.getElementById("predictX").value = "";

        // Chart
        renderChart(result);
    }

    function renderChart(result) {
        const canvas = document.getElementById("regressionChart");
        const context = canvas.getContext("2d");

        if (chart) {
            chart.destroy();
        }

        const xValues = result.data.map(point => point.x);
        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);

        const lineData = minX === maxX
            ? [
                { x: minX, y: result.intercept + result.slope * minX },
                { x: maxX, y: result.intercept + result.slope * maxX }
            ]
            : [
                { x: minX, y: result.intercept + result.slope * minX },
                { x: maxX, y: result.intercept + result.slope * maxX }
            ];

        chart = new Chart(context, {
            type: "scatter",
            data: {
                datasets: [
                    {
                        label: "Observed Data",
                        data: result.data,
                        backgroundColor: "#315bd6",
                        borderColor: "#315bd6",
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: "Regression Line",
                        data: lineData,
                        type: "line",
                        parsing: false,
                        borderColor: "#e49a38",
                        borderWidth: 3,
                        pointRadius: 0,
                        tension: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "nearest",
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: (` +
                                    `${formatNumber(context.parsed.x)}, ` +
                                    `${formatNumber(context.parsed.y)})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: "linear",
                        title: {
                            display: true,
                            text: "X — Independent Variable"
                        },
                        grid: { color: "#edf0f6" }
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Y — Dependent Variable"
                        },
                        grid: { color: "#edf0f6" }
                    }
                }
            }
        });

        document.getElementById("chartCaption").textContent =
            `The chart displays ${result.n} observed data points and the least-squares regression line.`;
    }

    addRowButton.addEventListener("click", () => {
        createRow();
        errorMessage.textContent = "";
    });

    dataRows.addEventListener("click", event => {
        const removeButton = event.target.closest(".remove-row");

        if (!removeButton) return;

        removeButton.closest("tr").remove();
        updateRowNumbers();
        errorMessage.textContent = "";
    });

    clearButton.addEventListener("click", () => {
        dataRows.innerHTML = "";
        createRow();
        createRow();
        createRow();
        resetResults();
        errorMessage.textContent = "";
    });

    sampleButton.addEventListener("click", () => {
        // Module 7, Sample #1: study hours (X) and exam score (Y)
        const sample = [
            [2, 65], [3, 75], [4, 82], [5, 88], [6, 92],
            [7, 98], [8, 105], [9, 112], [10, 118], [11, 122]
        ];

        dataRows.innerHTML = "";

        sample.forEach(([x, y]) => createRow(x, y));

        errorMessage.textContent = "";
        resetResults();
    });

    calculateButton.addEventListener("click", () => {
        errorMessage.textContent = "";

        try {
            const data = getData();
            regression = calculate(data);
            renderResults(regression);
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
            output.textContent = "Please enter a valid numerical X value.";
            return;
        }

        const x = Number(rawValue);
        const y = regression.intercept + regression.slope * x;

        const minX = Math.min(...regression.data.map(point => point.x));
        const maxX = Math.max(...regression.data.map(point => point.x));

        let message = `For X = ${formatNumber(x)}, the predicted Y is ${formatNumber(y)}.`;

        if (x < minX || x > maxX) {
            message +=
                " Warning: this is outside the observed X range, so the prediction is an extrapolation and may be unreliable.";
        }

        output.textContent = message;
    });

    // Footer year
    const yearElement = document.getElementById("currentYear");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    updateRowNumbers();
});