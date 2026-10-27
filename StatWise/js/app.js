const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// Open and close the mobile sidebar
function setSidebarOpen(isOpen) {
    if (!sidebar || !menuToggle || !sidebarOverlay) {
        return;
    }

    sidebar.classList.toggle("open", isOpen);
    sidebarOverlay.classList.toggle("show", isOpen);

    menuToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
    );
}

if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        const isOpen = sidebar.classList.contains("open");
        setSidebarOpen(!isOpen);
    });
}

// Close sidebar when the dark overlay is clicked
if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
        setSidebarOpen(false);
    });
}

// Close sidebar with the Escape key
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        setSidebarOpen(false);
    }
});

// Highlight the current page in the navigation
const currentPage =
    window.location.pathname.split("/").pop() || "index.html";

document.querySelectorAll(".navigation a").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
        document.querySelectorAll(".navigation a").forEach((item) => {
            item.classList.remove("active");
            item.removeAttribute("aria-current");
        });

        link.classList.add("active");
        link.setAttribute("aria-current", "page");
    }

    link.addEventListener("click", () => {
        setSidebarOpen(false);
    });
});

// Automatically display the current date
const todayLabel = document.getElementById("todayLabel");

if (todayLabel) {
    todayLabel.textContent = new Intl.DateTimeFormat(
        undefined,
        {
            weekday: "short",
            month: "short",
            day: "numeric"
        }
    ).format(new Date());
}

// Automatically update the copyright year
const year = document.getElementById("year");

if (year) {
    year.textContent = new Date().getFullYear();
}