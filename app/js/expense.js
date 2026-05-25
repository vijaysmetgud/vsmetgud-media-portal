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

    /* ================= USER ================= */

    function askUser(){

        speakThenListen(

            "Please say user name",

            (text)=>{

                if(!text.trim()){

                    speakThenListen(

                        "Please say user name again",

                        ()=> askUser()
                    );

                    return;
                }

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
                    ". Say expense item or command",

                    (text)=>{

                        const voiceText =

                            text
                            .toLowerCase()
                            .trim();

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

                        item =
                            voiceText;

                        askAmount();
                    }
                );
            }
        );
    }

    /* ================= AMOUNT ================= */

    function askAmount(){

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

                let amount =

                    Number(

                        text.replace(
                            /[^0-9]/g,
                            ""
                        )
                    );

                /* words support */

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

                if(

                    !amount ||

                    amount <= 0
                ){

                    speak(
                        "Invalid amount"
                    );

                    return;
                }

                /* AUTO FILL */

                document.getElementById(
                    "item"
                ).value =
                    item;

                document.getElementById(
                    "price"
                ).value =
                    amount;

                addExpense();

                alert(

    `Expense Added

    Date:
    ${dateInput.value}

    User:
    ${selectedUser}

    Item:
    ${item}

    Amount:
    ₹${amount}`
                );
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

    filteredExpenses =
        [...expenses];

    const expenseList =
        document.getElementById(
            "expenseList"
        );

    expenseList.innerHTML = "";

    if(!expenses || expenses.length === 0){

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
        "monthlyTotal"
    ).innerText = "₹0";

    document.getElementById(
        "yearlyTotal"
    ).innerText = "₹0";

    document.getElementById(
        "overallTotal"
    ).innerText = "₹0";

    renderChart();

    renderPieChart();

    renderSplitHistory();

    return;
    }


    let daily = 0;

    let monthly = 0;

    let yearly = 0;

    let overall = 0;

    const now =
        new Date();

    const today =
        now.toISOString()
        .split("T")[0];

    expenses
    .slice()
    .reverse()

    .forEach(exp=>{

        const d =
            new Date(exp.date);

        overall += exp.price;

        if(exp.date === today){

            daily += exp.price;
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

function shareSettlementWhatsApp(){

    const result =
        getSettlementData();

    const text =
        encodeURIComponent(

`💰 FINAL SETTLEMENT

TOTAL:
₹${result.total}

${result.oweHtml
.replace(/<[^>]*>/g,"")}
`
        );

    window.open(

        `https://wa.me/?text=${text}`,

        "_blank"
    );
}

function sendSettlementEmail(){

    const result =
        getSettlementData();

    const subject =
        encodeURIComponent(
            "Expense Settlement"
        );

    const body =
        encodeURIComponent(

`FINAL SETTLEMENT

TOTAL:
₹${result.total}

${result.oweHtml
.replace(/<[^>]*>/g,"")}
`
        );

    window.location.href =

`mailto:?subject=${subject}&body=${body}`;
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

loadUsers();

loadGraphUsers();

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
}

/* ======================================================
   GRAPH ENGINE
====================================================== */

let expenseChart;
let pieChart;

/* ================= USER FILTER ================= */

function getSelectedGraphUser(){

    return document.getElementById(
        "graphUser"
    )?.value || currentUser;
}

/* ================= LOAD USER EXPENSES ================= */

function getAllExpensesForGraph(){

    const selectedUser =
        getSelectedGraphUser();

    let allExpenses = [];

    /* ALL USERS */

    if(selectedUser === "all"){

        users.forEach(user=>{

            const userExpenses =

                JSON.parse(

                    localStorage.getItem(
                        getExpenseKey(user)
                    )

                ) || [];

            allExpenses.push(
                ...userExpenses
            );
        });

        return allExpenses;
    }

    /* CURRENT USER */

    return JSON.parse(

        localStorage.getItem(

            getExpenseKey(
                selectedUser
            )

        )

    ) || [];
}

/* ================= NORMAL FILTER ================= */

function getFilteredNormalExpenses(){

    let data =
        getAllExpensesForGraph();

    const filter =

        document.getElementById(
            "graphFilter"
        )?.value || "overall";

    const selectedDate =

        document.getElementById(
            "graphDate"
        )?.value;

    const selectedMonth =

        document.getElementById(
            "graphMonth"
        )?.value;

    const selectedYear =

        document.getElementById(
            "graphYear"
        )?.value;

    const today =
        new Date()
        .toISOString()
        .split("T")[0];

    switch(filter){

        case "today":

            data = data.filter(

                exp =>
                    exp.date === today
            );

            break;

        case "date":

            data = data.filter(

                exp =>
                    exp.date === selectedDate
            );

            break;

        case "month":

            data = data.filter(

                exp =>

                    exp.date.startsWith(
                        selectedMonth
                    )
            );

            break;

        case "year":

            data = data.filter(

                exp =>

                    exp.date.startsWith(
                        selectedYear
                    )
            );

            break;

        case "overall":

        default:
            break;
    }

    return data;
}

/* ================= SPLIT FILTER ================= */

function getFilteredSplitHistory(){

    let splitHistory =
        JSON.parse(
            localStorage.getItem(
                "splitHistory"
            )
        ) || [];

    const selectedUser =
        getSelectedGraphUser();

    const filter =
        document.getElementById(
            "graphFilter"
        )?.value || "overall";

    const selectedDate =
        document.getElementById(
            "graphDate"
        )?.value;

    const selectedMonth =
        document.getElementById(
            "graphMonth"
        )?.value;

    const selectedYear =
        document.getElementById(
            "graphYear"
        )?.value;

    const today =
        new Date()
        .toISOString()
        .split("T")[0];

    /* USER FILTER */

    if(selectedUser !== "all"){

        splitHistory =
            splitHistory.filter(split=>

                split.paidBy === selectedUser ||

                split.users.includes(
                    selectedUser
                )
            );
    }

    /* DATE FILTER */

    switch(filter){

        case "today":

            splitHistory =
                splitHistory.filter(
                    split =>
                    split.date === today
                );
            break;

        case "date":

            splitHistory =
                splitHistory.filter(
                    split =>
                    split.date ===
                    selectedDate
                );
            break;

        case "month":

            splitHistory =
                splitHistory.filter(
                    split =>
                    split.date.startsWith(
                        selectedMonth
                    )
                );
            break;

        case "year":

            splitHistory =
                splitHistory.filter(
                    split =>
                    split.date.startsWith(
                        selectedYear
                    )
                );
            break;

        case "overall":
        default:
            break;
    }

    return splitHistory;
}

/* ================= RENDER BAR CHART ================= */

function renderChart(){

    const canvas =
        document.getElementById(
            "expenseChart"
        );

    if(!canvas){
        return;
    }

    const ctx =
        canvas.getContext("2d");

    const totals = {};

    const graphType =

        document.getElementById(
            "graphType"
        )?.value || "normal";

    /* NORMAL */

    if(graphType === "normal"){

        const expenses =
            getFilteredNormalExpenses();

        expenses.forEach(exp=>{

            totals[exp.item] =

                (
                    totals[exp.item]
                    || 0
                )

                +

                Number(exp.price);
        });
    }

    /* SPLIT */

    else{

        const splitHistory =
            getFilteredSplitHistory();

        const payerTotals = {};

        const oweTotals = {};

        splitHistory.forEach(split=>{

            /* payer totals */

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

            /* owe totals */

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
        });

        const allUsers = [

            ...new Set([

                ...Object.keys(
                    payerTotals
                ),

                ...Object.keys(
                    oweTotals
                )
            ])
        ];

        if(expenseChart){

            expenseChart.destroy();
        }

        expenseChart =
            new Chart(ctx,{

                type:"bar",

                data:{

                    labels:allUsers,

                    datasets:[

                    {

                        label:
                            "Paid Amount",

                        data:

                            allUsers.map(
                                user =>

                                payerTotals[
                                    user
                                ] || 0
                            ),

                        backgroundColor:
                            "#3b82f6",

                        borderRadius:14
                    },

                    {

                        label:
                            "Owe Amount",

                        data:

                            allUsers.map(
                                user =>

                                oweTotals[
                                    user
                                ] || 0
                            ),

                        backgroundColor:
                            "#ef4444",

                        borderRadius:14
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

        return;
    }

    const labels =
        Object.keys(totals);

    const values =
        Object.values(totals);

    if(expenseChart){

        expenseChart.destroy();
    }

    expenseChart =
        new Chart(ctx,{

            type:"bar",

            data:{

                labels,

                datasets:[{

                    label:

                        graphType ===
                        "normal"

                        ?

                        "Expenses"

                        :

                        "Split Share",

                    data:values,

                    backgroundColor:

                    graphType === "normal"

                    ?

                    "#facc15"

                    :

                    labels.map(label=>{

                        const splitHistory =
                            getFilteredSplitHistory();

                        const payers =
                            splitHistory.map(
                                s=>s.paidBy
                            );

                        return payers.includes(label)

                            ?

                            "#3b82f6"

                            :

                            "#ef4444";
                    }),

                    borderRadius:14
                }]
            },

            options:{

                responsive:true,

                maintainAspectRatio:false,

                scales:{

                    y:{
                        suggestedMin:
                            Math.min(...values) - 50,

                        suggestedMax:
                            Math.max(...values) + 50
                    }
                }
            }
        });
}

/* ================= PIE CHART ================= */

function renderPieChart(){

    const graphType =
        document.getElementById(
            "graphType"
        )?.value || "normal";

    if(graphType === "split"){

        if(pieChart){
            pieChart.destroy();
        }

        return;
    }

    const canvas =

        document.getElementById(
            "expensePieChart"
        );

    if(!canvas){
        return;
    }

    const ctx =
        canvas.getContext("2d");

    const totals = {};

    const expenses =
        getFilteredNormalExpenses();

    expenses.forEach(exp=>{

        totals[exp.item] =

            (
                totals[exp.item]
                || 0
            )

            +

            Number(exp.price);
    });

    const labels =
        Object.keys(totals);

    const data =
        Object.values(totals);

    if(pieChart){

        pieChart.destroy();
    }

    pieChart =
        new Chart(ctx,{

            type:"pie",

            data:{

                labels,

                datasets:[{

                    data
                }]
            },

            options:{

                responsive:true,

                maintainAspectRatio:false
            }
        });
}

/* ================= AUTO REFRESH ================= */

[
    "graphType",
    "graphFilter",
    "graphDate",
    "graphMonth",
    "graphYear",
    "graphUser"
]

.forEach(id=>{

    document
    .getElementById(id)
    ?.addEventListener(

        "change",

        ()=>{

            renderChart();
            renderPieChart();
        }
    );
});

/* INITIAL */

setTimeout(()=>{

    renderChart();
    renderPieChart();

},500);


/* ======================================================
   GRAPH WINDOWS
====================================================== */

/* ================= BAR GRAPH WINDOW ================= */

function openBarChartWindow(){

    const graphType =
        document.getElementById(
            "graphType"
        ).value;

    const totals = {};

    /* NORMAL EXPENSE */

    if(graphType === "normal"){

        const expenses =
            getFilteredNormalExpenses();

        expenses.forEach(exp=>{

            totals[exp.item] =

                (
                    totals[exp.item]
                    || 0
                )

                +

                Number(exp.price);
        });
    }

    /* SPLIT SHARE */

    else{

        const splitHistory =
            getFilteredSplitHistory();

        splitHistory.forEach(split=>{

            /* payer */

            totals[
                split.paidBy
            ] =

                (
                    totals[
                        split.paidBy
                    ] || 0
                )

                +

                split.total;

            /* owes */

            split.users.forEach(user=>{

                if(user === split.paidBy){
                    return;
                }

                totals[user] =

                    (
                        totals[user]
                        || 0
                    )

                    -

                    split.each;
            });
        });
    }

    const labels =
        JSON.stringify(
            Object.keys(totals)
        );

    const data =
        JSON.stringify(
            Object.values(totals)
        );

    const chartWindow =
        window.open(
            "",
            "_blank",
            "width=1400,height=900"
        );

    chartWindow.document.write(`

<html>

<head>

<title>
Expense Graph
</title>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>

body{
    background:#111827;
    color:white;
    font-family:Arial;
    padding:30px;
    margin:0;
}

h1{
    text-align:center;
}

canvas{
    width:100% !important;
    height:70vh !important;
}

</style>

</head>

<body>

<h1>

${
graphType === "normal"

?

"📊 Normal Expense Graph"

:

"💰 Split Share Graph"
}

</h1>

<p
style="
text-align:center;
font-size:20px;
margin-bottom:25px;
"
>

Filter:

${
document
.getElementById(
"graphFilter"
)
.value
}

</p>

<canvas id="graph"></canvas>

<script>

const ctx =

document
.getElementById(
    "graph"
)
.getContext("2d");

new Chart(ctx,{

    type:"bar",

    data:{

        labels:${labels},

        datasets:[{

            label:

            "${
graphType === "normal"

?

"Expenses"

:

"Payer Amount"
}",

data:${data},

backgroundColor:

${
graphType === "normal"

?

'"#facc15"'

:

(() => {

    const splitHistory =
        getFilteredSplitHistory();

    const payers =
        splitHistory.map(
            s => s.paidBy
        );

    const colors =
        Object.keys(totals)
        .map(user =>

            payers.includes(user)

            ? "#3b82f6"

            : "#ef4444"
        );

    return JSON.stringify(
        colors
    );

})()
}
        }]
    },

    options:{

    responsive:true,

    maintainAspectRatio:false,

    plugins:{

    legend:{
    labels:{
    color:"white"
    }
    }
    },

    scales:{

    x:{

    ticks:{
    color:"white"
    },

    title:{
    display:true,
    text:

    graphType === "normal"

    ?

    "Expense Items"

    :

    "Users",

    color:"white"
    }
    },

    y:{

    beginAtZero:true,

    ticks:{
    color:"white"
    },

    title:{
    display:true,
    text:

    graphType === "normal"

    ?

    "Expense Amount"

    :

    "Paid / Owe Amount",

    color:"white"
    }
    }
    }
    }
});

</script>

</body>

</html>

`);

    chartWindow.document.close();
}

/* ================= PIE GRAPH WINDOW ================= */

function openPieChartWindow(){

    const expenses =
        getFilteredNormalExpenses();

    const totals = {};

    expenses.forEach(exp=>{

        totals[exp.item] =

            (
                totals[exp.item]
                || 0
            )

            +

            Number(exp.price);
    });

    const labels =
        JSON.stringify(
            Object.keys(totals)
        );

    const data =
        JSON.stringify(
            Object.values(totals)
        );

    const chartWindow =
        window.open(
            "",
            "_blank",
            "width=1300,height=900"
        );

    chartWindow.document.write(`

<html>

<head>

<title>
Pie Graph
</title>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>

body{
    background:#111827;
    color:white;
    font-family:Arial;
    text-align:center;
    padding:30px;
}

canvas{
    width:100% !important;
    height:75vh !important;
}

</style>

</head>

<body>

<h1>
🥧 Expense Pie Graph
</h1>

<canvas id="pie"></canvas>

<script>

new Chart(

document
.getElementById(
"pie"
),

{
type:"pie",

data:{

labels:${labels},

datasets:[{

data:${data}
}]
}
});

</script>

</body>

</html>

`);

    chartWindow.document.close();
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

    graphUser.value =
        currentUser || "all";
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