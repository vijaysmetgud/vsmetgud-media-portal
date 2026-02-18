function loadCategory(folder) {
    const content = document.getElementById("content");

    let path = folder ? `/${folder}/` : "/";

    content.innerHTML = `
        <h2>Browsing: ${folder || "All Files"}</h2>
        <iframe src="${path}" width="100%" height="600px" style="border:1px solid #ccc; border-radius:8px;"></iframe>
    `;
}
