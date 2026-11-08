/* ==========================================================
   STATWISE — MODULE (PDF) PAGES
   Shows a friendly notice if the PDF file is not in /pdf.
   (Browsers block file reads from file://, so the check only
   runs when the site is served over http/https.)
   ========================================================== */

(function () {
    "use strict";

    const card = document.querySelector("[data-pdf]");
    if (!card || !/^https?:$/.test(location.protocol)) return;

    fetch(card.dataset.pdf, { method: "HEAD" })
        .then(response => {
            if (response.ok) return;
            document.getElementById("pdfMissing").hidden = false;
            document.getElementById("pdfFrame").hidden = true;
        })
        .catch(() => { /* leave the viewer as is */ });
})();
