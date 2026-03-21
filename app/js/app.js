console.log("APP JS LOADED");
function loadCategory(folder) {

    const content = document.getElementById("content");
    if (!content) return;
    const basePath = folder ? `/media/${folder}/` : `/media/`;

    content.innerHTML = `
        <h2>Browsing: ${folder || "All Files"}</h2>
        <iframe id="dirFrame"
            src="${basePath}"
            width="100%"
            height="400px"
            style="border:1px solid #ccc; border-radius:8px;">
        </iframe>

        <div id="playerArea" style="margin-top:20px;"></div>
    `;

    // Wait for iframe to load
    const frame = document.getElementById("dirFrame");

    frame.onload = function () {

        const iframeDoc = frame.contentDocument || frame.contentWindow.document;
        const links = iframeDoc.getElementsByTagName("a");

        for (let link of links) {

            const href = link.getAttribute("href");

            if (!href || href === "../") continue;

            link.onclick = function (e) {
                e.preventDefault();

                const fileUrl = basePath + href;
                const lower = href.toLowerCase();

                const player = document.getElementById("playerArea");

                // 🎬 VIDEO
                if (lower.endsWith(".mp4") || lower.endsWith(".webm")) {

                    player.innerHTML = `
                        <video 
                            width="100%" 
                            height="500"
                            controls 
                            autoplay 
                            style="border-radius:10px;">
                            <source src="${fileUrl}" type="video/mp4">
                            Your browser does not support video.
                        </video>
                    `;

                }
                // 📕 PDF
                else if (lower.endsWith(".pdf")) {

                    player.innerHTML = `
                        <iframe 
                            src="${fileUrl}" 
                            width="100%" 
                            height="600px"
                            style="border-radius:10px;">
                        </iframe>
                    `;
                }
                // 📁 Folder
                else if (!lower.includes(".")) {
                    loadCategory(folder ? `${folder}/${href.replace("/", "")}` : href.replace("/", ""));
                }
                else {
                    // Other files → open normally
                    window.open(fileUrl, "_blank");
                }
            }
        }
    }
}

/* ================= CLOCK ================= */
// document.addEventListener("DOMContentLoaded", function () {

//     function updateClock() {
//         const clock = document.getElementById("clock");

//         if (!clock) {
//             console.log("Clock element missing");
//             return;
//         }

//         const now = new Date();

//         let hours = now.getHours();
//         const minutes = String(now.getMinutes()).padStart(2, '0');
//         const seconds = String(now.getSeconds()).padStart(2, '0');

//         const ampm = hours >= 12 ? 'PM' : 'AM';

//         hours = hours % 12;
//         hours = hours ? hours : 12;

//         clock.innerText = `${hours}:${minutes}:${seconds} ${ampm}`;
//     }

//     updateClock();
//     setInterval(updateClock, 1000);

//     console.log("Clock running ✅");

// });

function updateClock() {
    const clockElement = document.getElementById('clock');

    if (!clockElement) return; // safe check

    const now = new Date();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    clockElement.textContent = `${hours}:${minutes}:${seconds}`;
}

// Run immediately
updateClock();

// Run every second
setInterval(updateClock, 1000);