console.log("APP JS LOADED");

/* ================= FILE BROWSER ================= */

async function loadCategory(folder = "") {
    const content = document.getElementById("content");
    if (!content) return;

    content.innerHTML = `<p>Loading...</p>`;

    try {
        const response = await fetch(`/api/files?path=${folder}`, {
            headers: {
                "Authorization": `Bearer ${authToken}`
            }
        });

        // Handle auth expiry
        if (response.status === 401) {
            signOutUser();
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to load files");
        }

        const files = await response.json();

        renderFileList(files, folder);

    } catch (err) {
        console.error("Error loading files:", err);
        content.innerHTML = `<p style="color:red;">Failed to load media</p>`;
    }
}

/* ================= RENDER FILE LIST ================= */

function renderFileList(files, folder) {
    const content = document.getElementById("content");

    let html = `
        <h2>Browsing: ${folder || "All Files"}</h2>
        <div id="fileList" style="display:flex; flex-wrap:wrap; gap:10px;"></div>
        <div id="playerArea" style="margin-top:20px;"></div>
    `;

    content.innerHTML = html;

    const fileList = document.getElementById("fileList");

    files.forEach(file => {
        const item = document.createElement("div");

        item.style.padding = "10px";
        item.style.border = "1px solid #ccc";
        item.style.borderRadius = "8px";
        item.style.cursor = "pointer";
        item.style.minWidth = "150px";

        item.innerText = file.name;

        item.onclick = () => handleFileClick(file, folder);

        fileList.appendChild(item);
    });
}

/* ================= HANDLE FILE CLICK ================= */

function handleFileClick(file, folder) {
    const player = document.getElementById("playerArea");

    const fileUrl = `/api/media?path=${encodeURIComponent(file.path)}`;
    const lower = file.name.toLowerCase();

    // 📁 Folder
    if (file.type === "directory") {
        loadCategory(file.path);
        return;
    }

    // 🎬 Video
    if (lower.endsWith(".mp4") || lower.endsWith(".webm")) {
        const type = lower.endsWith(".webm") ? "webm" : "mp4";

        player.innerHTML = `
            <video width="100%" height="500" controls autoplay style="border-radius:10px;">
                <source src="${fileUrl}" type="video/${type}">
                Your browser does not support video.
            </video>
        `;
        return;
    }

    // 📕 PDF
    if (lower.endsWith(".pdf")) {
        player.innerHTML = `
            <iframe 
                src="${fileUrl}" 
                width="100%" 
                height="600px"
                style="border-radius:10px;">
            </iframe>
        `;
        return;
    }

    // 📄 Other files
    window.open(fileUrl, "_blank");
}

/* ================= CLOCK ================= */

function updateClock() {
    const clockElement = document.getElementById("clock");
    if (!clockElement) return;

    const now = new Date();

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    clockElement.innerText = `${hours}:${minutes}:${seconds}`;
}

// Start clock immediately
updateClock();
setInterval(updateClock, 1000);

/* ================= INIT ================= */

// Load root after login
function initApp() {
    if (typeof authToken !== "undefined" && authToken) {
        loadCategory("");
    }
}

// Wait for auth to initialize
setTimeout(initApp, 500);