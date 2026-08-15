let currentUser =
    localStorage.getItem(
        "expenseUser"
    ) || "";

let users =
    JSON.parse(
        localStorage.getItem(
            "expenseUsers"
        )
    ) || [];

let expenses = [];

let filteredExpenses = [];

let expenseChart = null;

let pieChart = null;

function formatMoney(amount) {
    return `₹${Number(amount || 0).toFixed(2)}`;
}

function getTopExpenseByPeriod(data, periodLabel) {
    if(!Array.isArray(data) || data.length === 0){
        return { item: "No data", amount: 0 };
    }

    const totals = {};

    data.forEach(exp => {
        const itemName = exp.item || "Unknown";
        totals[itemName] = (totals[itemName] || 0) + Number(exp.price || 0);
    });

    const top = Object.entries(totals).reduce((max, [item, value]) => {
        if(value > max.amount){
            return { item, amount: value };
        }
        return max;
    }, { item: "No data", amount: -1 });

    if(top.amount < 0){
        return { item: "No data", amount: 0 };
    }

    return { item: top.item, amount: top.amount };
}

function updateSummaryInsights() {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const dayStart = new Date(todayString + "T00:00:00");

    const dailyTop = getTopExpenseByPeriod(expenses.filter(exp => exp.date === todayString), "Today");
    const weeklyTop = getTopExpenseByPeriod(expenses.filter(exp => {
        const expDate = new Date(exp.date + "T00:00:00");
        const diffDays = Math.floor((today - expDate) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 6;
    }), "Week");
    const monthlyTop = getTopExpenseByPeriod(expenses.filter(exp => exp.date.startsWith(today.toISOString().slice(0, 7))), "Month");
    const yearlyTop = getTopExpenseByPeriod(expenses.filter(exp => exp.date.startsWith(String(today.getFullYear()))), "Year");
    const overallTop = getTopExpenseByPeriod(expenses, "Overall");

    document.getElementById("dailyInsight").textContent = `Peak: ${dailyTop.item} • ${formatMoney(dailyTop.amount)}`;
    document.getElementById("weeklyInsight").textContent = `Peak: ${weeklyTop.item} • ${formatMoney(weeklyTop.amount)}`;
    document.getElementById("monthlyInsight").textContent = `Peak: ${monthlyTop.item} • ${formatMoney(monthlyTop.amount)}`;
    document.getElementById("yearlyInsight").textContent = `Peak: ${yearlyTop.item} • ${formatMoney(yearlyTop.amount)}`;
    document.getElementById("overallInsight").textContent = `Peak: ${overallTop.item} • ${formatMoney(overallTop.amount)}`;
}

function getTopCategoryForGraphData(data) {
    if(!Array.isArray(data) || data.length === 0){
        return { name: "No data", value: 0 };
    }

    const totals = {};

    data.forEach(item => {
        const key = item.item || item.name || "Unknown";
        totals[key] = (totals[key] || 0) + Number(item.price || item.total || item.amount || 0);
    });

    const top = Object.entries(totals).reduce((max, [label, value]) => {
        if(value > max.value){
            return { name: label, value };
        }
        return max;
    }, { name: "No data", value: -1 });

    return top.value >= 0 ? top : { name: "No data", value: 0 };
}

function updateChartInsightText(){
    const graphType = document.getElementById("graphType")?.value || "normal";
    const filtered = graphType === "normal" ? getFilteredNormalExpenses() : getFilteredSplitHistory();
    const top = getTopCategoryForGraphData(filtered);
    const label = graphType === "normal" ? "Top category" : "Top split";
    const valueText = top.name === "No data" ? "No data" : `${top.name} • ${formatMoney(top.value)}`;

    if(document.getElementById("chartInsight")){
        document.getElementById("chartInsight").textContent = `${label}: ${valueText}`;
    }

    if(document.getElementById("pieInsight")){
        document.getElementById("pieInsight").textContent = `${label}: ${valueText}`;
    }
}

function toggleTheme(){
    const root = document.body;
    const isLight = root.classList.toggle("light-theme");
    localStorage.setItem("expenseTheme", isLight ? "light" : "dark");
}

function applySavedTheme(){
    const theme = localStorage.getItem("expenseTheme");
    if(theme === "light"){
        document.body.classList.add("light-theme");
    }
}

function saveMonthlyBudget(){
    const amount = Number(document.getElementById("monthlyBudgetInput")?.value || 0);
    if(!amount || amount <= 0){
        alert("Please enter a valid monthly budget");
        return;
    }

    localStorage.setItem("monthlyBudget", String(amount));
    updateBudgetInfo();
    updateSmartInsight();
}

function getCurrentMonthTotal(){
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const all = getAllExpensesForGraph();
    return all
        .filter(exp => exp.date && exp.date.startsWith(monthKey))
        .reduce((sum, exp) => sum + Number(exp.price || 0), 0);
}

function updateBudgetInfo(){
    const budgetInput = document.getElementById("monthlyBudgetInput");
    const budget = Number(localStorage.getItem("monthlyBudget") || 0);
    const currentMonthTotal = getCurrentMonthTotal();

    if(budgetInput){
        budgetInput.value = budget > 0 ? String(budget) : "";
    }

    const used = document.getElementById("budgetUsed");
    const remaining = document.getElementById("budgetRemaining");
    const status = document.getElementById("budgetStatus");
    const progress = document.getElementById("budgetProgressBar");

    const usedAmount = Math.min(currentMonthTotal, budget || currentMonthTotal);
    const remainingAmount = budget > 0 ? budget - currentMonthTotal : 0;
    const percentage = budget > 0 ? Math.min((currentMonthTotal / budget) * 100, 100) : 0;

    if(used){ used.textContent = `Used: ${formatMoney(usedAmount)}`; }
    if(remaining){ remaining.textContent = `Remaining: ${formatMoney(Math.max(remainingAmount, 0))}`; }
    if(status){
        if(budget <= 0){
            status.textContent = "Budget status: not set";
        } else if(currentMonthTotal <= budget){
            status.textContent = `Budget status: within plan (${formatMoney(remainingAmount)} left)`;
        } else {
            status.textContent = `Budget status: exceeded by ${formatMoney(currentMonthTotal - budget)}`;
        }
    }
    if(progress){
        progress.style.width = `${budget > 0 ? percentage : 0}%`;
    }
}

function updateSmartInsight(){
    const insight = document.getElementById("dashboardInsight");
    if(!insight){ return; }

    const allExpenses = getAllExpensesForGraph();
    if(!allExpenses.length){
        insight.textContent = "Your expense dashboard is ready. Add your first expense to see insights.";
        return;
    }

    const totals = {};
    allExpenses.forEach(exp => {
        const key = exp.item || "Unknown";
        totals[key] = (totals[key] || 0) + Number(exp.price || 0);
    });

    const maxItem = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    const totalSpend = allExpenses.reduce((sum, exp) => sum + Number(exp.price || 0), 0);
    const budget = Number(localStorage.getItem("monthlyBudget") || 0);

    if(maxItem){
        let message = `Top spending category: ${maxItem[0]} (${formatMoney(maxItem[1])}).`;
        if(budget > 0){
            const delta = totalSpend - budget;
            message += delta > 0 ? ` You are ${formatMoney(delta)} above the monthly budget.` : ` You are ${formatMoney(Math.abs(delta))} below the monthly budget.`;
        }
        insight.textContent = message;
    } else {
        insight.textContent = "Your expense dashboard is ready.";
    }
}

function getSearchableExpenses(){
    const searchInput = document.getElementById("expenseSearch");
    const query = (searchInput?.value || "").trim().toLowerCase();
    let list = [...expenses];

    if(query){
        list = list.filter(exp => {
            return (
                (exp.item || "").toLowerCase().includes(query) ||
                (exp.user || "").toLowerCase().includes(query) ||
                (exp.date || "").toLowerCase().includes(query)
            );
        });
    }

    const sortValue = document.getElementById("expenseSort")?.value || "newest";
    list.sort((a, b) => {
        if(sortValue === "oldest") return new Date(a.date) - new Date(b.date);
        if(sortValue === "highest") return Number(b.price) - Number(a.price);
        if(sortValue === "lowest") return Number(a.price) - Number(b.price);
        return new Date(b.date) - new Date(a.date);
    });

    return list;
}

function downloadCsvExport(){
    const rows = getSearchableExpenses();
    if(!rows.length){
        alert("No expense data available to export");
        return;
    }

    const header = ["Date", "User", "Item", "Price"];
    const csvRows = [header.join(",")];

    rows.forEach(exp => {
        csvRows.push([
            exp.date,
            exp.user,
            `"${String(exp.item || "").replace(/"/g, '""')}"`,
            Number(exp.price || 0)
        ].join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `expense-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    speak("Expense CSV exported");
}

const healthTipSchedule = [
    {
        id: "walk",
        label: "Walk",
        time: "09:15",
        message: "Walk for 10 minutes now to refresh your energy and improve focus."
    },
    {
        id: "exercise",
        label: "Exercise",
        time: "12:30",
        message: "Do a light exercise or stretch break to keep your body active."
    },
    {
        id: "tea",
        label: "Tea Break",
        time: "15:00",
        message: "Tea break time: stand up, hydrate, and take a short reset."
    },
    {
        id: "lunch",
        label: "Lunch Break",
        time: "13:00",
        message: "It is lunch break time. Eat mindfully and take a short rest."
    },
    {
        id: "sitting",
        label: "Prolonged Sitting",
        time: "11:00",
        message: "You have been sitting for long. Stand up, stretch your legs, and walk for 2 minutes."
    },
    {
        id: "office",
        label: "Office Leaving Time",
        time: "18:00",
        message: "Office leaving time. Wrap up your work and finish your day calmly."
    },
    {
        id: "compliment",
        label: "Compliment",
        time: "17:30",
        message: "Excellent work today. Keep up the good effort—you are doing great!"
    },
    {
        id: "run",
        label: "Run",
        time: "18:30",
        message: "Evening run or brisk walk will help keep you energetic and healthy."
    }
];

function getSelectedHealthReminderType(){
    const selected = document.querySelector('input[name="healthReminderType"]:checked');
    return selected ? selected.value : "all";
}

function renderHealthTips(){
    const list = document.getElementById("healthReminderList");
    if(!list){
        return;
    }

    const selectedType = getSelectedHealthReminderType();
    const filteredTips = selectedType === "all"
        ? healthTipSchedule
        : healthTipSchedule.filter(tip => tip.id === selectedType);

    list.innerHTML = filteredTips.map((tip) => `
        <div class="healthReminderItem">
            <span class="tipTime">${tip.time}</span>
            <strong>${tip.label}</strong>
            <p>${tip.message}</p>
        </div>
    `).join("");
}

function getHealthTipKey(tip){
    const today = new Date().toISOString().split("T")[0];
    return `${today}-${tip.id}`;
}

function showHealthReminderToast(message){
    let toast = document.getElementById("healthReminderToast");

    if(!toast){
        toast = document.createElement("div");
        toast.id = "healthReminderToast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(showHealthReminderToast.timeoutId);
    showHealthReminderToast.timeoutId = setTimeout(() => {
        toast.style.display = "none";
    }, 5000);
}

function triggerHealthTip(tip){
    if(!tip){
        return;
    }

    const logKey = getHealthTipKey(tip);
    const reminderLog = JSON.parse(localStorage.getItem("healthReminderLog") || "{}");

    if(reminderLog[logKey]){
        return;
    }

    reminderLog[logKey] = new Date().toISOString();
    localStorage.setItem("healthReminderLog", JSON.stringify(reminderLog));

    showHealthReminderToast(tip.message);

    if(Notification && Notification.permission === "granted"){
        try{
            new Notification(tip.label, { body: tip.message });
        }
        catch(error){
            console.log("Health notification blocked", error);
        }
    }

    if(typeof speak === "function"){
        speak(tip.message);
    }
}

function startHealthReminderChecker(){
    renderHealthTips();

    document.querySelectorAll('input[name="healthReminderType"]').forEach(radio => {
        radio.addEventListener("change", renderHealthTips);
    });

    const checkNow = () => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const selectedType = getSelectedHealthReminderType();

        for(const tip of healthTipSchedule){
            const [hour, minute] = tip.time.split(":").map(Number);
            const targetMinutes = hour * 60 + minute;
            const matchesSelectedType = selectedType === "all" || tip.id === selectedType;

            if(matchesSelectedType && Math.abs(currentMinutes - targetMinutes) <= 2){
                triggerHealthTip(tip);
                break;
            }
        }
    };

    checkNow();
    setInterval(checkNow, 60000);
}

/* ================= SAVE ================= */

function getExpenseKey(user){

    return `expenses_${user}`;
}

function loadExpenses(){

    if(!currentUser){

        expenses = [];

        return;
    }

    expenses =
        JSON.parse(

            localStorage.getItem(

                getExpenseKey(
                    currentUser
                )
            )

        ) || [];
}

function saveExpenses(){

    localStorage.setItem(

        getExpenseKey(
            currentUser
        ),

        JSON.stringify(expenses)
    );
}

/* ================= SPEAK ================= */

function speak(text){

    if(!text){
        return;
    }

    if(speechSynthesis.speaking){

        speechSynthesis.cancel();

    }

    const speech =
        new SpeechSynthesisUtterance(
            text
        );

    speech.lang =
        "en-IN";

    speech.rate =
        0.9;

    speech.pitch =
        1;

    speech.volume =
        1;

    function startSpeech(){

        const voices =
            speechSynthesis
            .getVoices();

        /* prefer Indian voice */

        const indianVoice =

            voices.find(

                voice =>

                    voice.lang
                    ?.toLowerCase()
                    .includes("en-in")
            )

            ||

            voices.find(

                voice =>

                    voice.lang
                    ?.startsWith("en")
            )

            ||

            null;

        if(indianVoice){

            speech.voice =
                indianVoice;
        }

        speech.onerror =
        (e)=>{

            console.log(
                "Speech error:",
                e
            );
        };

        speech.onend =
        ()=>{

            console.log(
                "Speech finished"
            );
        };

        speechSynthesis.speak(
            speech
        );
    }

    /* voices not loaded yet */

    const voices =
        speechSynthesis
        .getVoices();

    if(
        voices.length === 0
    ){

        speechSynthesis
        .onvoiceschanged =

        ()=>{

            startSpeech();
        };

        return;
    }

    startSpeech();
}

function addUserByVoice(name){

    const cleanName =
        name.trim();

    if(!cleanName){

        speak(
            "Invalid user name"
        );

        return;
    }

    const exists =
        users.some(

            user =>

            user.toLowerCase() ===
            cleanName.toLowerCase()
        );

    if(exists){

        speak(
            `${cleanName} already exists`
        );

        return;
    }

    users.push(
        cleanName
    );

    localStorage.setItem(

        "expenseUsers",

        JSON.stringify(
            users
        )
    );

    currentUser =
        cleanName;

    localStorage.setItem(
        "expenseUser",
        currentUser
    );

    document.getElementById(
        "currentUserName"
    ).innerText =
        "User : " + currentUser;

    loadUsers();

    loadGraphUsers();

    loadExpenses();

    renderExpenses();

    speak(
        `${cleanName} added successfully`
    );
}

function addNewUser(){

    const name = prompt(
        "Enter new user name"
    );

    if(!name){

        return;
    }

    const cleanName =
        name.trim();

    if(

        users.some(

            user =>

            user.toLowerCase() ===
            cleanName.toLowerCase()

        )

    ){
        alert(
            "User already exists"
        );

        return;
    }

    users.push(
        cleanName
    );

    localStorage.setItem(

        "expenseUsers",

        JSON.stringify(
            users
        )
    );

    currentUser =
        cleanName;

    document.getElementById(
        "currentUserName"
    ).innerText =
        "User : " + currentUser;    

    localStorage.setItem(
        "expenseUser",
        currentUser
    );

    loadUsers();

    loadGraphUsers();

    loadExpenses();

    renderExpenses();

    speak(
        `${cleanName} added`
    );
}

function loadUsers(){

    const select =
        document.getElementById(
            "userSelect"
        );

    select.innerHTML = "";

    users.forEach(user=>{

        const option =
            document.createElement(
                "option"
            );

        option.value =
            user;

        option.innerText =
            user;

        select.appendChild(
            option
        );
    });
    
    select.value =
        currentUser;
}

function switchUser(){

    const selectedUser =
        document.getElementById(
            "userSelect"
        ).value;

    const confirmed =
        confirm(
            `Switch to ${selectedUser}?`
        );

    if(!confirmed){

        document.getElementById(
            "userSelect"
        ).value =
            currentUser;

        return;
    }

    currentUser =
        selectedUser;

    document.getElementById(
        "currentUserName"
    ).innerText =
        "User : " + currentUser;

    localStorage.setItem(
        "expenseUser",
        currentUser
    );
    
    loadGraphUsers();

    loadExpenses();

    renderExpenses();

    speak(
        `Switched to ${currentUser}`
    );
}

/* ================= ADD EXPENSE ================= */

function addExpense(){

    loadExpenses();

    if(!currentUser){

        alert(
            "Please add/select a user"
        );

        return;
    }

    const date =
        document.getElementById(
            "date"
        ).value;

    const item =
        document.getElementById(
            "item"
        ).value;

    const price =
        Number(

            document.getElementById(
                "price"
            ).value
        );

    if(!date || !item || !price){

        speak(
            "Please fill all fields"
        );

        return;
    }

    expenses.push({

        id:Date.now(),

        user:currentUser,

        date:date,

        item:item,

        price:price
    });

    saveExpenses();

    renderExpenses();

    speak(
        "Expense added successfully"
    );

    document.getElementById(
        "item"
    ).value = "";

    document.getElementById(
        "price"
    ).value = "";
}

function showAllExpenses(){

    renderExpenses();

    speak(
        "Showing all expenses"
    );
}

function deleteExpense(id){

    const confirmDelete =
        confirm("Delete expense?");

    if(!confirmDelete){
        return;
    }

    expenses =
        expenses.filter(
            exp => exp.id !== id
        );

    saveExpenses();

    renderExpenses();

    speak("Expense deleted");
}

function editExpense(id){

    const expense =
        expenses.find(
            exp => exp.id === id
        );

    if(!expense){
        return;
    }

    const newItem =
        prompt(
            "Edit item",
            expense.item
        );

    const newPrice =
        prompt(
            "Edit price",
            expense.price
        );

    if(!newItem || !newPrice){
        return;
    }

    expense.item =
        newItem;

    expense.price =
        Number(newPrice);

    saveExpenses();

    renderExpenses();

    speak("Expense updated");
}

/* ================= VOICE ================= */

function startVoice(){

    const SpeechRecognition =

        window.SpeechRecognition ||

        window.webkitSpeechRecognition;

    if(!SpeechRecognition){

        alert(
            "Speech Recognition not supported"
        );

        return;
    }

    let selectedUser = "";
    let item = "";
    let amount = 0;
    let userRetries = 0;
    let itemRetries = 0;
    let amountRetries = 0;
    const MAX_RETRIES = 2;

    const dateInput =

        document.getElementById(
            "date"
        );

    /* ================= DATE FIRST ================= */

    try{

        dateInput.focus();

        dateInput.showPicker?.();

    }

    catch(err){

        console.log(
            "Date picker fallback"
        );
    }

    let voiceStarted = false;

    function startVoiceFlow(){

        if(voiceStarted){
            return;
        }

        voiceStarted = true;

        askUser();
    }

    /* WAIT FOR DATE */

    setTimeout(()=>{

        if(dateInput.value){

            startVoiceFlow();
        }

    },300);

    dateInput.onchange =
    ()=>{

        dateInput.onchange =
            null;

        if(dateInput.value){

            startVoiceFlow();
        }
    };

    /* ================= COMMON ================= */

    function speakThenListen(
        message,
        callback
    ){

        speechSynthesis.cancel();

        const speech =
            new SpeechSynthesisUtterance(
                message
            );

        speech.lang = "en-IN";
        speech.rate = 0.9;

        speech.onend = ()=>{

            const recognition =
                new (
                    window.SpeechRecognition ||
                    window.webkitSpeechRecognition
                )();

            recognition.lang =
                "en-IN";

            recognition.continuous =
                false;

            recognition.interimResults =
                false;

            recognition.maxAlternatives =
                2;

            recognition.start();

            const voiceStatus =
                document.getElementById(
                    "voiceStatus"
                );

            if(voiceStatus){

                voiceStatus.innerText =
                    "🎤 Listening...";
            }

            let resultReceived = false;

            const timeout = setTimeout(()=>{

                if(!resultReceived){

                    recognition.abort();

                    if(voiceStatus){

                        voiceStatus.innerText =
                            "❌ No input received (timeout)";
                    }

                    callback("");
                }

            }, 5000);

            recognition.onresult =
            (event)=>{

                resultReceived = true;
                clearTimeout(timeout);

                const text =
                    event.results[0][0]
                    .transcript
                    .trim();

                if(voiceStatus){

                    voiceStatus.innerText =
                        "✅ " + text;
                }

                recognition.stop();

                callback(text);
            };

            recognition.onerror =
            (event)=>{

                resultReceived = true;
                clearTimeout(timeout);

                const errorMessage =
                    event.error || "unknown error";

                if(voiceStatus){

                    voiceStatus.innerText =
                        `❌ Error: ${errorMessage}`;
                }

                recognition.abort();

                callback("");
            };

            recognition.onend = ()=>{

                if(!resultReceived){

                    resultReceived = true;
                    clearTimeout(timeout);

                    if(voiceStatus){

                        voiceStatus.innerText =
                            "❌ Listening ended";
                    }

                    callback("");
                }
            };
        };

        speechSynthesis.speak(
            speech
        );
    }

    /* ================= USER ================= */

    function askUser(){

        if(userRetries >= MAX_RETRIES){

            speak("Switching to manual input");

            const name = prompt(
                "Enter user name"
            );

            if(!name){
                alert("Voice input cancelled");
                return;
            }

            selectedUser =
                name.trim();

            const existingUser =
                users.find(
                    user =>
                        user.toLowerCase() ===
                        selectedUser.toLowerCase()
                );

            if(existingUser){
                selectedUser = existingUser;
            } else {
                users.push(selectedUser);
                localStorage.setItem(
                    "expenseUsers",
                    JSON.stringify(users)
                );
                loadUsers();
                loadGraphUsers();
            }

            currentUser = selectedUser;
            document.getElementById(
                "currentUserName"
            ).innerText =
                "User : " + selectedUser;

            localStorage.setItem(
                "expenseUser",
                selectedUser
            );

            loadExpenses();
            renderExpenses();

            speak("User selected. Say expense item or say cancel");

            askItemOrCommand();

            return;
        }

        speakThenListen(

            "Please say user name",

            (text)=>{

                if(!text.trim()){

                    userRetries++;

                    speakThenListen(

                        "Sorry, I didn't catch that. Please say user name again",

                        ()=> askUser()
                    );

                    return;
                }

                userRetries = 0;

                selectedUser =
                    text.trim();

                const existingUser =

                    users.find(

                        user =>

                            user
                            .toLowerCase()

                            ===

                            selectedUser
                            .toLowerCase()
                    );

                let message = "";

                if(existingUser){

                    selectedUser =
                        existingUser;

                    message =
                        "User already exists";
                }

                else{

                    users.push(
                        selectedUser
                    );

                    localStorage.setItem(

                        "expenseUsers",

                        JSON.stringify(
                            users
                        )
                    );

                    loadUsers();

                    loadGraphUsers();

                    message =
                        "User added successfully";
                }

                currentUser =
                    selectedUser;

                const userSelect =

                    document.getElementById(
                        "userSelect"
                    );

                userSelect.value =
                    selectedUser;

                document.getElementById(
                    "currentUserName"
                ).innerText =

                    `User : ${selectedUser}`;

                localStorage.setItem(

                    "expenseUser",

                    selectedUser
                );

                loadExpenses();

                renderExpenses();

                speakThenListen(

                    message +
                    ". Say expense item or say cancel",

                    (text)=>{

                        askItemOrCommand(text);
                    }
                );
            }
        );
    }

    function askItemOrCommand(text=""){

        const voiceText =
            text.toLowerCase().trim();

        if(voiceText === "cancel" || voiceText.includes("cancel")){
            speak("Voice input cancelled");
            return;
        }

        if(

            voiceText.includes("today")

            ||

            voiceText.includes("month")

            ||

            voiceText.includes("year")

            ||

            voiceText.includes("settlement")

            ||

            voiceText.includes("split")

            ||

            voiceText.startsWith(
                "add user"
            )

        ){

            processVoiceExpense(
                voiceText
            );

            return;
        }

        const hasNumber =
            /\d/.test(
                voiceText
            );

        if(hasNumber){

            processVoiceExpense(
                voiceText
            );

            return;
        }

        if(!voiceText){
            askItem();
            return;
        }

        item =
            voiceText;

        askAmount();
    }

    /* ================= AMOUNT ================= */

    function askAmount(){

        if(amountRetries >= MAX_RETRIES){

            const amountInput = prompt(
                "Enter amount for " + item
            );

            if(!amountInput){
                speak("Amount cancelled");
                return;
            }

            amount = Number(
                amountInput.replace(/[^0-9]/g, "")
            );

            if(!amount || amount <= 0){
                speak("Invalid amount");
                return;
            }

            addExpenseFromVoice();

            return;
        }

        speakThenListen(

            "Please say amount",

            (text)=>{

                text =
                    text
                    .toLowerCase()
                    .replace(
                        /rupees|rupee|rs/g,
                        ""
                    )
                    .trim();

                /* direct numeric */

                let parsedAmount =

                    Number(

                        text.replace(
                            /[^0-9]/g,
                            ""
                        )
                    );

                /* words support */

                if(!parsedAmount){

                    const words = {

                        one:1,
                        two:2,
                        three:3,
                        four:4,
                        five:5,
                        six:6,
                        seven:7,
                        eight:8,
                        nine:9,
                        ten:10,
                        hundred:100,
                        thousand:1000
                    };

                    parsedAmount = 0;

                    text.split(" ")
                    .forEach(word=>{

                        if(words[word]){

                            parsedAmount +=
                                words[word];
                        }
                    });
                }

                if(

                    !parsedAmount ||

                    parsedAmount <= 0
                ){

                    amountRetries++;

                    speak(
                        "Invalid amount. Please say again"
                    );

                    askAmount();

                    return;
                }

                amountRetries = 0;

                amount = parsedAmount;

                addExpenseFromVoice();
            }
        );
    }

    function addExpenseFromVoice(){

        const selectedDate =

            document.getElementById(
                "date"
            ).value ||

            new Date()
            .toISOString()
            .split("T")[0];

        expenses.push({

            id:Date.now(),

            user:currentUser,

            date:selectedDate,

            item:item,

            price:Number(amount)
        });

        saveExpenses();

        renderExpenses();

        speak(

            `${item} expense of ${amount} rupees added`
        );

        alert(

    `Expense Added

    Date:
    ${selectedDate}

    User:
    ${selectedUser}

    Item:
    ${item}

    Amount:
    ₹${amount}`
        );
    }

    function askItem(){

        if(itemRetries >= MAX_RETRIES){

            const itemInput = prompt(
                "Enter expense item"
            );

            if(!itemInput){
                speak("Item cancelled");
                return;
            }

            item = itemInput.trim();

            askAmount();

            return;
        }

        speakThenListen(

            "Please say expense item",

            (text)=>{

                if(!text.trim()){

                    itemRetries++;

                    speak(
                        "Sorry, I didn't catch that. Please say the item again"
                    );

                    askItem();

                    return;
                }

                itemRetries = 0;

                item =
                    text.trim();

                askAmount();
            }
        );
    }
}

/* ================= PROCESS VOICE ================= */

function processVoiceExpense(text){

    text =
        text.toLowerCase().trim();

    loadExpenses();

    console.log(
        "Voice Raw:",
        text
    );
    

    if(

        text.includes(
            "show settlement"
        )

        ||

        text.includes(
            "final settlement"
        )

        ||

        text.includes(
            "who owes"
        )
    ){

        showSettlement();

        return;
    }

    /* ================= ADD USER ================= */

    if(

        text.startsWith(
            "add user"
        )

        ||

        text.startsWith(
            "new user"
        )
    ){

        console.log(
            "Voice add user:",
            text
        );

        let userName = text

            .replace(
                /^add user/i,
                ""
            )

            .replace(
                /^new user/i,
                ""
            )

            .replace(
                /[^a-zA-Z ]/g,
                ""
            )

            .trim();

        if(!userName){

            speak(
                "Please say user name"
            );

            return;
        }

        addUserByVoice(
            userName
        );

        return; // VERY IMPORTANT
    }

    /* ================= SPLIT SHARE ================= */

    if(text === "split"){

        console.log(
            "Guided split voice"
        );

        startSplitVoice();

        return;
    }

    if(
        text.startsWith(
            "split "
        )
    ){

        console.log(
            "Fast split voice"
        );

        processSplitVoice(
            text
        );

        return;
    }

    /* TODAY */

    if(
        text.includes(
            "today expenses"
        )
    ){

        showTodayExpenses();

        return;
    }

    /* MONTH */

    if(
        text.includes(
            "monthly expenses"
        )
    ){

        showMonthlyExpenses();

        return;
    }

    /* YEAR */

    if(
        text.includes(
            "yearly expenses"
        )
    ){

        showYearlyExpenses();

        return;
    }

    /* ================= DATE EXPENSES ================= */

    if(
        text.includes(
            "expenses on"
        )
    ){

        const date =

            text.replace(
                "expenses on",
                ""
            ).trim();

        showExpensesByDate(
            date
        );

        return;
    }

    if(
        text.includes(
            "show expenses for"
        )
    ){

        const date =

            text.replace(
                "show expenses for",
                ""
            ).trim();

        showExpensesByDate(
            date
        );

        return;
    }


    /* IGNORE COMMANDS */

    if(

        text.includes("user")

        ||

        text.includes("settlement")

        ||

        text.includes("split")

        ||

        text.includes("expenses")

        ||

        text.includes("today")

        ||

        text.includes("month")

        ||

        text.includes("year")
    ){

        return;
    } 

    /* CLEAN EXTRA SPACES */

    text =
        text.replace(
            /\s+/g,
            " "
        );

    const words =
        text.split(" ");

    let amount = null;

    let itemWords = [];

    words.forEach(word=>{

        const cleanedWord =
            word.replace(
                /[^0-9]/g,
                ""
            );

        const num =
            Number(cleanedWord);

        if(

            cleanedWord &&
            !isNaN(num)

        ){

            amount = num;
        }

        else{

            itemWords.push(word);
        }
    });

    /* REMOVE DUPLICATE WORDS */

    itemWords =
        [...new Set(itemWords)];

    const item =
        itemWords.join(" ");

    if(!item || !amount){

        console.log(
            "Could not parse:",
            text
        );

        speak(
            "Could not understand expense"
        );

        return;
    }

    const selectedDate =

        document.getElementById(
            "date"
        ).value ||

        new Date()
        .toISOString()
        .split("T")[0];

    expenses.push({

        id:Date.now(),

        user:currentUser,

        date:selectedDate,

        item:item,

        price:Number(amount)
    });

    saveExpenses();

    renderExpenses();

    speak(

        `${item} expense of ${amount} rupees added`
    );
}

/* ================= RENDER ================= */

function renderExpenses(){

    filteredExpenses = getSearchableExpenses();

    const expenseList =
        document.getElementById(
            "expenseList"
        );

    expenseList.innerHTML = "";

    if(!filteredExpenses || filteredExpenses.length === 0){

        expenseList.innerHTML = `

        <div class="expenseItem">

            <h3>
                No expenses found
            </h3>

            <p>
                Add your first expense
            </p>

        </div>
    `;

    document.getElementById(
        "dailyTotal"
    ).innerText = "₹0";

    document.getElementById(
        "weeklyTotal"
    ).innerText = "₹0";

    document.getElementById(
        "monthlyTotal"
    ).innerText = "₹0";

    document.getElementById(
        "yearlyTotal"
    ).innerText = "₹0";

    document.getElementById(
        "overallTotal"
    ).innerText = "₹0";

    updateSummaryInsights();
    renderChart();

    renderPieChart();

    renderSplitHistory();

    return;
    }


    let daily = 0;

    let weekly = 0;

    let monthly = 0;

    let yearly = 0;

    let overall = 0;

    const now =
        new Date();

    const today =
        now.toISOString()
        .split("T")[0];

    filteredExpenses
    .slice()
    .reverse()

    .forEach(exp=>{

        const d =
            new Date(exp.date);

        overall += exp.price;

        if(exp.date === today){

            daily += exp.price;
        }

        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

        if(diffDays >= 0 && diffDays <= 6){
            weekly += exp.price;
        }

        if(

            d.getMonth() ===
            now.getMonth()

            &&

            d.getFullYear() ===
            now.getFullYear()

        ){

            monthly += exp.price;
        }

        if(

            d.getFullYear() ===
            now.getFullYear()

        ){

            yearly += exp.price;
        }

        expenseList.innerHTML += `

        <div class="expenseItem">

            <h3>${exp.item}</h3>

            <p>👤 ${exp.user}</p>

            <p>${exp.date}</p>

            <h2>₹${exp.price}</h2>

            <button onclick="editExpense(${exp.id})">
                Edit
            </button>

            <button onclick="deleteExpense(${exp.id})">
                Delete
            </button>

        </div>
        `;
    });

    document.getElementById(
        "dailyTotal"
    ).innerText =
        "₹" + daily;

    document.getElementById(
        "weeklyTotal"
    ).innerText =
        "₹" + weekly;

    document.getElementById(
        "monthlyTotal"
    ).innerText =
        "₹" + monthly;

    document.getElementById(
        "yearlyTotal"
    ).innerText =
        "₹" + yearly;

    document.getElementById(
        "overallTotal"
    ).innerText =
        "₹" + overall;

    updateSummaryInsights();
    updateBudgetInfo();
    updateSmartInsight();
    
    renderChart();    

    renderPieChart();    

    renderSplitHistory();
}

/* ================= TODAY ================= */

function showTodayExpenses(){

    const today =
        new Date()
        .toISOString()
        .split("T")[0];

    const filtered =
        expenses.filter(
            exp => exp.date === today
        );

    renderFilteredExpenses(
        filtered,
        "Today's Expenses"
    );
}

/* ================= MONTH ================= */

function showMonthlyExpenses(){

    const now =
        new Date();

    const filtered =
        expenses.filter(exp=>{

            const d =
                new Date(exp.date);

            return(

                d.getMonth() ===
                now.getMonth()

                &&

                d.getFullYear() ===
                now.getFullYear()

            );
        });

    renderFilteredExpenses(
        filtered,
        "Monthly Expenses"
    );
}

/* ================= YEAR ================= */

function showYearlyExpenses(){

    const year =
        new Date()
        .getFullYear();

    const filtered =
        expenses.filter(exp=>{

            return(

                new Date(exp.date)
                .getFullYear() === year

            );
        });

    renderFilteredExpenses(
        filtered,
        "Yearly Expenses"
    );
}

/* ================= DATE FILTER ================= */

function showExpensesByDate(date){

    const filtered =

        expenses.filter(

            exp => exp.date === date
        );

    renderFilteredExpenses(

        filtered,

        `Expenses for ${date}`
    );

    if(filtered.length === 0){

        speak(
            `No expenses found for ${date}`
        );

        return;
    }

    speak(
        `Showing expenses for ${date}`
    );
}

function getExpensesByDate(){

    const selectedDate =
        prompt(

            "Enter date (YYYY-MM-DD)"
        );

    if(!selectedDate){

        return;
    }

    showExpensesByDate(
        selectedDate
    );
}

/* ================= SHOW EXPENSE WINDOW ================= */

function openExpenseFilterWindow(){

    const choice =
        prompt(

`Show Expenses For

1 = Today
2 = Month
3 = Year
4 = All
5 = Select Date`
        );

    switch(choice){

        case "1":

            showTodayExpenses();
            break;

        case "2":

            showMonthlyExpenses();
            break;

        case "3":

            showYearlyExpenses();
            break;

        case "4":

            showAllExpenses();
            break;

        case "5":

            getExpensesByDate();
            break;

        default:

            speak(
                "Invalid selection"
            );
    }
}

/* ================= FILTERED RENDER ================= */

function renderFilteredExpenses(
    list,
    title
){
    
    filteredExpenses =
        [...list];

    const expenseList =
        document.getElementById(
            "expenseList"
        );

    expenseList.innerHTML =
        `<h2>${title}</h2>`;

    let total = 0;

    list.forEach(exp=>{

        total += exp.price;

        expenseList.innerHTML += `

            <div class="expenseItem">

                <h3>
                    ${exp.item}
                </h3>

                <p>
                    ${exp.date}
                </p>

                <h2>
                    ₹${exp.price}
                </h2>

            </div>

        `;
    });

    expenseList.innerHTML += `

        <div class="expenseItem">

            <h2>
                Total = ₹${total}
            </h2>

        </div>

    `;

    speak(
        `${title} total is ${total} rupees`
    );

    renderChart();

    renderPieChart();
}

/* ================= SPLIT EXPENSES ================= */

function splitExpense(){

    const selectedDate =

        document.getElementById(
            "date"
        ).value;

    if(!selectedDate){

        alert(
            "Please select split date from calendar"
        );

        return;
    }

    if(users.length === 0){

        alert(
            "Please add users first"
        );

        return;
    }

    let paidBy =
        prompt(
            "Who paid total amount?"
        )
        ?.trim();

    if(!paidBy){

        alert(
            "Please enter payer"
        );

        return;
    }

    /* MATCH EXISTING USER */

    const matchedUser =

        users.find(

            user =>

                user
                .toLowerCase()

                ===

                paidBy
                .toLowerCase()
        );

    if(!matchedUser){

        alert(
            "User not found"
        );

        return;
    }

    paidBy =
        matchedUser;

    let splitItems = [];

    let grandTotal = 0;

    /* ================= MULTIPLE ITEMS ================= */

    while(true){

        const item =
            prompt(

"Expense item? (Cancel to finish)"

            );

        if(!item){

            break;
        }

        const amount =
            Number(

                prompt(
                    `Amount for ${item}?`
                )
            );

        if(!amount){

            alert(
                "Invalid amount"
            );

            continue;
        }

        splitItems.push({

            item,
            amount
        });

        grandTotal +=
            amount;

        const more =
            confirm(

"Add another item?"
            );

        if(!more){

            break;
        }
    }

    if(splitItems.length === 0){

        alert(
            "No split items added"
        );

        return;
    }

    alert(

`${paidBy}

spent

₹${grandTotal}`
    );

    /* ================= SELECT USERS ================= */

    let selectedUsers =
        [];

    users.forEach(user=>{

        const include =
            confirm(

                `Include ${user} in split?`
            );

        if(include){

            selectedUsers.push(
                user
            );
        }
    });

    if(
        selectedUsers.length === 0
    ){

        alert(
            "No users selected"
        );

        return;
    }

    /* auto include payer */

    if(

        !selectedUsers.includes(
            paidBy
        )

    ){

        selectedUsers.push(
            paidBy
        );
    }

    /* SAVE EACH ITEM */

    splitItems.forEach(exp=>{

        saveSplitExpense(

            exp.item,

            exp.amount,

            selectedUsers,

            paidBy
        );
    });

    /* ================= SUCCESS ================= */

    let itemsText = "";

    splitItems.forEach(item=>{

        itemsText +=

    `${item.item}
    ₹${item.amount}

    `;
    });

    const eachSplit = Number(
        (
            grandTotal /
            selectedUsers.length
        ).toFixed(2)
    );

    alert(

    `Split Successful

    Date:
    ${selectedDate}

    Paid By:
    ${paidBy}

    Items:

    ${itemsText}

    Total:
    ₹${grandTotal}

    Users:
    ${selectedUsers.join(", ")}

    Each Split:
    ₹${eachSplit}`
    );

/* REFRESH UI */

loadExpenses();

renderExpenses();

renderSplitHistory();

/* OPEN RESULT */

setTimeout(()=>{

    showSettlement();

},200);

}


function startSplitVoice(){

    const dateInput =

        document.getElementById(
            "date"
        );

    /* RESET EVENTS */

    dateInput.onchange =
        null;

    try{

        dateInput.focus();

        dateInput.showPicker?.();

    }

    catch(err){

        console.log(
            "Date picker fallback"
        );
    }

    /* WAIT FOR DATE */

    let splitVoiceStarted =
        false;

    function startSplitFlow(){

        if(splitVoiceStarted){
            return;
        }

        splitVoiceStarted =
            true;

        startSplitVoiceFlow();
    }

    /* WAIT FOR DATE */

    setTimeout(()=>{

        if(dateInput.value){

            startSplitFlow();
        }

    },300);

    dateInput.onchange =
    ()=>{

        dateInput.onchange =
            null;

        if(dateInput.value){

            startSplitFlow();
        }
    };
}

function startSplitVoiceFlow(){

    const SpeechRecognition =

        window.SpeechRecognition ||

        window.webkitSpeechRecognition;

    if(!SpeechRecognition){

        alert(
            "Speech Recognition not supported"
        );

        return;
    }

    let selectedUsers = [];
    let item = "";
    let amount = 0;
    let paidBy = "";

    askUsers();

    function speakThenListen(
        message,
        callback
    ){

        speechSynthesis.cancel();

        const speech =
            new SpeechSynthesisUtterance(
                message
            );

        speech.lang = "en-IN";
        speech.rate = 0.9;

        speech.onend = ()=>{

            const recognition =
                new (
                    window.SpeechRecognition ||
                    window.webkitSpeechRecognition
                )();

            recognition.lang =
                "en-IN";

            recognition.continuous =
                false;

            recognition.interimResults =
                false;

            recognition.maxAlternatives =
                1;

            recognition.start();

            const voiceStatus =
                document.getElementById(
                    "voiceStatus"
                );

            if(voiceStatus){

                voiceStatus.innerText =
                    "🎤 Listening...";
            }

            recognition.onresult =
            (event)=>{

                const text =
                    event.results[0][0]
                    .transcript
                    .trim();

                if(voiceStatus){

                    voiceStatus.innerText =
                        "✅ " + text;
                }

                recognition.stop();

                callback(text);
            };

            recognition.onerror =
            ()=>{

                if(voiceStatus){

                    voiceStatus.innerText =
                        "❌ Could not hear";
                }

                recognition.stop();

                callback("");
            };
        };

        speechSynthesis.speak(
            speech
        );
    }

    function askUsers(){

        speakThenListen(

            "Please say users",

            (text)=>{

                if(!text){

                    speakThenListen(

                        "Please say users again",

                        ()=> askUsers()
                    );

                    return;
                }

                selectedUsers =

                    text
                    .toLowerCase()
                    .replace(/,/g," ")
                    .split(" ")
                    .filter(Boolean)
                    .map(name=>

                        users.find(

                            user=>

                                user
                                .toLowerCase()

                                ===

                                name
                        )
                    )
                    .filter(Boolean);

                if(
                    selectedUsers.length === 0
                ){

                    speakThenListen(

                        "No valid users found. Please try again",

                        ()=> askUsers()
                    );

                    return;
                }

                askItem();
            }
        );
    }

    function askItem(){

        speakThenListen(

            "Please say expense item",

            (text)=>{

                if(!text){

                    speakThenListen(

                        "Please say expense item again",

                        ()=> askItem()
                    );

                    return;
                }

                item =
                    text.trim();

                askAmount();
            }
        );
    }

    function askAmount(){

        speakThenListen(

            "Please say amount",

            (text)=>{

                if(!text){

                    speakThenListen(

                        "Please say amount again",

                        ()=> askAmount()
                    );

                    return;
                }

                text =
                    text
                    .toLowerCase()
                    .replace(
                        /rupees|rupee|rs/g,
                        ""
                    )
                    .trim();

                amount =

                    Number(

                        text.replace(
                            /[^0-9]/g,
                            ""
                        )
                    );

                if(!amount){

                    const words = {

                        one:1,
                        two:2,
                        three:3,
                        four:4,
                        five:5,
                        six:6,
                        seven:7,
                        eight:8,
                        nine:9,
                        ten:10,
                        hundred:100,
                        thousand:1000
                    };

                    amount = 0;

                    text.split(" ")
                    .forEach(word=>{

                        if(words[word]){

                            amount +=
                                words[word];
                        }
                    });
                }

                if(!amount){

                    speakThenListen(

                        "Invalid amount, please try again",

                        ()=> askAmount()
                    );

                    return;
                }

                askPayer();
            }
        );
    }

    function askPayer(){

        speakThenListen(

            "Who paid total amount",

            (text)=>{

                if(!text){

                    speakThenListen(

                        "Please say payer name again",

                        ()=> askPayer()
                    );

                    return;
                }

                const cleanText =

                    text
                    .toLowerCase()
                    .replace(
                        /[^a-z ]/g,
                        ""
                    )
                    .trim();

                const matchedUser =

                    users.find(

                        user =>

                            cleanText.includes(

                                user
                                .toLowerCase()
                            )
                    );

                if(!matchedUser){

                    speakThenListen(

                        "User not found, please try again",

                        ()=> askPayer()
                    );

                    return;
                }


                paidBy =
                    matchedUser;

                /* auto include payer */

                if(

                    !selectedUsers.includes(
                        paidBy
                    )

                ){

                    selectedUsers.push(
                        paidBy
                    );
                }

                saveSplitExpense(

                    item,

                    amount,

                    selectedUsers,

                    paidBy
                );

                renderSplitHistory();

                renderExpenses();

                const splitAmount =
                    Number(

                        (
                            amount /

                            selectedUsers.length
                        )

                        .toFixed(2)
                    );

                alert(

    `Split Successful

    Date:
    ${document.getElementById("date").value}

    Item:
    ${item}

    Paid By:
    ${paidBy}

    Total:
    ₹${amount}

    Users:
    ${selectedUsers.join(", ")}

    Each Pays:
    ₹${splitAmount}`
                );

                showSettlement();
            }
        );
    }
}

/* ================= FAST SPLIT VOICE ================= */

function processSplitVoice(text){

    text =
        text
        .toLowerCase()
        .trim();

    console.log(
        "Fast split raw:",
        text
    );

    /* remove 'split' */

    text =
        text.replace(
            /^split\s+/,
            ""
        );

    /* amount */

    const amountMatch =
        text.match(/\d+/);

    if(!amountMatch){

        speak(
            "Amount not found"
        );

        return;
    }

    const amount =
        Number(
            amountMatch[0]
        );

    /* item */

    const item =

        text
        .split(/\d+/)[0]
        .trim();

    if(!item){

        speak(
            "Expense item not found"
        );

        return;
    }

    /* payer */

    let paidBy =
        currentUser;

    const paidMatch =

        text.match(
            /paid by\s+([a-z ]+)/i
        );

    if(paidMatch){

        paidBy =
            paidMatch[1]
            .trim();
    }

    const matchedUser =

        users.find(

            user=>

                user
                .toLowerCase()

                ===

                paidBy
                .toLowerCase()
        );

    if(!matchedUser){

        speak(
            "Invalid payer"
        );

        return;
    }

    paidBy =
        matchedUser;

    /* users */

    let userText =
        text
        .replace(item,"")
        .replace(amount,"")
        .replace(
            /paid by.+$/i,
            ""
        )
        .trim();

    const selectedUsers =

        userText
        .split(" ")
        .filter(Boolean)
        .map(name=>

            users.find(

                user=>

                    user
                    .toLowerCase()

                    ===

                    name
                    .toLowerCase()
            )
        )
        .filter(Boolean);

    if(
        selectedUsers.length === 0
    ){

        speak(
            "Please say users"
        );

        return;
    }

    /* auto include payer */

    if(

        !selectedUsers.includes(
            paidBy
        )

    ){

        selectedUsers.push(
            paidBy
        );
    }

    saveSplitExpense(

        item,

        amount,

        selectedUsers,

        paidBy
    );

    renderSplitHistory();

    renderExpenses();

    const splitAmount =

        Number(

            (
                amount /

                selectedUsers.length
            )

            .toFixed(2)
        );

    speak(

`${item}
split added.
Total ${amount} rupees.
Each pays
${splitAmount}`
    );

    alert(

`Split Successful

Date:
${document.getElementById("date").value}

Item:
${item}

Paid By:
${paidBy}

Total:
₹${amount}

Users:
${selectedUsers.join(", ")}

Each Pays:
₹${splitAmount}`
    );
}

function saveSplitExpense(

    item,

    totalAmount,

    selectedUsers,

    paidBy
){

    const splitAmount =

        Number(

            (
                totalAmount /

                selectedUsers.length
            )

            .toFixed(2)
        );

    const splitData = {

        date:
            document.getElementById(
                "date"
            ).value,

        item,

        total:
            totalAmount,

        paidBy,

        users:
            selectedUsers,

        each:
            splitAmount
    };

    /* SAVE */

    saveSplitHistory(
        splitData
    );

    console.log(
        "Split Saved:",
        splitData
    );
}

function saveSplitHistory(splitData){

    let splitHistory =
        JSON.parse(

            localStorage.getItem(
                "splitHistory"
            )

        ) || [];

    splitHistory.push(
        splitData
    );

    localStorage.setItem(

        "splitHistory",

        JSON.stringify(
            splitHistory
        )
    );
}

function renderSplitHistory(){

    const container =
        document.getElementById(
            "splitExpenseList"
        );

    if(!container){
        return;
    }

    const splitHistory =

        JSON.parse(

            localStorage.getItem(
                "splitHistory"
            )

        ) || [];

    container.innerHTML = "";

    console.log(
        "Split History:",
        splitHistory
    );

    if(splitHistory.length === 0){

        container.innerHTML =

        `
        <div class="expenseItem">
            No split expenses
        </div>
        `;

        return;
    }

    /* ================= GROUP BY DATE + USER ================= */

    const grouped = {};

    splitHistory.forEach(split=>{

        const key =
            `${split.date}_${split.paidBy}`;

        if(!grouped[key]){

            grouped[key] = {

                date:
                    split.date,

                paidBy:
                    split.paidBy,

                totalSpent:0,

                items:[],

                rawOwes:[]
            };
        }

        grouped[key]
        .totalSpent +=
            split.total;

        grouped[key]
        .items.push({

            item:
                split.item,

            total:
                split.total,

            users:
                split.users,

            each:
                split.each
        });

        split.users.forEach(user=>{

            if(

                user.toLowerCase()

                !==

                split.paidBy
                .toLowerCase()

            ){

                const oweText =

                `${user} owes ${split.paidBy} ₹${split.each}`;

                if(

                    !grouped[key]
                    .rawOwes.includes(
                        oweText
                    )

                ){

                    grouped[key]
                    .rawOwes.push(
                        oweText
                    );
                }
            }
        });
    });

    /* ================= RENDER GROUPED HISTORY ================= */

    Object.values(grouped)

    .reverse()

    .forEach(group=>{

        let itemsHtml = "";

        group.items.forEach(item=>{

            itemsHtml += `

            <p>

                🧾 ${item.item}

                - ₹${item.total}

            </p>
            `;
        });

        let owesHtml = "";

        if(group.rawOwes.length){

            group.rawOwes.forEach(owe=>{

                owesHtml +=

                `
                <p>

                    💸 ${owe}

                </p>
                `;
            });

        }else{

            owesHtml =

            `
            <p>

                No owes

            </p>
            `;
        }

        container.innerHTML +=

        `
        <div class="expenseItem">

            <h2>

                📅 ${group.date}

            </h2>

            <h3>

                👤 ${group.paidBy}

                spent

            </h3>

            ${itemsHtml}

            <h3>

                💰 Total Spent:
                ₹${group.totalSpent}

            </h3>

            <hr>

            <h3>

                💸 Raw Owes

            </h3>

            ${owesHtml}

        </div>
        `;
    });

    /* ================= NET OUTSTANDING ================= */

    const pairBalances = {};

    /* build pairwise owes */

    splitHistory.forEach(split=>{

        split.users.forEach(user=>{

            if(

                user.toLowerCase()

                ===

                split.paidBy
                .toLowerCase()

            ){
                return;
            }

            const key =

                `${user}|${split.paidBy}`;

            pairBalances[key] =

                (
                    pairBalances[key]
                    || 0
                )

                +

                split.each;
        });
    });

    /* relationship wise netting */

    const processed =
        new Set();

    let tableHtml =

    `
    <hr>

    <h2>
        💰 Net Outstanding Owes
    </h2>

    <div
    style="
    overflow-x:auto;
    width:100%;
    -webkit-overflow-scrolling:touch;
    "
    >

    <table
    style="
    min-width:700px;
    width:100%;
    border-collapse:collapse;
    text-align:center;
    "
    >

    <tr>
        <th>From User</th>
        <th>To User</th>
        <th>Amount</th>
    </tr>
    `;

    Object.keys(pairBalances)

    .forEach(key=>{

        if(
            processed.has(key)
        ){
            return;
        }

        const [

            fromUser,

            toUser

        ] =
            key.split("|");

        const reverseKey =

            `${toUser}|${fromUser}`;

        const forward =

            pairBalances[key]
            || 0;

        const reverse =

            pairBalances[
                reverseKey
            ]
            || 0;

        const net =

            forward - reverse;

        if(net > 0){

            tableHtml +=

            `
            <tr>

                <td>
                    ${fromUser}
                </td>

                <td>
                    ${toUser}
                </td>

                <td>
                    ₹${net.toFixed(2)}
                </td>

            </tr>
            `;
        }

        else if(net < 0){

            tableHtml +=

            `
            <tr>

                <td>
                    ${toUser}
                </td>

                <td>
                    ${fromUser}
                </td>

                <td>
                    ₹${Math.abs(
                        net
                    ).toFixed(2)}
                </td>

            </tr>
            `;
        }

        processed.add(key);

        processed.add(
            reverseKey
        );
    });

    tableHtml +=

    `
    </table>

    </div>
    `;

    container.innerHTML +=
        tableHtml;
}

/* ================= FINAL SETTLEMENT ================= */

function showSettlement(){

    const oldModal =

        document.querySelector(
            ".settlementModal"
        );

    if(oldModal){

        oldModal.remove();
    }

    const result =
        getSettlementData();

    if(result.total === 0){

        alert(
            "No split settlements found"
        );

        speak(
            "No split settlements found"
        );

        return;
    }    

    const settlementDiv =
        document.createElement(
            "div"
        );

    settlementDiv.className =
        "settlementModal";

    settlementDiv.innerHTML = `

    <div class="settlementCard">

        <button
            class="closeSettlementBtn"
            onclick="
            document.body.style.overflow='auto';
            document
            .querySelector(
            '.settlementModal'
            )
            ?.remove()
            "
        >
            ✖ Close
        </button>

        <h1>
            💰 Final Settlement
        </h1>

        <h3>
            Total Expense :
            ₹${result.total}
        </h3>

        <h3>
            Share Type :
            Dynamic Split
        </h3>

        <hr>

        <h2>
            👤 Who Spent
        </h2>

        ${result.spentHtml}

        <hr>

        <h2>
            💸 Raw Owes
        </h2>

        ${result.oweHtml}

    </div>
    `;

    document.body.appendChild(
        settlementDiv
    );

    document.body.style.overflow =
        "hidden";

    speak(

`Settlement ready.
Total split expense ${result.total} rupees`
);

} // close showSettlement()

function getSettlementData(){

    const splitHistory =

        JSON.parse(

            localStorage.getItem(
                "splitHistory"
            )

        ) || [];

    if(splitHistory.length === 0){

        return {

            total:0,

            spentHtml:"",

            oweHtml:""
        };
    }

    const spent = {};

    let total = 0;
    let spentHtml = "";
    let rawOwesHtml = "";

    /* ================= RAW HISTORY ================= */

    splitHistory.forEach(split=>{

        total += split.total;

        spent[split.paidBy] =

            (spent[split.paidBy] || 0)

            + split.total;

        spentHtml += `

        <div class="settlementItem">

            <h3>
                👤 ${split.paidBy}
            </h3>

            <p>
                📅 ${split.date}
            </p>

            <p>
                🧾 ${split.item}
            </p>

            <p>
                💰 ₹${split.total}
            </p>

            <p>
                👥 ${split.users.join(", ")}
            </p>

        </div>
        `;

        split.users.forEach(user=>{

            if(

                user.toLowerCase()

                !==

                split.paidBy.toLowerCase()

            ){

                rawOwesHtml += `

                <div class="settlementItem owe">

                    <h3>

                        💸 ${user}

                        owes

                        ${split.paidBy}

                    </h3>

                    <h2>

                        ₹${split.each}

                    </h2>

                    <p>

                        📅 ${split.date}

                    </p>

                    <p>

                        🧾 ${split.item}

                    </p>

                </div>
                `;

            }
        });
    });

    /* ================= NET OUTSTANDING ================= */

    const pairBalances = {};

    splitHistory.forEach(split=>{

        split.users.forEach(user=>{

            if(

                user.toLowerCase()

                ===

                split.paidBy
                .toLowerCase()

            ){
                return;
            }

            const key =

                `${user}|${split.paidBy}`;

            pairBalances[key] =

                (
                    pairBalances[key]
                    || 0
                )

                +

                split.each;
        });
    });

    let netHtml =

    `
    <hr>

    <h2>
        💰 Net Outstanding Owes
    </h2>

    <table
    style="
    width:100%;
    text-align:center;
    border-collapse:collapse;
    "
    >

    <tr>
        <th>From User</th>
        <th>To User</th>
        <th>Amount</th>
    </tr>
    `;

    const processed =
        new Set();

    Object.keys(pairBalances)

    .forEach(key=>{

        if(
            processed.has(key)
        ){
            return;
        }

        const [

            fromUser,

            toUser

        ] =
            key.split("|");

        const reverseKey =

            `${toUser}|${fromUser}`;

        const forward =

            pairBalances[key]
            || 0;

        const reverse =

            pairBalances[
                reverseKey
            ]
            || 0;

        const net =
            forward - reverse;

        if(net > 0){

            netHtml +=

            `
            <tr>

                <td>
                    ${fromUser}
                </td>

                <td>
                    ${toUser}
                </td>

                <td>
                    ₹${net.toFixed(2)}
                </td>

            </tr>
            `;
        }

        else if(net < 0){

            netHtml +=

            `
            <tr>

                <td>
                    ${toUser}
                </td>

                <td>
                    ${fromUser}
                </td>

                <td>
                    ₹${Math.abs(
                        net
                    ).toFixed(2)}
                </td>

            </tr>
            `;
        }

        processed.add(key);

        processed.add(
            reverseKey
        );
    });

    netHtml +=
        `</table>`;

    return {

        total,

        spentHtml,

        oweHtml:
            rawOwesHtml +
            netHtml
    };
}

function downloadSettlementReport(){

    const result =
        getSettlementData();

    let text =

`FINAL SETTLEMENT

=================

TOTAL:
₹${result.total}

`;

    text +=
        result.spentHtml
        .replace(/<[^>]*>/g,"");

    text += "\n";

    text +=
        result.oweHtml
        .replace(/<[^>]*>/g,"");

    const blob =
        new Blob(
            [text],
            {type:"text/plain"}
        );

    const a =
        document.createElement(
            "a"
        );

    a.href =
        URL.createObjectURL(
            blob
        );

    a.download =
        "settlement-report.txt";

    a.click();

    speak(
        "Settlement report downloaded"
    );
}

function getExpenseSummaryRows(){
    const allUsers = users.length ? users : [currentUser].filter(Boolean);
    const splitHistory = JSON.parse(localStorage.getItem("splitHistory") || "[]");
    const rows = [];

    allUsers.forEach(user => {
        const userExpenses = JSON.parse(localStorage.getItem(getExpenseKey(user)) || "[]");
        const personalTotal = userExpenses.reduce((sum, exp) => sum + Number(exp.price || 0), 0);

        const daily = userExpenses.filter(exp => exp.date === new Date().toISOString().split("T")[0]).reduce((sum, exp) => sum + Number(exp.price || 0), 0);
        const weekly = userExpenses.filter(exp => {
            const expDate = new Date(exp.date + "T00:00:00");
            const now = new Date();
            const diffDays = Math.floor((now - expDate) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 6;
        }).reduce((sum, exp) => sum + Number(exp.price || 0), 0);
        const monthly = userExpenses.filter(exp => exp.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, exp) => sum + Number(exp.price || 0), 0);
        const yearly = userExpenses.filter(exp => exp.date.startsWith(new Date().getFullYear().toString())).reduce((sum, exp) => sum + Number(exp.price || 0), 0);

        const splitPaid = splitHistory.filter(split => split.paidBy === user).reduce((sum, split) => sum + Number(split.total || 0), 0);
        const splitOwed = splitHistory.filter(split => split.users.includes(user)).reduce((sum, split) => sum + Number(split.each || 0), 0);

        rows.push({
            user,
            daily,
            weekly,
            monthly,
            yearly,
            splitPaid,
            splitOwed,
            personalTotal,
            total: personalTotal + splitPaid + splitOwed
        });
    });

    return rows.sort((a, b) => b.total - a.total);
}

function getExpenseSummaryTableHtml(){
    const rows = getExpenseSummaryRows();
    const maxRows = rows.length ? rows.reduce((max, row) => row.total > max.total ? row : max, rows[0]) : null;
    const minRows = rows.length ? rows.reduce((min, row) => row.total < min.total ? row : min, rows[0]) : null;

    const tableRows = rows.map(row => `
        <tr>
            <td>${row.user}</td>
            <td>₹${row.daily.toFixed(2)}</td>
            <td>₹${row.weekly.toFixed(2)}</td>
            <td>₹${row.monthly.toFixed(2)}</td>
            <td>₹${row.yearly.toFixed(2)}</td>
            <td>₹${row.splitPaid.toFixed(2)}</td>
            <td>₹${row.splitOwed.toFixed(2)}</td>
            <td>₹${row.total.toFixed(2)}</td>
        </tr>
    `).join("");

    const insight = rows.length
        ? `Highest spender: ${maxRows.user} (₹${maxRows.total.toFixed(2)}) | Lowest spender: ${minRows.user} (₹${minRows.total.toFixed(2)})`
        : "No expense data available";

    return `
        <div style="padding:20px; font-family:Arial, sans-serif; background:#111827; color:#fff; max-width:1100px; margin:20px auto;">
            <h2 style="text-align:center; margin-bottom:12px;">Expense Summary Table</h2>
            <p style="text-align:center; margin-bottom:20px; color:#cfe7ff;">${insight}</p>
            <table style="width:100%; border-collapse:collapse; background:#1f2937; color:#fff; border:1px solid #374151;">
                <thead>
                    <tr>
                        <th style="border:1px solid #374151; padding:10px;">User</th>
                        <th style="border:1px solid #374151; padding:10px;">Daily</th>
                        <th style="border:1px solid #374151; padding:10px;">Weekly</th>
                        <th style="border:1px solid #374151; padding:10px;">Monthly</th>
                        <th style="border:1px solid #374151; padding:10px;">Yearly</th>
                        <th style="border:1px solid #374151; padding:10px;">Split Paid</th>
                        <th style="border:1px solid #374151; padding:10px;">Split Owed</th>
                        <th style="border:1px solid #374151; padding:10px;">Total</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
    `;
}

function showExpenseSummaryTable(){
    const summary = getExpenseSummaryTableHtml();
    const popup = window.open("", "_blank", "width=1200,height=800");
    if(!popup){
        alert("Popup blocked. Please allow pop-ups for the expense summary table.");
        return;
    }
    popup.document.write(summary);
    popup.document.close();
    speak("Expense summary table opened");
}

function shareExpenseSummary(mode){
    const summaryHtml = getExpenseSummaryTableHtml();
    const plainText = summaryHtml.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const message = encodeURIComponent(`Expense Summary\n\n${plainText}`);

    if(mode === "whatsapp"){
        window.open(`https://wa.me/?text=${message}`, "_blank");
        return;
    }

    if(mode === "telegram"){
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${message}`, "_blank");
        return;
    }

    const subject = encodeURIComponent("Expense Summary Report");
    const body = encodeURIComponent(`Expense Summary\n\n${plainText}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

/* ================= DOWNLOAD ================= */

function downloadTextFile(){

    if(expenses.length === 0){

        speak(
            "No expenses available"
        );

        return;
    }

    let text =

`
Expense Report

========================

`;

    let total = 0;

    expenses.forEach(exp=>{

        total += exp.price;

        text +=

`
Date : ${exp.date}

Item : ${exp.item}

Price : ₹${exp.price}

------------------------

`;
    });

    text +=

`
TOTAL = ₹${total}
`;

    const blob =
        new Blob(

            [text],

            {
                type:"text/plain"
            }

        );

    const a =
        document.createElement("a");

    a.href =
        URL.createObjectURL(blob);

    a.download =
        `${currentUser}-expense-report-${new Date()
            .toISOString()
            .split("T")[0]}.txt`;

    a.click();

    speak(
        "Expense report downloaded"
    );
}

/* ================= INIT ================= */

document.getElementById(
    "date"
).value =

    new Date()
    .toISOString()
    .split("T")[0];

applySavedTheme();

loadUsers();

loadGraphUsers();

const expenseSearch = document.getElementById("expenseSearch");
if(expenseSearch){
    expenseSearch.addEventListener("input", renderExpenses);
}

const expenseSort = document.getElementById("expenseSort");
if(expenseSort){
    expenseSort.addEventListener("change", renderExpenses);
}

if(users.length === 0){

    document.getElementById(
        "currentUserName"
    ).innerText =
        "User : Not Selected";

    speak(
        "Please add a user"
    );
}

else{

    document.getElementById(
        "currentUserName"
    ).innerText =
        "User : " + currentUser;

    loadUsers();

    loadExpenses();

    renderExpenses();

    renderSplitHistory();
    updateBudgetInfo();
    updateSmartInsight();
}

function deleteUser(){

    if(!currentUser){

        alert(
            "No user selected"
        );

        return;
    }

    const confirmed =
        confirm(

            `Delete ${currentUser} and all expense data?`

        );

    if(!confirmed){

        return;
    }

    /* DELETE USER DATA */

    localStorage.removeItem(

        getExpenseKey(
            currentUser
        )
    );

    /* REMOVE USER */

    users =
        users.filter(

            user =>

            user !== currentUser
        );

    localStorage.setItem(

        "expenseUsers",

        JSON.stringify(
            users
        )
    );

    speak(
        `${currentUser} deleted`
    );

    /* SWITCH TO NEXT USER */

    if(users.length > 0){

        currentUser =
            users[0];

        localStorage.setItem(

            "expenseUser",

            currentUser
        );

        document.getElementById(
            "currentUserName"
        ).innerText =
            "User : " + currentUser;

        loadUsers();

        loadGraphUsers();

        loadExpenses();

        renderExpenses();

        renderSplitHistory();
        
    }

    else{

        currentUser = "";

        localStorage.removeItem(
            "expenseUser"
        );

        document.getElementById(
            "currentUserName"
        ).innerText =
            "User : Not Selected";

        document.getElementById(
            "userSelect"
        ).innerHTML = "";

        expenses = [];

        renderExpenses();
    }

    alert(
        "User deleted successfully"
    );

    loadGraphUsers();
    updateBudgetInfo();
    updateSmartInsight();
}

/* ======================================================
   GRAPH ENGINE
====================================================== */

function getSelectedChartType(){
    return document.querySelector('input[name="chartKind"]:checked')?.value || "bar";
}

function getSelectedGraphUser(){
    const selectedValue = document.getElementById("graphUser")?.value || "all";
    if(selectedValue === "current"){
        return currentUser || "all";
    }
    return selectedValue;
}

function getAllExpensesForGraph(){
    const selectedUser = getSelectedGraphUser();

    if(selectedUser === "all"){
        let allExpenses = [];
        users.forEach(user => {
            const userExpenses = JSON.parse(localStorage.getItem(getExpenseKey(user))) || [];
            allExpenses = allExpenses.concat(
                userExpenses.map(exp => ({ ...exp, user }))
            );
        });
        return allExpenses;
    }

    const owner = selectedUser === "current" ? (currentUser || "all") : selectedUser;
    const expensesForUser = JSON.parse(localStorage.getItem(getExpenseKey(owner))) || [];
    return expensesForUser.map(exp => ({ ...exp, user: owner }));
}

function getFilteredNormalExpenses(){
    let data = getAllExpensesForGraph();

    const filter = document.getElementById("graphFilter")?.value || "overall";
    const selectedDate = document.getElementById("graphDate")?.value;
    const selectedMonth = document.getElementById("graphMonth")?.value;
    const selectedYear = document.getElementById("graphYear")?.value;
    const today = new Date().toISOString().split("T")[0];

    switch(filter){
        case "today":
            data = data.filter(exp => exp.date === today);
            break;
        case "date":
            data = data.filter(exp => exp.date === selectedDate);
            break;
        case "month":
            data = data.filter(exp => exp.date.startsWith(selectedMonth));
            break;
        case "year":
            data = data.filter(exp => exp.date.startsWith(selectedYear));
            break;
        case "overall":
        default:
            break;
    }

    return data;
}

function getFilteredSplitHistory(){
    let splitHistory = JSON.parse(localStorage.getItem("splitHistory")) || [];
    const selectedUser = getSelectedGraphUser();
    const filter = document.getElementById("graphFilter")?.value || "overall";
    const selectedDate = document.getElementById("graphDate")?.value;
    const selectedMonth = document.getElementById("graphMonth")?.value;
    const selectedYear = document.getElementById("graphYear")?.value;
    const today = new Date().toISOString().split("T")[0];

    if(selectedUser !== "all"){
        splitHistory = splitHistory.filter(split =>
            split.paidBy === selectedUser || split.users.includes(selectedUser)
        );
    }

    switch(filter){
        case "today":
            splitHistory = splitHistory.filter(split => split.date === today);
            break;
        case "date":
            splitHistory = splitHistory.filter(split => split.date === selectedDate);
            break;
        case "month":
            splitHistory = splitHistory.filter(split => split.date.startsWith(selectedMonth));
            break;
        case "year":
            splitHistory = splitHistory.filter(split => split.date.startsWith(selectedYear));
            break;
        case "overall":
        default:
            break;
    }

    return splitHistory;
}

function getTimelineLabels(filterValue, selectedDate, selectedMonth, selectedYear){
    const today = new Date();

    if(filterValue === "today"){
        const labels = [];
        for(let i = 6; i >= 0; i--){
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            labels.push(d.toISOString().split("T")[0]);
        }
        return labels;
    }

    if(filterValue === "week"){
        const labels = [];
        for(let i = 6; i >= 0; i--){
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            labels.push(d.toISOString().split("T")[0]);
        }
        return labels;
    }

    if(filterValue === "date" && selectedDate){
        return [selectedDate];
    }

    if(filterValue === "month" && selectedMonth){
        const [year, month] = selectedMonth.split("-").map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const labels = [];
        for(let day = 1; day <= daysInMonth; day++){
            const date = new Date(year, month - 1, day);
            labels.push(date.toISOString().split("T")[0]);
        }
        return labels;
    }

    if(filterValue === "year" && selectedYear){
        return [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
    }

    const years = new Set();
    const items = getAllExpensesForGraph().concat(JSON.parse(localStorage.getItem("splitHistory") || "[]"));
    items.forEach(item => {
        const date = item.date || item.timestamp || "";
        if(date) {
            const match = date.match(/^(\d{4})/);
            if(match) years.add(match[1]);
        }
    });

    return [...years].sort();
}

function getBucketForFilter(dateValue, filterValue, selectedDate, selectedMonth, selectedYear){
    if(!dateValue) return "Unknown";

    if(filterValue === "today" || filterValue === "week" || filterValue === "date"){
        return dateValue;
    }

    if(filterValue === "month"){
        return dateValue;
    }

    if(filterValue === "year"){
        const monthIndex = new Date(`${dateValue}T00:00:00`).getMonth();
        return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIndex];
    }

    const yearMatch = String(dateValue).match(/^(\d{4})/);
    return yearMatch ? yearMatch[1] : "Unknown";
}

function buildNormalChartData(){
    const expenses = getFilteredNormalExpenses();
    const filter = document.getElementById("graphFilter")?.value || "overall";
    const selectedDate = document.getElementById("graphDate")?.value;
    const selectedMonth = document.getElementById("graphMonth")?.value;
    const selectedYear = document.getElementById("graphYear")?.value;
    const labels = getTimelineLabels(filter, selectedDate, selectedMonth, selectedYear);
    const seriesByUser = {};
    const usersInScope = new Set();

    expenses.forEach(exp => {
        const owner = exp.user || currentUser || "Unknown";
        usersInScope.add(owner);
        if(!seriesByUser[owner]){
            seriesByUser[owner] = Object.fromEntries(labels.map(label => [label, 0]));
        }

        const bucket = getBucketForFilter(exp.date, filter, selectedDate, selectedMonth, selectedYear);
        if(seriesByUser[owner][bucket] !== undefined){
            seriesByUser[owner][bucket] += Number(exp.price || 0);
        }
    });

    const totals = {};
    expenses.forEach(exp => {
        totals[exp.item] = (totals[exp.item] || 0) + Number(exp.price);
    });

    const chartUsers = getSelectedGraphUser() === "all" ? [...usersInScope] : [getSelectedGraphUser() === "current" ? (currentUser || "Unknown") : getSelectedGraphUser()];

    return {
        labels: Object.keys(totals),
        values: Object.values(totals),
        lineDatasets: chartUsers.map(user => ({
            label: user,
            data: labels.map(label => seriesByUser[user]?.[label] || 0),
            borderColor: ["#22c55e", "#3b82f6", "#f97316", "#a78bfa", "#facc15", "#34d399"][chartUsers.indexOf(user) % 6],
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: ["#22c55e", "#3b82f6", "#f97316", "#a78bfa", "#facc15", "#34d399"][chartUsers.indexOf(user) % 6],
            fill: false,
            tension: 0.28
        }))
    };
}

function buildSplitChartData(){
    const splitHistory = getFilteredSplitHistory();
    const filter = document.getElementById("graphFilter")?.value || "overall";
    const selectedDate = document.getElementById("graphDate")?.value;
    const selectedMonth = document.getElementById("graphMonth")?.value;
    const selectedYear = document.getElementById("graphYear")?.value;
    const labels = getTimelineLabels(filter, selectedDate, selectedMonth, selectedYear);
    const payerTotals = {};
    const oweTotals = {};
    const seriesByUser = {};

    splitHistory.forEach(split => {
        const bucket = getBucketForFilter(split.date, filter, selectedDate, selectedMonth, selectedYear);
        const participants = new Set([...(split.users || []), split.paidBy]);

        participants.forEach(user => {
            if(!seriesByUser[user]){
                seriesByUser[user] = Object.fromEntries(labels.map(label => [label, 0]));
            }
        });

        payerTotals[split.paidBy] = (payerTotals[split.paidBy] || 0) + split.total;

        if(seriesByUser[split.paidBy] && seriesByUser[split.paidBy][bucket] !== undefined){
            seriesByUser[split.paidBy][bucket] += Number(split.total || 0);
        }

        split.users.forEach(user => {
            if(user === split.paidBy) return;
            oweTotals[user] = (oweTotals[user] || 0) + split.each;
            if(seriesByUser[user] && seriesByUser[user][bucket] !== undefined){
                seriesByUser[user][bucket] += Number(split.each || 0);
            }
        });
    });

    const labelsForBar = [...new Set([...Object.keys(payerTotals), ...Object.keys(oweTotals)])];

    return {
        labels: labelsForBar,
        paidValues: labelsForBar.map(user => payerTotals[user] || 0),
        oweValues: labelsForBar.map(user => oweTotals[user] || 0),
        lineDatasets: (getSelectedGraphUser() === "all" ? Object.keys(seriesByUser) : [getSelectedGraphUser() === "current" ? (currentUser || "Unknown") : getSelectedGraphUser()]).map((user, idx) => ({
            label: user,
            data: labels.map(label => seriesByUser[user]?.[label] || 0),
            borderColor: ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#14b8a6"][idx % 6],
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#14b8a6"][idx % 6],
            fill: false,
            tension: 0.28
        }))
    };
}

function renderChart(){
    const canvas = document.getElementById("expenseChart");
    if(!canvas){ return; }

    const chartKind = getSelectedChartType();
    const graphType = document.getElementById("graphType")?.value || "normal";
    const ctx = canvas.getContext("2d");

    if(chartKind === "pie" || chartKind === "doughnut"){
        renderPieChart();
        return;
    }

    let labels = [];
    let datasets = [];

    if(graphType === "normal"){
        const normalData = buildNormalChartData();

        if(chartKind === "line"){
            labels = getTimelineLabels(
                document.getElementById("graphFilter")?.value || "overall",
                document.getElementById("graphDate")?.value,
                document.getElementById("graphMonth")?.value,
                document.getElementById("graphYear")?.value
            );
            datasets = normalData.lineDatasets || [{
                label: "Expense Trend",
                data: normalData.values,
                borderColor: "#22c55e",
                backgroundColor: "rgba(34,197,94,0.2)",
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: "#22c55e",
                fill: false,
                tension: 0.28
            }];
        } else {
            labels = normalData.labels;
            datasets = [{
                label: "Expenses",
                data: normalData.values,
                backgroundColor: "#facc15",
                borderRadius: 12
            }];
        }
    } else {
        const splitData = buildSplitChartData();

        if(chartKind === "line"){
            labels = getTimelineLabels(
                document.getElementById("graphFilter")?.value || "overall",
                document.getElementById("graphDate")?.value,
                document.getElementById("graphMonth")?.value,
                document.getElementById("graphYear")?.value
            );
            datasets = splitData.lineDatasets || [
                {
                    label: "Paid Amount",
                    data: splitData.paidValues,
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59,130,246,0.18)",
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: "#3b82f6",
                    fill: false,
                    tension: 0.28
                },
                {
                    label: "Owe Amount",
                    data: splitData.oweValues,
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239,68,68,0.18)",
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: "#ef4444",
                    fill: false,
                    tension: 0.28
                }
            ];
        } else {
            labels = splitData.labels;
            datasets = [
                {
                    label: "Paid Amount",
                    data: splitData.paidValues,
                    backgroundColor: "#3b82f6",
                    borderRadius: 12
                },
                {
                    label: "Owe Amount",
                    data: splitData.oweValues,
                    backgroundColor: "#ef4444",
                    borderRadius: 12
                }
            ];
        }
    }

    if(expenseChart){
        expenseChart.destroy();
    }

    expenseChart = new Chart(ctx, {
        type: chartKind === "line" ? "line" : "bar",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: "white" } }
            },
            scales: {
                x: {
                    ticks: { color: "white" },
                    grid: { color: "rgba(255,255,255,0.08)" },
                    title: { display: true, text: chartKind === "line" ? (graphType === "normal" ? "Time Period" : "Time Period") : (graphType === "normal" ? "Expense Item" : "Users"), color: "white" }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "white" },
                    grid: { color: "rgba(255,255,255,0.08)" },
                    title: { display: true, text: "Amount (₹)", color: "white" }
                }
            }
        }
    });

    updateChartInsightText();
}

function renderPieChart(){
    const pieCanvas = document.getElementById("expensePieChart");
    if(!pieCanvas){ return; }

    const chartKind = getSelectedChartType();
    if(chartKind !== "pie" && chartKind !== "doughnut"){
        if(pieChart){ pieChart.destroy(); }
        pieCanvas.parentElement.style.display = "none";
        return;
    }

    pieCanvas.parentElement.style.display = "block";

    const graphType = document.getElementById("graphType")?.value || "normal";
    const ctx = pieCanvas.getContext("2d");

    let labels = [];
    let values = [];

    if(graphType === "normal"){
        const normalData = buildNormalChartData();
        labels = normalData.labels;
        values = normalData.values;
    } else {
        const splitData = buildSplitChartData();
        labels = splitData.labels;
        values = splitData.paidValues;
    }

    const maxValue = Math.max(...values, 0);

    if(pieChart){
        pieChart.destroy();
    }

    pieChart = new Chart(ctx, {
        type: chartKind === "doughnut" ? "doughnut" : "pie",
        data: {
            labels,
            datasets: [{
                data: values,
                offset: values.map(v => v === maxValue && maxValue > 0 ? 18 : 0),
                backgroundColor: values.map((v, idx) => v === maxValue ? "#facc15" : [
                    "#fbbf24", "#60a5fa", "#34d399", "#f87171", "#a78bfa", "#f472b6",
                    "#38bdf8", "#f59e0b", "#4ade80", "#fb7185", "#c084fc", "#2dd4bf"
                ][idx % 12]),
                borderColor: values.map(v => v === maxValue ? "#f59e0b" : "rgba(255,255,255,0.15)"),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: "white" } }
            }
        }
    });

    updateChartInsightText();
}

function initChartTypeRadios(){
    const radios = document.querySelectorAll('input[name="chartKind"]');
    radios.forEach(radio => {
        radio.addEventListener("change", () => {
            renderChart();
            renderPieChart();
        });
    });
}

[
    "graphType",
    "graphFilter",
    "graphDate",
    "graphMonth",
    "graphYear",
    "graphUser"
].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
        renderChart();
        renderPieChart();
    });
});

initChartTypeRadios();

startHealthReminderChecker();

setTimeout(() => {
    renderChart();
    renderPieChart();
}, 500);

function openChartWindow(chartType, title, headingText){
    const graphType = document.getElementById("graphType")?.value || "normal";
    let labels = [];
    let datasets = [];
    let summary = "";

    if(graphType === "normal"){
        const normalData = buildNormalChartData();
        labels = normalData.labels;
        const values = normalData.values;

        if(chartType === "line"){
            datasets = [{
                label: "Expense Trend",
                data: values,
                borderColor: "#22c55e",
                backgroundColor: "rgba(34,197,94,0.2)",
                borderWidth: 3,
                fill: false,
                tension: 0.3,
                pointRadius: 4
            }];
        } else if(chartType === "pie"){
            summary = `labels:${JSON.stringify(labels)}, data:${JSON.stringify(values)}`;
            datasets = [{ data: values, backgroundColor: ["#fbbf24", "#60a5fa", "#34d399", "#f87171", "#a78bfa", "#f472b6", "#38bdf8", "#f59e0b", "#4ade80"] }];
        } else if(chartType === "doughnut"){
            datasets = [{ data: values, backgroundColor: ["#fbbf24", "#60a5fa", "#34d399", "#f87171", "#a78bfa", "#f472b6", "#38bdf8", "#f59e0b", "#4ade80"] }];
        } else {
            datasets = [{ label: "Expenses", data: values, backgroundColor: "#facc15", borderRadius: 12 }];
        }
    } else {
        const splitData = buildSplitChartData();
        labels = splitData.labels;

        if(chartType === "line"){
            datasets = [
                { label: "Paid Amount", data: splitData.paidValues, borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.15)", borderWidth: 3, fill: false, tension: 0.3, pointRadius: 4 },
                { label: "Owe Amount", data: splitData.oweValues, borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 3, fill: false, tension: 0.3, pointRadius: 4 }
            ];
        } else if(chartType === "pie"){
            datasets = [{ data: splitData.paidValues, backgroundColor: ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#14b8a6"] }];
        } else if(chartType === "doughnut"){
            datasets = [{ data: splitData.paidValues, backgroundColor: ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#14b8a6"] }];
        } else {
            datasets = [
                { label: "Paid Amount", data: splitData.paidValues, backgroundColor: "#3b82f6", borderRadius: 12 },
                { label: "Owe Amount", data: splitData.oweValues, backgroundColor: "#ef4444", borderRadius: 12 }
            ];
        }
    }

    const chartWindow = window.open("", "_blank", "width=1400,height=900");
    chartWindow.document.write(`
<html>
<head>
<title>${title}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>
body{background:#111827;color:white;font-family:Arial;padding:30px;margin:0;}
h1{text-align:center;margin-bottom:20px;}
canvas{width:100% !important;height:72vh !important;}
</style>
</head>
<body>
<h1>${headingText}</h1>
<canvas id="graph"></canvas>
<script>
const ctx = document.getElementById('graph').getContext('2d');
new Chart(ctx, {
    type: '${chartType === 'line' ? 'line' : chartType === 'pie' ? 'pie' : chartType === 'doughnut' ? 'doughnut' : 'bar'}',
    data: {
        labels: ${JSON.stringify(labels)},
        datasets: ${JSON.stringify(datasets)}
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: 'white' } } },
        scales: ${JSON.stringify(chartType === 'line' || chartType === 'bar' ? {
            x: { ticks: { color: 'white' }, title: { display: true, text: graphType === 'normal' ? 'Expense Item' : 'Users', color: 'white' } },
            y: { beginAtZero: true, ticks: { color: 'white' }, title: { display: true, text: 'Amount (₹)', color: 'white' } }
        } : {})}
    }
});
<\/script>
</body>
</html>`);
    chartWindow.document.close();
}

function openBarChartWindow(){
    openChartWindow("bar", "Expense Bar Graph", "📊 Bar Graph - Individual Expense Breakdown");
}

function openPieChartWindow(){
    openChartWindow("pie", "Expense Pie Graph", "🥧 Pie Graph - Individual Expense Share");
}

function openLineChartWindow(){
    openChartWindow("line", "Expense Trend Graph", "📈 Line Graph - Individual Expense Trend");
}

function loadGraphUsers(){
    const graphUser = document.getElementById("graphUser");
    if(!graphUser){ return; }

    graphUser.innerHTML = '<option value="all">All Users</option>';

    users.forEach(user => {
        graphUser.innerHTML += `<option value="${user}">${user}</option>`;
    });

    const currentValue = currentUser || "all";
    if([...graphUser.options].some(option => option.value === currentValue)){
        graphUser.value = currentValue;
    } else {
        graphUser.value = "all";
    }
}

/* ================= SPLIT GRAPH ================= */

function openSplitGraphWindow(){

    const splitHistory =
        getFilteredSplitHistory();

    const payerTotals = {};
    const oweTotals = {};

    let historyHtml = "";

    splitHistory.forEach(split=>{

        /* PAYER */

        payerTotals[
            split.paidBy
        ] =

        (
            payerTotals[
                split.paidBy
            ] || 0
        )

        +

        split.total;

        /* OWE USERS */

        split.users.forEach(user=>{

            if(
                user === split.paidBy
            ){
                return;
            }

            oweTotals[user] =

                (
                    oweTotals[user]
                    || 0
                )

                +

                split.each;
        });

        /* HISTORY */

        historyHtml += `

        <div
        style="
        background:#1f2937;
        padding:20px;
        border-radius:20px;
        margin-bottom:15px;
        "
        >

        <h2>
            📅 ${split.date}
        </h2>

        <h3
        style="
        color:#22c55e
        "
        >
            👤 ${split.paidBy}

            paid ₹${split.total}
        </h3>

        <p>
            🧾 ${split.item}
        </p>

        <h4>
            💸 Owe Details
        </h4>

        ${split.users

        .filter(
            u=>u !== split.paidBy
        )

        .map(user=>`

        <p
        style="
        color:#ef4444
        "
        >

        ${user}

        owes

        ₹${split.each}

        </p>

        `)

        .join("")
        }

        </div>
        `;
    });

    const labels =

        [

            ...new Set([

                ...Object.keys(
                    payerTotals
                ),

                ...Object.keys(
                    oweTotals
                )
            ])
        ];

    const paidValues =
        labels.map(user=>

            payerTotals[user]
            || 0
        );

    const oweValues =
        labels.map(user=>

            oweTotals[user]
            || 0
        );

    const payerUsers =
        [
            ...new Set(
                splitHistory.map(
                    s=>s.paidBy
                )
            )
        ];

    const colors =
        labels.map(user=>{

            if(payerUsers.includes(user)){

                return "#3b82f6";
            }

            return "#ef4444";
        });

    const chartWindow =
        window.open(
            "",
            "_blank",
            "width=1500,height=1000"
        );

    chartWindow.document.write(`

<html>

<head>

<title>
Split Share Graph
</title>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>

body{
    background:#111827;
    color:white;
    font-family:Arial;
    padding:30px;
}

canvas{
    width:100% !important;
    height:70vh !important;
}

</style>

</head>

<body>

<h1>
💰 Split Share Analytics
</h1>

<canvas id="splitGraph"></canvas>

<script>

new Chart(

document
.getElementById(
"splitGraph"
),

{

type:"bar",

data:{

labels:

${JSON.stringify(labels)},

datasets:[

{

label:
"Paid Amount",

data:

${JSON.stringify(
paidValues
)},

backgroundColor:
"#3b82f6"
},

{

label:
"Owe Amount",

data:

${JSON.stringify(
oweValues
)},

backgroundColor:
"#ef4444"
}
]
},

options:{

responsive:true,

maintainAspectRatio:false,

scales:{

y:{

beginAtZero:true
}
}
}
});

</script>

<h1>
📜 Payer & Owe History
</h1>

${historyHtml}

</body>

</html>

`);

    chartWindow.document.close();
}

function loadGraphUsers(){

    const graphUser =
        document.getElementById(
            "graphUser"
        );

    if(!graphUser){
        return;
    }

    graphUser.innerHTML = `

        <option value="all">
            All Users
        </option>
    `;

    users.forEach(user=>{

        graphUser.innerHTML += `

            <option value="${user}">
                ${user}
            </option>
        `;
    });

    // graphUser.value =
    //     currentUser || "all";

    graphUser.value =
        "all";    
}

/* ================= CLEAR ALL DATA ================= */

/* ================= SECURE DELETE ALL DATA ================= */

function clearAllExpenseData(){

    /* admin credentials */

    const ADMIN_USER =
        "admin";

    const ADMIN_PASS =
        "admin@12345";

    const username =
        prompt(
            "Enter admin username"
        );

    if(username === null){
        return;
    }

    const password =
        prompt(
            "Enter admin password"
        );

    if(password === null){
        return;
    }

    /* validation */

    if(

        username !== ADMIN_USER ||

        password !== ADMIN_PASS

    ){

        speak(
            "Invalid credentials"
        );

        alert(
            "❌ Invalid credentials"
        );

        return;
    }

    const confirmed =
        confirm(

`Delete ALL expense tracker data?

This will permanently remove:

• All users
• All expenses
• Split history
• Settlement history
• Graph data
• Current user

This cannot be undone.`
        );

    if(!confirmed){
        return;
    }

    /* remove user expenses */

    users.forEach(user=>{

        localStorage.removeItem(

            getExpenseKey(user)
        );
    });

    /* remove storage */

    localStorage.removeItem(
        "expenseUsers"
    );

    localStorage.removeItem(
        "expenseUser"
    );

    localStorage.removeItem(
        "splitHistory"
    );

    /* reset memory */

    users = [];

    expenses = [];

    filteredExpenses = [];

    currentUser = "";

    /* reset UI */

    document.getElementById(
        "userSelect"
    ).innerHTML = "";

    const graphUser =
        document.getElementById(
            "graphUser"
        );

    if(graphUser){

        graphUser.innerHTML = "";
    }

    document.getElementById(
        "currentUserName"
    ).innerText =
        "User : Not Selected";

    document.getElementById(
        "expenseList"
    ).innerHTML =

        `
        <div class="expenseItem">

            <h3>
                No expenses found
            </h3>

        </div>
        `;

    const splitContainer =
        document.getElementById(
            "splitExpenseList"
        );

    if(splitContainer){

        splitContainer.innerHTML =

        `
        <div class="expenseItem">

            No split expenses

        </div>
        `;
    }

    /* reset totals */

    [
        "dailyTotal",
        "monthlyTotal",
        "yearlyTotal",
        "overallTotal"
    ]

    .forEach(id=>{

        const el =
            document.getElementById(
                id
            );

        if(el){

            el.innerText =
                "₹0";
        }
    });

    /* destroy graphs */

    if(expenseChart){

        expenseChart.destroy();
    }

    if(pieChart){

        pieChart.destroy();
    }

    speak(
        "All data deleted successfully"
    );

    alert(
        "✅ All data deleted successfully"
    );
}