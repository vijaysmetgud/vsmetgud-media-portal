(() => {
    const BACKUP_VERSION = 1;
    const MAX_BACKUP_SIZE = 10 * 1024 * 1024;
    const includedExactKeys = new Set([
        "expenseUsers",
        "expenseUser",
        "expenseTheme",
        "monthlyBudget",
        "splitHistory",
        "healthReminderLog",
        "theme",
        "mediaPortalDesktopBackground",
        "theatreFavorites",
        "theatreSavedPlaylists",
        "theatreResumePositions",
        "theatreLastPlaylist",
        "theatreCurrentTrack",
        "theatrePersistMedia"
    ]);
    const includedPrefixes = [
        "expenses_",
        "expenseRecurring_",
        "mediaPortal"
    ];

    function isIncludedKey(key) {
        return includedExactKeys.has(key) ||
            includedPrefixes.some(prefix => key.startsWith(prefix));
    }

    function createBackup() {
        const data = {};
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key && isIncludedKey(key)) data[key] = localStorage.getItem(key);
        }

        return {
            format: "vsmetgud-media-portal-backup",
            version: BACKUP_VERSION,
            createdAt: new Date().toISOString(),
            data
        };
    }

    function downloadBackup() {
        const backup = createBackup();
        const blob = new Blob([JSON.stringify(backup, null, 2)], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `media-portal-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        announce(
            `Backup downloaded with ${Object.keys(backup.data).length} local data entries. ` +
            "Theatre media file bytes are not included."
        );
    }

    function announce(message) {
        const status = document.getElementById("portalBackupStatus");
        if (status) status.textContent = message;
    }

    function validateBackup(backup) {
        if (
            !backup ||
            backup.format !== "vsmetgud-media-portal-backup" ||
            backup.version !== BACKUP_VERSION ||
            !backup.data ||
            typeof backup.data !== "object" ||
            Array.isArray(backup.data)
        ) {
            throw new Error("This file is not a supported Media Portal backup.");
        }

        const entries = Object.entries(backup.data);
        if (entries.some(([key, value]) =>
            !isIncludedKey(key) || typeof value !== "string"
        )) {
            throw new Error("The backup contains unsupported or invalid data.");
        }
        return entries;
    }

    async function restoreBackup(file) {
        if (!file) return;
        if (file.size > MAX_BACKUP_SIZE) {
            announce("Backup file is too large (maximum 10 MB).");
            return;
        }

        try {
            const backup = JSON.parse(await file.text());
            const entries = validateBackup(backup);
            if (!entries.length) {
                announce("This backup does not contain any supported data.");
                return;
            }

            const confirmed = window.confirm(
                `Restore ${entries.length} data entries? Matching local app data will be replaced. ` +
                "Other browser data and sign-in credentials will not be changed."
            );
            if (!confirmed) return;

            const previousValues = new Map(
                entries.map(([key]) => [key, localStorage.getItem(key)])
            );
            try {
                entries.forEach(([key, value]) => localStorage.setItem(key, value));
            } catch (error) {
                try {
                    previousValues.forEach((value, key) => {
                        if (value === null) localStorage.removeItem(key);
                        else localStorage.setItem(key, value);
                    });
                } catch (rollbackError) {
                    console.error("Backup restore rollback failed:", rollbackError);
                }
                throw new Error(`Restore could not be completed: ${error.message}`);
            }

            announce("Backup restored. Reload this page to refresh the displayed data.");
        } catch (error) {
            console.error("Unable to restore Media Portal backup:", error);
            announce(error.message || "Unable to read this backup file.");
        }
    }

    function mountBackupControls() {
        if (document.getElementById("portalBackupControls")) return;

        const controls = document.createElement("aside");
        controls.id = "portalBackupControls";
        controls.setAttribute("aria-label", "Local data backup");
        controls.innerHTML = `
            <button type="button" id="portalBackupExport">Download Backup</button>
            <button type="button" id="portalBackupImport">Restore Backup</button>
            ${document.getElementById("mainContent") ? `
                <button type="button" id="portalBackgroundChoose">Desktop Background</button>
                <button type="button" id="portalBackgroundReset">Use Default</button>
                <input type="file" id="portalBackgroundFile" accept="image/*" hidden>
            ` : ""}
            <input type="file" id="portalBackupFile" accept="application/json,.json" hidden>
            <span id="portalBackupStatus" role="status" aria-live="polite">
                Backups contain local app data; keep downloaded files private.
            </span>
        `;
        document.body.appendChild(controls);

        const input = controls.querySelector("#portalBackupFile");
        controls.querySelector("#portalBackupExport").addEventListener("click", downloadBackup);
        controls.querySelector("#portalBackupImport").addEventListener("click", () => input.click());
        const backgroundInput = controls.querySelector("#portalBackgroundFile");
        if (backgroundInput) {
            controls.querySelector("#portalBackgroundChoose").addEventListener("click", () =>
                backgroundInput.click()
            );
            controls.querySelector("#portalBackgroundReset").addEventListener("click", () => {
                try {
                    localStorage.removeItem("mediaPortalDesktopBackground");
                    applyDesktopBackground();
                    announce("Default portal background restored.");
                } catch (error) {
                    console.error("Unable to restore default portal background:", error);
                    announce("Could not reset the portal background. Check browser storage.");
                }
            });
            backgroundInput.addEventListener("change", async () => {
                await saveDesktopBackground(backgroundInput.files?.[0]);
                backgroundInput.value = "";
            });
            applyDesktopBackground();
        }
        input.addEventListener("change", async () => {
            await restoreBackup(input.files?.[0]);
            input.value = "";
        });
    }

    function applyDesktopBackground() {
        const dataUrl = localStorage.getItem("mediaPortalDesktopBackground");
        if (dataUrl) {
            document.body.style.backgroundImage =
                `linear-gradient(rgba(15, 23, 42, 0.56), rgba(15, 23, 42, 0.56)), url("${dataUrl}")`;
            document.body.style.backgroundPosition = "center";
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundAttachment = "fixed";
        } else {
            document.body.style.removeProperty("background-image");
            document.body.style.removeProperty("background-position");
            document.body.style.removeProperty("background-size");
            document.body.style.removeProperty("background-attachment");
        }
    }

    async function saveDesktopBackground(file) {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            announce("Choose an image file for the desktop background.");
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            announce("Image is too large. Choose an image under 8 MB.");
            return;
        }

        try {
            const sourceUrl = URL.createObjectURL(file);
            try {
                const image = new Image();
                image.src = sourceUrl;
                await image.decode();
                const scale = Math.min(1, 1920 / image.width, 1200 / image.height);
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));
                const context = canvas.getContext("2d");
                if (!context) throw new Error("Image canvas is unavailable.");
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                const compressed = canvas.toDataURL("image/jpeg", 0.78);
                if (compressed.length > 2 * 1024 * 1024) {
                    throw new Error("Compressed image is too large for browser storage.");
                }
                localStorage.setItem("mediaPortalDesktopBackground", compressed);
                applyDesktopBackground();
                announce("Portal desktop background saved on this browser.");
            } finally {
                URL.revokeObjectURL(sourceUrl);
            }
        } catch (error) {
            console.error("Unable to save portal desktop background:", error);
            announce(`Could not save background: ${error.message}`);
        }
    }

    const styles = document.createElement("style");
    styles.textContent = `
        #portalBackupControls {
            position: fixed;
            right: 12px;
            bottom: 12px;
            z-index: 10000;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
            max-width: min(520px, calc(100vw - 24px));
            padding: 10px;
            border: 1px solid #64748b;
            border-radius: 12px;
            background: #111827;
            color: #f8fafc;
            box-shadow: 0 8px 28px #0008;
            font: 12px/1.4 "Segoe UI", Arial, sans-serif;
        }
        #portalBackupControls button {
            min-height: 40px;
            padding: 8px 12px;
            border: 0;
            border-radius: 8px;
            background: #2563eb;
            color: #fff;
            font: inherit;
            font-weight: 700;
            cursor: pointer;
        }
        #portalBackupControls button:focus-visible,
        #portalBackupControls button:hover {
            outline: 2px solid #bfdbfe;
            outline-offset: 2px;
        }
        #portalBackupStatus { flex: 1 1 100%; }
        @media (max-width: 520px) {
            #portalBackupControls { left: 10px; right: 10px; bottom: 10px; }
            #portalBackupControls button { flex: 1; }
        }
    `;
    document.head.appendChild(styles);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mountWhenPortalIsAvailable, { once: true });
    } else {
        mountWhenPortalIsAvailable();
    }

    function mountWhenPortalIsAvailable() {
        const mainContent = document.getElementById("mainContent");
        if (!mainContent || !mainContent.classList.contains("hidden")) {
            mountBackupControls();
            return;
        }

        const observer = new MutationObserver(() => {
            if (!mainContent.classList.contains("hidden")) {
                observer.disconnect();
                mountBackupControls();
            }
        });
        observer.observe(mainContent, { attributes: true, attributeFilter: ["class"] });
    }
})();
