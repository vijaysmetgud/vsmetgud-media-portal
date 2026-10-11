// =========================================================
// LOAD HEALTH REMINDERS FROM SERVER
// =========================================================

async function loadHealthReminders() {

    try {

        const response =
            await fetch(
                '/api/health-reminders',
                {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store'
                }
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const result =
            await response.json();

        if (!result.success) {
            throw new Error(
                result.error ||
                'Unable to load health reminders'
            );
        }

        healthTipSchedule.length = 0;

        if (Array.isArray(result.schedule)) {

            healthTipSchedule.push(
                ...result.schedule
            );
        }

        window.healthReminderEnabled =
            result.enabled === true;

    } catch (error) {

        console.error(
            'Unable to load health reminders:',
            error
        );
    }
}
// =========================================================
// RADIO FILTER
// =========================================================

function getSelectedHealthReminderType() {

  const selected =
    document.querySelector(
      'input[name="healthReminderType"]:checked'
    );

  return selected
    ? selected.value
    : "all";
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHealthHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// =========================================================
// RENDER HEALTH REMINDERS
// =========================================================

function renderHealthTips() {

  const container =
    document.getElementById(
      "healthReminderList"
    );

  if (!container) {
    return;
  }


  const selectedType =
    getSelectedHealthReminderType();


  const filteredTips =
    selectedType === "all"
      ? healthTipSchedule
      : healthTipSchedule.filter(
          tip => tip.id === selectedType
        );


  container.innerHTML =
    filteredTips.map(tip => `

      <div
        class="healthReminderItem"
        data-reminder-id="${escapeHealthHtml(tip.id)}"
      >

        <span class="tipTime">
          ${escapeHealthHtml(tip.time)}
        </span>

        <strong>
          ${escapeHealthHtml(tip.label)}
        </strong>

        <p>
          ${escapeHealthHtml(tip.message)}
        </p>

        <div class="healthReminderActions">

          <button
            type="button"
            class="healthEditBtn"
            onclick="openHealthEditModal('${escapeHealthHtml(tip.id)}')"
          >
            ✏️ Edit
          </button>

        </div>

      </div>

    `).join("");

}

function renderHealthReminderRadioButtons() {

    const container =
        document.getElementById(
            "healthReminderRadioList"
        );

    if (!container) {
        return;
    }

    container.innerHTML =
        healthTipSchedule.map(
            (tip, index) => `
                <label class="healthRadioOption">

                    <input
                        type="radio"
                        name="healthReminderEdit"
                        value="${tip.id}"
                        ${index === 0 ? "checked" : ""}
                    >

                    <span class="healthRadioText">

                        <strong>
                            ${escapeHealthHtml(tip.label)}
                        </strong>

                        <span>
                            ⏰ ${escapeHealthHtml(tip.time)}
                        </span>

                    </span>

                </label>
            `
        ).join("");
}


function editSelectedHealthReminder() {

    const selected =
        document.querySelector(
            'input[name="healthReminderEdit"]:checked'
        );

    if (!selected) {

        alert(
            "Please select a health reminder to edit."
        );

        return;
    }

    openHealthEditModal(
        selected.value
    );
}

// =========================================================
// RADIO EVENTS
// =========================================================

document
  .querySelectorAll(
    'input[name="healthReminderType"]'
  )
  .forEach(radio => {

    radio.addEventListener(
      "change",
      renderHealthTips
    );

  });


// =========================================================
// NOTIFICATION PERMISSION
// =========================================================

async function enableHealthNotifications() {

  if (!("Notification" in window)) {

    alert(
      "This browser does not support notifications."
    );

    return;
  }


  try {

    const permission =
      await Notification.requestPermission();


    updateNotificationStatus();


    if (permission === "granted") {     

      new Notification(
        "💚 Health Reminders Enabled",
        {
          body:
            "You will receive health reminders according to your schedule.",
          icon: "/favicon.ico"
        }
      );

    }

  } catch (error) {

    console.error(
      "Notification permission error:",
      error
    );

  }

}


// =========================================================
// NOTIFICATION STATUS
// =========================================================

function updateNotificationStatus() {

  const status =
    document.getElementById(
      "healthNotificationStatus"
    );

  if (!status) {
    return;
  }


  if (!("Notification" in window)) {

    status.textContent =
      "❌ Browser notifications are not supported.";

    return;
  }


  if (Notification.permission === "granted") {

    status.textContent =
      "🟢 Health notifications are enabled.";

  } else if (
    Notification.permission === "denied"
  ) {

    status.textContent =
      "🔴 Notifications are blocked in browser settings.";

  } else {

    status.textContent =
      "🟡 Click Enable Health Reminders.";

  }

}

// =========================================================
// OPEN EDIT MODAL
// =========================================================

function openHealthEditModal(reminderId) {

    const reminder =
        healthTipSchedule.find(
            tip => tip.id === reminderId
        );

    if (!reminder) {
        alert("Health reminder not found.");
        return;
    }

    const editModal =
        document.getElementById("healthEditModal");

    const editId =
        document.getElementById("healthEditId");

    const editLabel =
        document.getElementById("healthEditLabel");

    const editTime =
        document.getElementById("healthEditTime");

    const editMessage =
        document.getElementById("healthEditMessage");

    if (
        !editModal ||
        !editId ||
        !editLabel ||
        !editTime ||
        !editMessage
    ) {
        console.error(
            "Health reminder edit modal elements are missing."
        );

        alert(
            "Edit form is not configured correctly."
        );

        return;
    }

    editId.value =
        reminder.id;

    editLabel.value =
        reminder.label;

    editTime.value =
        reminder.time;

    editMessage.value =
        reminder.message;

    editModal.classList.add("active");
}

function closeHealthReminderEditor() {

    const editor =
        document.getElementById(
            "healthReminderEditor"
        );

    if (editor) {
        editor.style.display = "none";
    }
}

function openHealthReminderEditor() {

    const editor =
        document.getElementById(
            "healthReminderEditor"
        );

    if (!editor) {
        return;
    }

    renderHealthReminderRadioButtons();

    editor.style.display = "flex";
}

// =========================================================
// CLOSE EDIT MODAL
// =========================================================

function closeHealthEditModal() {

  const modal =
    document.getElementById(
      "healthEditModal"
    );

  if (!modal) {
    return;
  }


  modal.classList.remove(
    "active"
  );

}

let healthVoiceEditInProgress = false;

function speakHealthReminderPrompt(message){
    if(!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined"){
        return Promise.resolve();
    }

    return new Promise(resolve => {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = "en-IN";
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    });
}

function listenForHealthReminderVoice(prompt){
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!Recognition){
        return Promise.reject(new Error("Voice input is not supported in this browser."));
    }

    return new Promise((resolve, reject) => {
        const recognition = new Recognition();
        let receivedResult = false;
        recognition.lang = "en-IN";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = event => {
            const transcript = event.results?.[0]?.[0]?.transcript?.trim();
            if(!transcript){
                reject(new Error("No speech was recognized. Please try again."));
                return;
            }
            receivedResult = true;
            resolve(transcript);
            recognition.stop();
        };
        recognition.onerror = event => {
            reject(new Error(event.error === "not-allowed"
                ? "Microphone access is blocked. Allow microphone access and try again."
                : `Voice input failed: ${event.error || "unknown error"}.`));
        };
        recognition.onend = () => {
            if(!receivedResult){
                reject(new Error("No speech was recognized. Please try again."));
            }
        };

        speakHealthReminderPrompt(prompt).then(() => {
            try{
                recognition.start();
            } catch(error){
                reject(new Error(`Unable to start voice input: ${error.message}`));
            }
        });
    });
}

function parseHealthReminderTime(transcript){
    const value = transcript.toLowerCase().replace(/\./g, "").trim();
    const match = value.match(/\b(\d{1,2})(?::|\s+)(\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/);
    if(!match){
        throw new Error("I couldn't find a valid time. Say a time such as 5:30 PM or 17:30.");
    }

    let hours = Number(match[1] || match[4]);
    const minutes = Number(match[2] || 0);
    const meridiem = match[3] || match[5];
    if(minutes > 59 || hours > (meridiem ? 12 : 23) || hours < (meridiem ? 1 : 0)){
        throw new Error("That time is not valid. Please say it again, for example 5:30 PM.");
    }

    if(meridiem){
        hours = hours % 12 + (meridiem === "pm" ? 12 : 0);
    }
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

async function startHealthReminderVoiceEdit(){
    const timeInput = document.getElementById("healthEditTime");
    const messageInput = document.getElementById("healthEditMessage");
    const status = document.getElementById("healthVoiceEditStatus");
    const button = document.querySelector(".healthVoiceEditBtn");
    if(!timeInput || !messageInput || !status || !button){
        console.error("Health reminder voice edit controls are missing.");
        return;
    }
    if(healthVoiceEditInProgress) return;

    healthVoiceEditInProgress = true;
    button.disabled = true;
    status.textContent = "Listening for the new reminder time…";
    try{
        const spokenTime = await listenForHealthReminderVoice(
            "Say the new reminder time, for example, 5:30 PM."
        );
        const time = parseHealthReminderTime(spokenTime);
        status.textContent = "Time captured. Listening for the new reminder message…";
        const message = await listenForHealthReminderVoice(
            "Now say the new reminder message."
        );

        timeInput.value = time;
        messageInput.value = message;
        status.textContent = `Voice edits ready to review: ${time}. Select Save Changes to apply them.`;
    } catch(error){
        console.error("Unable to edit health reminder by voice:", error);
        status.textContent = error.message || "Voice editing failed. Please try again.";
    } finally{
        healthVoiceEditInProgress = false;
        button.disabled = false;
    }
}


// =========================================================
// SAVE HEALTH REMINDER
// =========================================================

async function saveHealthReminder() {

    const originalId =
        document.getElementById(
            "healthEditId"
        ).value;

    const label =
        document.getElementById(
            "healthEditLabel"
        ).value.trim();

    const time =
        document.getElementById(
            "healthEditTime"
        ).value;

    const message =
        document.getElementById(
            "healthEditMessage"
        ).value.trim();


    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!label) {

        alert(
            "Please enter a reminder name."
        );

        return;
    }


    if (!time) {

        alert(
            "Please select a reminder time."
        );

        return;
    }


    if (!message) {

        alert(
            "Please enter a reminder message."
        );

        return;
    }


    // -------------------------------------------------------
    // FIND ORIGINAL REMINDER
    // -------------------------------------------------------

    const reminder =
        healthTipSchedule.find(
            tip => tip.id === originalId
        );


    if (!reminder) {

        alert(
            "Unable to find the selected reminder."
        );

        return;
    }


    // -------------------------------------------------------
    // UPDATE ONLY EDITABLE FIELDS
    // -------------------------------------------------------

    reminder.label =
        label;

    reminder.time =
        time;

    reminder.message =
        message;


    // -------------------------------------------------------
    // SAVE TO SERVER
    // -------------------------------------------------------

    await saveHealthReminders();

    // -------------------------------------------------------
    // REFRESH DISPLAY
    // -------------------------------------------------------

    renderHealthTips();

    renderHealthReminderRadioButtons();


    // -------------------------------------------------------
    // CLOSE MODAL
    // -------------------------------------------------------

    closeHealthEditModal();


    alert(
        "Health reminder updated successfully."
    );
}

// =========================================================
// SAVE HEALTH REMINDERS
// =========================================================
async function saveHealthReminders() {

    try {

        const response =
            await fetch(
                '/api/health-reminders',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    credentials: 'include',

                    body: JSON.stringify({

                        enabled:
                            window.healthReminderEnabled !== false,

                        schedule:
                            healthTipSchedule

                    })
                }
            );

        const result =
            await response.json();

        if (!response.ok || !result.success) {

            throw new Error(
                result.error ||
                'Unable to save health reminders'
            );
        }

        localStorage.setItem(
            "healthTipSchedule",
            JSON.stringify(healthTipSchedule)
        );

        return true;

        return true;

    } catch (error) {

        console.error(
            'Unable to save health reminders:',
            error
        );

        alert(
            error.message ||
            'Unable to save health reminders.'
        );

        return false;
    }
}

// =========================================================
// ALARM SOUND
// =========================================================

let healthAudioContext =
  null;


// =========================================================
// HEALTH REMINDER MP3 ALARM
// =========================================================

function playHealthAlarm() {
    try {
        const alarm = document.getElementById("healthReminderAlarm");

        if (!alarm) {
            console.error("Health reminder alarm not found in index.html");
            return;
        }

        alarm.currentTime = 0;

        alarm.play().catch(error => {
            console.warn("Health reminder alarm could not play:", error);
        });

    } catch (error) {
        console.error("Health reminder alarm error:", error);
    }
}


// =========================================================
// VIBRATION
// =========================================================

function vibrateHealthAlarm() {

  if (
    "vibrate" in navigator
  ) {

    navigator.vibrate([
      500,
      250,
      500,
      250,
      700
    ]);

  }

}


// =========================================================
// SHOW HEALTH NOTIFICATION
// =========================================================

function showHealthNotification(
  tip
) {

  playHealthAlarm();

  vibrateHealthAlarm();


  if (
    "Notification" in window &&
    Notification.permission ===
      "granted"
  ) {

    new Notification(
      `💚 ${tip.label}`,
      {
        body:
          tip.message,

        requireInteraction:
          true
      }
    );

  }


  /*
   * Browser alert is intentionally kept
   * as a visible fallback.
   */

  alert(
    `💚 ${tip.label}\n\n${tip.message}`
  );

}


// =========================================================
// PREVENT DUPLICATE DAILY REMINDER
// =========================================================

function getReminderKey(
  tip
) {

  const now =
    new Date();


  /*
   * Use LOCAL date rather than UTC.
   * This prevents reminders from being
   * assigned to the wrong day.
   */

  const today =
    `${now.getFullYear()}-` +
    `${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-` +
    `${String(
      now.getDate()
    ).padStart(2, "0")}`;


  return (
    `healthReminder_${today}_${tip.id}`
  );

}


// =========================================================
// CHECK HEALTH REMINDERS
// =========================================================

function checkHealthReminders() {

  const now =
    new Date();


  const currentHour =
    String(
      now.getHours()
    ).padStart(2, "0");


  const currentMinute =
    String(
      now.getMinutes()
    ).padStart(2, "0");


  const currentTime =
    `${currentHour}:${currentMinute}`;


  healthTipSchedule.forEach(
    tip => {

      if (
        tip.time !==
        currentTime
      ) {

        return;

      }


      const reminderKey =
        getReminderKey(
          tip
        );


      if (
        localStorage.getItem(
          reminderKey
        )
      ) {

        return;

      }


      localStorage.setItem(
        reminderKey,
        "true"
      );


      showHealthNotification(
        tip
      );

    }
  );

}


// =========================================================
// TEST ALARM
// =========================================================

function testHealthAlarm() {

  const testTip = {

    id:
      "test",

    label:
      "Health Reminder Test",

    message:
      "Your health reminder alarm is working correctly."

  };


  playHealthAlarm();

  vibrateHealthAlarm();


  if (
    "Notification" in window &&
    Notification.permission ===
      "granted"
  ) {

    new Notification(
      "💚 Health Reminder Test",
      {
        body:
          testTip.message,

        requireInteraction:
          true
      }
    );

  } else {

    alert(
      `💚 ${testTip.label}\n\n${testTip.message}`
    );

  }

}


// =========================================================
// START REMINDER CHECKER
// =========================================================

function startHealthReminderChecker() {

  checkHealthReminders();


  setInterval(
    checkHealthReminders,
    1000
  );

}


// =========================================================
// INITIALIZE
//
// IMPORTANT:
// Load saved reminders FIRST.
// Then render.
// Then start notification/alarm checking.
// =========================================================

(async function initializeHealthReminders() {

    await loadHealthReminders();

    renderHealthTips();

    renderHealthReminderRadioButtons();

    updateNotificationStatus();

    startHealthReminderChecker();

})();