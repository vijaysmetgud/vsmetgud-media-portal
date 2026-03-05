function loadCategory(folder) {

    const content = document.getElementById("content");
    const basePath = folder ? `/media/${folder}/` : `/media/`;

    content.innerHTML = `
        <h2>Browsing: ${folder || "All Files"}</h2>
        <iframe id="dirFrame"
            src="${basePath}"
            width="100%"
            height="400"
            style="border:1px solid #ccc;border-radius:8px;">
        </iframe>

        <div id="playerArea" style="margin-top:20px;"></div>
    `;

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

                if (lower.endsWith(".mp4") || lower.endsWith(".webm")) {

                    player.innerHTML = `
                        <video width="100%" height="500" controls autoplay>
                            <source src="${fileUrl}">
                        </video>
                    `;

                } 
                else if (lower.endsWith(".pdf")) {

                    player.innerHTML = `
                        <iframe src="${fileUrl}" width="100%" height="600"></iframe>
                    `;

                } 
                else if (!lower.includes(".")) {

                    const nextFolder = href.replace(/\/$/, "");
                    loadCategory(folder ? `${folder}/${nextFolder}` : nextFolder);

                } 
                else {

                    window.open(fileUrl, "_blank");

                }

            };

        }

    };

}