(() => {
    let editingReminderId = null;

    const element = id => document.getElementById(id);

    function getReminderOwner(){
        let user = currentUser;
        if(!user){
            try{
                user = JSON.parse(localStorage.getItem("portalUser") || "null");
            } catch(error){
                console.error("Unable to identify the signed-in portal user:", error);
            }
        }
        return user?.email || user?.username || user?.name || "";
    }

    function getReminderStorageKey(){
        const owner = getReminderOwner();
        return owner ? `portalPaymentReminders_${encodeURIComponent(owner)}` : "";
    }

    function escapeReminderText(value){
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function loadReminders(){
        const key = getReminderStorageKey();
        if(!key) return [];
        try{
            const reminders = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(reminders) ? reminders : [];
        } catch(error){
            console.error("Unable to load payment reminders:", error);
            element("paymentReminderStatus").textContent = "Saved reminders could not be read from this browser.";
            return [];
        }
    }

    function saveReminders(reminders){
        const key = getReminderStorageKey();
        if(!key) throw new Error("Sign in to the portal before saving payment reminders.");
        localStorage.setItem(key, JSON.stringify(reminders));
    }

    function toDateKey(value, allowNaturalLanguage = false){
        const match = String(value).trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if(match){
            const [, day, month, year] = match;
            const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
            if(date.getFullYear() !== Number(year) ||
                date.getMonth() !== Number(month) - 1 ||
                date.getDate() !== Number(day)){
                return "";
            }
            return `${year}-${month}-${day}`;
        }

        if(!allowNaturalLanguage) return "";
        const timestamp = Date.parse(value);
        if(!Number.isFinite(timestamp)) return "";
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function formatReminderDate(dateKey){
        const [year, month, day] = dateKey.split("-");
        return `${day}-${month}-${year}`;
    }

    function getTodayDateKey(){
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }

    function advanceReminderDate(dateKey, frequency){
        const [year, month, day] = dateKey.split("-").map(Number);
        const monthsToAdd = frequency === "quarterly" ? 3 : frequency === "yearly" ? 12 : 1;
        const targetMonth = month - 1 + monthsToAdd;
        const lastDay = new Date(year, targetMonth + 1, 0).getDate();
        const nextDate = new Date(year, targetMonth, Math.min(day, lastDay), 12);
        return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
    }

    function resetReminderForm(){
        element("paymentReminderName").value = "";
        element("paymentReminderAmount").value = "";
        element("paymentReminderDue").value = "";
        element("paymentReminderFrequency").value = "monthly";
        element("paymentReminderNotes").value = "";
        element("savePaymentReminderButton").textContent = "Add Reminder";
        element("cancelPaymentReminderEdit").hidden = true;
        editingReminderId = null;
    }

    window.cancelPortalPaymentReminderEdit = function(){
        resetReminderForm();
        element("paymentReminderStatus").textContent = "Edit cancelled.";
    };

    window.savePortalPaymentReminder = function(){
        const status = element("paymentReminderStatus");
        if(!getReminderOwner()){
            status.textContent = "Sign in to the portal before saving payment reminders.";
            return;
        }

        const title = element("paymentReminderName").value.trim();
        const amountText = element("paymentReminderAmount").value.trim();
        const amount = amountText === "" ? null : Number(amountText);
        const dueDate = toDateKey(element("paymentReminderDue").value);
        const frequency = element("paymentReminderFrequency").value;
        const notes = element("paymentReminderNotes").value.trim();

        if(!title || !dueDate || (amount !== null && (!Number.isFinite(amount) || amount < 0))){
            status.textContent = "Enter a payment name and a valid DD-MM-YYYY due date. Amount must be zero or greater.";
            return;
        }

        const reminders = loadReminders();
        const existingIndex = reminders.findIndex(reminder => reminder.id === editingReminderId);
        const reminder = {
            id: editingReminderId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title,
            amount,
            dueDate,
            frequency,
            notes
        };
        if(existingIndex >= 0){
            reminders[existingIndex] = reminder;
        } else {
            reminders.push(reminder);
        }

        try{
            saveReminders(reminders);
        } catch(error){
            console.error("Unable to save payment reminder:", error);
            status.textContent = error.message || "Payment reminder could not be saved.";
            return;
        }
        resetReminderForm();
        status.textContent = `"${title}" reminder ${existingIndex >= 0 ? "updated" : "added"}.`;
        renderPaymentReminders();
    };

    function editReminder(id){
        const reminder = loadReminders().find(item => item.id === id);
        if(!reminder) return;
        element("paymentReminderName").value = reminder.title;
        element("paymentReminderAmount").value = reminder.amount ?? "";
        element("paymentReminderDue").value = formatReminderDate(reminder.dueDate);
        element("paymentReminderFrequency").value = reminder.frequency;
        element("paymentReminderNotes").value = reminder.notes || "";
        element("savePaymentReminderButton").textContent = "Save Changes";
        element("cancelPaymentReminderEdit").hidden = false;
        element("paymentReminderStatus").textContent = `Editing "${reminder.title}".`;
        editingReminderId = id;
        element("paymentReminderName").focus();
    }

    function deleteReminder(id){
        const reminders = loadReminders();
        const reminder = reminders.find(item => item.id === id);
        if(!reminder || !confirm(`Delete the "${reminder.title}" payment reminder?`)) return;
        try{
            saveReminders(reminders.filter(item => item.id !== id));
        } catch(error){
            console.error("Unable to delete payment reminder:", error);
            element("paymentReminderStatus").textContent = error.message || "Payment reminder could not be deleted.";
            return;
        }
        element("paymentReminderStatus").textContent = `"${reminder.title}" reminder deleted.`;
        renderPaymentReminders();
    }

    function markReminderPaid(id){
        const reminders = loadReminders();
        const reminder = reminders.find(item => item.id === id);
        if(!reminder) return;

        const nextAction = reminder.frequency === "once"
            ? "remove this one-time reminder"
            : `move its due date to ${formatReminderDate(advanceReminderDate(reminder.dueDate, reminder.frequency))}`;
        if(!confirm(`Mark "${reminder.title}" as paid and ${nextAction}?`)) return;

        if(reminder.frequency === "once"){
            reminders.splice(reminders.indexOf(reminder), 1);
        } else {
            const today = getTodayDateKey();
            do{
                reminder.dueDate = advanceReminderDate(reminder.dueDate, reminder.frequency);
            } while(reminder.dueDate <= today);
        }

        try{
            saveReminders(reminders);
        } catch(error){
            console.error("Unable to update payment reminder:", error);
            element("paymentReminderStatus").textContent = error.message || "Payment reminder could not be updated.";
            return;
        }
        element("paymentReminderStatus").textContent = reminder.frequency === "once"
            ? `"${reminder.title}" marked paid and removed.`
            : `"${reminder.title}" marked paid. Next due date: ${formatReminderDate(reminder.dueDate)}.`;
        renderPaymentReminders();
    }

    function renderPaymentReminders(){
        const list = element("paymentReminderList");
        if(!list) return;
        if(!getReminderOwner()){
            list.innerHTML = '<p>Sign in to view and manage your payment reminders.</p>';
            return;
        }

        const today = getTodayDateKey();
        const reminders = loadReminders().sort((first, second) => first.dueDate.localeCompare(second.dueDate));
        list.innerHTML = reminders.map(reminder => {
            const isOverdue = reminder.dueDate < today;
            const isDueToday = reminder.dueDate === today;
            const badgeClass = isOverdue ? "overdue" : isDueToday ? "due" : "";
            const badgeText = isOverdue ? "Overdue" : isDueToday ? "Due today" : "Upcoming";
            const amount = reminder.amount === null || reminder.amount === undefined
                ? "Amount not set"
                : `₹${Number(reminder.amount).toFixed(2)}`;
            return `
                <article class="payment-reminder-item">
                    <div class="payment-reminder-details">
                        <strong>${escapeReminderText(reminder.title)}</strong>
                        <span>${escapeReminderText(amount)} · ${escapeReminderText(reminder.frequency)} · Due ${formatReminderDate(reminder.dueDate)}</span>
                        ${reminder.notes ? `<span>${escapeReminderText(reminder.notes)}</span>` : ""}
                        <span class="payment-reminder-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="payment-reminder-buttons">
                        <button type="button" data-payment-action="paid" data-payment-id="${escapeReminderText(reminder.id)}">Mark paid</button>
                        <button type="button" class="payment-reminder-secondary" data-payment-action="edit" data-payment-id="${escapeReminderText(reminder.id)}">Edit</button>
                        <button type="button" class="payment-reminder-delete" data-payment-action="delete" data-payment-id="${escapeReminderText(reminder.id)}">Delete</button>
                    </div>
                </article>
            `;
        }).join("") || "<p>No payment reminders yet. Add a payment above to get started.</p>";

        list.querySelectorAll("[data-payment-action]").forEach(button => {
            button.addEventListener("click", () => {
                const { paymentAction: action, paymentId: id } = button.dataset;
                if(action === "edit") editReminder(id);
                if(action === "delete") deleteReminder(id);
                if(action === "paid") markReminderPaid(id);
            });
        });
        checkDuePaymentNotifications();
    }

    function checkDuePaymentNotifications(){
        if(!("Notification" in window) || Notification.permission !== "granted") return;
        const owner = getReminderOwner();
        if(!owner) return;

        const today = getTodayDateKey();
        loadReminders().filter(reminder => reminder.dueDate <= today).forEach(reminder => {
            const notificationKey = `portalPaymentReminderNotified_${encodeURIComponent(owner)}_${reminder.id}_${reminder.dueDate}`;
            if(localStorage.getItem(notificationKey)) return;
            const amount = reminder.amount === null || reminder.amount === undefined
                ? ""
                : ` Amount: ₹${Number(reminder.amount).toFixed(2)}.`;
            try{
                new Notification(`Payment reminder: ${reminder.title}`, {
                    body: `Due ${formatReminderDate(reminder.dueDate)}.${amount}`
                });
                localStorage.setItem(notificationKey, "true");
            } catch(error){
                console.error("Unable to show payment reminder notification:", error);
                element("paymentReminderStatus").textContent = "Could not show a browser notification. Check notification permissions.";
            }
        });
    }

    window.enablePaymentReminderNotifications = async function(){
        const status = element("paymentReminderStatus");
        if(!("Notification" in window)){
            status.textContent = "This browser does not support notifications. Due items will still appear in this list.";
            return;
        }
        try{
            const permission = await Notification.requestPermission();
            if(permission !== "granted"){
                status.textContent = "Notifications were not enabled. Due items will still appear in this list.";
                return;
            }
            status.textContent = "Due payment notifications enabled while the portal is open.";
            checkDuePaymentNotifications();
        } catch(error){
            console.error("Unable to request payment reminder notification permission:", error);
            status.textContent = "Could not enable notifications. Due items will still appear in this list.";
        }
    };

    window.voiceFillPaymentReminder = async function(){
        const status = element("paymentReminderStatus");
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SpeechRecognition || !window.speechSynthesis){
            status.textContent = "Voice input is not supported in this browser. Fill in the fields manually.";
            return;
        }

        const listen = prompt => new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(prompt);
            utterance.lang = "en-IN";
            utterance.rate = 0.9;
            utterance.onerror = () => reject(new Error("Could not play the voice prompt. You can enter the reminder manually."));
            utterance.onend = () => {
                const recognition = new SpeechRecognition();
                recognition.lang = "en-IN";
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.onresult = event => resolve(event.results[0][0].transcript.trim());
                recognition.onerror = event => reject(new Error(`Voice input failed (${event.error}). You can enter the reminder manually.`));
                recognition.start();
            };
            speechSynthesis.cancel();
            speechSynthesis.speak(utterance);
        });

        try{
            status.textContent = "Listening for payment name...";
            const title = await listen("What payment is this reminder for? You can say any payment, such as hotel, transport, rent, or a bill.");
            if(!title) throw new Error("No payment name was recognized. Please try again or fill in the form.");

            status.textContent = "Listening for amount...";
            const amountText = await listen("Say the amount in digits, or say skip if you do not want to add an amount.");
            const amountMatch = amountText.toLowerCase() === "skip"
                ? null
                : amountText.replace(/,/g, "").match(/\d+(?:\.\d+)?/);

            status.textContent = "Listening for due date...";
            const dueDateText = await listen("Say the due date with month, day, and year, for example October 5 2026.");
            const dueDate = toDateKey(dueDateText, true);
            if(!dueDate) throw new Error("I could not understand that date. Enter it manually as DD-MM-YYYY.");

            status.textContent = "Listening for repeat schedule...";
            const frequencyText = (await listen("Say monthly, quarterly, yearly, or one time.")).toLowerCase();
            const frequency = frequencyText.includes("quarter")
                ? "quarterly"
                : frequencyText.includes("year") || frequencyText.includes("annual")
                    ? "yearly"
                    : frequencyText.includes("one") || frequencyText.includes("once")
                        ? "once"
                        : frequencyText.includes("month")
                            ? "monthly"
                            : "";
            if(!frequency) throw new Error("I could not understand the repeat schedule. Please choose it manually.");

            element("paymentReminderName").value = title;
            element("paymentReminderAmount").value = amountMatch ? amountMatch[0] : "";
            element("paymentReminderDue").value = formatReminderDate(dueDate);
            element("paymentReminderFrequency").value = frequency;
            status.textContent = "Voice details added. Review the fields and save the reminder.";
        } catch(error){
            console.error("Payment reminder voice entry failed:", error);
            status.textContent = error.message || "Voice entry failed. Fill in the fields manually.";
        }
    };

    document.addEventListener("DOMContentLoaded", () => {
        const dueInput = element("paymentReminderDue");
        dueInput.addEventListener("input", () => {
            const digits = dueInput.value.replace(/\D/g, "");
            if(digits.length === 8){
                dueInput.value = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
            }
        });

        const main = element("mainContent");
        if(main){
            new MutationObserver(() => {
                if(!main.classList.contains("hidden")) renderPaymentReminders();
            }).observe(main, { attributes: true, attributeFilter: ["class"] });
        }

        renderPaymentReminders();
        window.setInterval(checkDuePaymentNotifications, 60000);
    });
})();
