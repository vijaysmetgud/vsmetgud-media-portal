// =========================================================
// HEALTH REMINDER SCHEDULE
// =========================================================

const healthTipSchedule = [

  {
    id: "walk",
    label: "Walk",
    time: "09:15",
    message:
      "Walk for 10 minutes now to refresh your energy and improve focus."
  },

  {
    id: "sitting",
    label: "Prolonged Sitting",
    time: "11:00",
    message:
      "You have been sitting for long. Stand up, stretch your legs, and walk for 2 minutes."
  },

  {
    id: "exercise",
    label: "Exercise",
    time: "12:30",
    message:
      "Do a light exercise or stretch break to keep your body active."
  },

  {
    id: "lunch",
    label: "Lunch Break",
    time: "13:00",
    message:
      "It is lunch break time. Eat mindfully and take a short rest."
  },

  {
    id: "tea",
    label: "Tea Break",
    time: "15:00",
    message:
      "Tea break time: stand up, hydrate, and take a short reset."
  },

  {
    id: "compliment",
    label: "Compliment",
    time: "17:30",
    message:
      "Excellent work today. Keep up the good effort—you are doing great!"
  },

  {
    id: "office",
    label: "Office Leaving Time",
    time: "18:00",
    message:
      "Office leaving time. Wrap up your work and finish your day calmly."
  },

  {
    id: "run",
    label: "Run",
    time: "18:30",
    message:
      "Evening run or brisk walk will help keep you energetic and healthy."
  }

];


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

      localStorage.setItem(
        "healthNotificationsEnabled",
        "true"
      );


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

    alert(
      "Health reminder not found."
    );

    return;
  }


  const editModal =
    document.getElementById(
      "healthEditModal"
    );

  const editId =
    document.getElementById(
      "healthEditId"
    );

  const editType =
    document.getElementById(
      "healthEditType"
    );

  const editLabel =
    document.getElementById(
      "healthEditLabel"
    );

  const editTime =
    document.getElementById(
      "healthEditTime"
    );

  const editMessage =
    document.getElementById(
      "healthEditMessage"
    );


  if (
    !editModal ||
    !editId ||
    !editType ||
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


  editType.value =
    reminder.id;


  editLabel.value =
    reminder.label;


  editTime.value =
    reminder.time;


  editMessage.value =
    reminder.message;


  editModal.classList.add(
    "active"
  );

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


// =========================================================
// SAVE HEALTH REMINDER
// =========================================================

function saveHealthReminder() {

  const originalId =
    document.getElementById(
      "healthEditId"
    ).value;


  const newId =
    document.getElementById(
      "healthEditType"
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
  // PREVENT DUPLICATE REMINDER TYPES
  // -------------------------------------------------------

  if (
    newId !== originalId &&
    healthTipSchedule.some(
      tip =>
        tip !== reminder &&
        tip.id === newId
    )
  ) {

    alert(
      "A reminder with this type already exists. Please choose another type."
    );

    return;
  }


  // -------------------------------------------------------
  // UPDATE REMINDER
  // -------------------------------------------------------

  reminder.id =
    newId;

  reminder.label =
    label;

  reminder.time =
    time;

  reminder.message =
    message;


  // -------------------------------------------------------
  // SAVE TO LOCAL STORAGE
  // -------------------------------------------------------

  saveHealthReminders();


  // -------------------------------------------------------
  // REFRESH DISPLAY
  // -------------------------------------------------------

  renderHealthTips();
  
  // -------------------------------------------------------
  // HEALTH REMINDER RADIO BUTTONS
  // -------------------------------------------------------  

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

function saveHealthReminders() {

  try {

    localStorage.setItem(
      "healthTipSchedule",
      JSON.stringify(
        healthTipSchedule
      )
    );

  } catch (error) {

    console.error(
      "Unable to save health reminders:",
      error
    );

  }

}


// =========================================================
// LOAD HEALTH REMINDERS
// =========================================================

function loadHealthReminders() {

  try {

    const saved =
      localStorage.getItem(
        "healthTipSchedule"
      );


    if (!saved) {
      return;
    }


    const parsed =
      JSON.parse(saved);


    if (!Array.isArray(parsed)) {
      return;
    }


    const validReminders =
      parsed.filter(
        tip =>
          tip &&
          typeof tip.id === "string" &&
          typeof tip.label === "string" &&
          typeof tip.time === "string" &&
          typeof tip.message === "string"
      );


    if (!validReminders.length) {
      return;
    }


    healthTipSchedule.length =
      0;


    validReminders.forEach(
      tip => {

        healthTipSchedule.push({

          id:
            tip.id,

          label:
            tip.label,

          time:
            tip.time,

          message:
            tip.message

        });

      }
    );


  } catch (error) {

    console.error(
      "Unable to load health reminders:",
      error
    );

  }

}


// =========================================================
// ALARM SOUND
// =========================================================

let healthAudioContext =
  null;


function playHealthAlarm() {

  try {

    healthAudioContext =
      healthAudioContext ||
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();


    if (
      healthAudioContext.state ===
      "suspended"
    ) {

      healthAudioContext.resume();

    }


    const oscillator =
      healthAudioContext.createOscillator();


    const gain =
      healthAudioContext.createGain();


    oscillator.type =
      "sine";


    oscillator.frequency.setValueAtTime(
      880,
      healthAudioContext.currentTime
    );


    gain.gain.setValueAtTime(
      0.001,
      healthAudioContext.currentTime
    );


    gain.gain.exponentialRampToValueAtTime(
      0.35,
      healthAudioContext.currentTime + 0.05
    );


    gain.gain.exponentialRampToValueAtTime(
      0.001,
      healthAudioContext.currentTime + 0.8
    );


    oscillator.connect(
      gain
    );


    gain.connect(
      healthAudioContext.destination
    );


    oscillator.start();


    oscillator.stop(
      healthAudioContext.currentTime +
      0.8
    );


  } catch (error) {

    console.error(
      "Health alarm error:",
      error
    );

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

loadHealthReminders();

renderHealthTips();

renderHealthReminderRadioButtons();

updateNotificationStatus();

startHealthReminderChecker();