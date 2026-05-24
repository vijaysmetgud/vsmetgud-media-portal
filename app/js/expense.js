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

    speechSynthesis.cancel();

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

    const voices =

        speechSynthesis
        .getVoices();

    const indianVoice =

        voices.find(

            voice =>

            voice.lang ===
            "en-IN"
        );

    if(indianVoice){

        speech.voice =
            indianVoice;
    }

    speech.onerror =
    (e)=>{

        console.log(
            "Speech error",
            e
        );
    };

    speechSynthesis.speak(
        speech
    );
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

    /* WAIT FOR DATE */

    dateInput.onchange =
    ()=>{

        dateInput.onchange =
            null;

        const selectedDate =
            dateInput.value;

        if(!selectedDate){

            alert(
                "Please select expense date"
            );

            return;
        }

        console.log(
            "Expense date:",
            selectedDate
        );

        askUser();
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

        speech.lang =
            "en-IN";

        speech.rate =
            0.9;

        speech.pitch =
            1;

        speech.onend =
        ()=>{

            const recognition =

                new (
                    window
                    .SpeechRecognition ||

                    window
                    .webkitSpeechRecognition
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

            document.getElementById(
                "voiceStatus"
            ).innerText =

                "🎤 Listening...";

            recognition.onresult =
            (event)=>{

                const text =

                    event.results[0][0]
                    .transcript
                    .trim();

                console.log(
                    "Voice:",
                    text
                );

                document.getElementById(
                    "voiceStatus"
                ).innerText =

                    "✅ " + text;

                recognition.stop();

                callback(text);
            };

            recognition.onerror =
            ()=>{

                document.getElementById(
                    "voiceStatus"
                ).innerText =

                    "❌ Could not hear";

                recognition.stop();
            };
        };

        speechSynthesis.speak(
            speech
        );
    }

    /* ================= USER ================= */

    function askUser(){

        speakThenListen(

            "Please add user",

            (text)=>{

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

                    message =
                        "User added successfully";
                }

                /* AUTO SELECT USER */

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

                /* WAIT FOR SPEECH TO FINISH */

                speechSynthesis.cancel();

                const speech =

                    new SpeechSynthesisUtterance(
                        message
                    );

                speech.lang =
                    "en-IN";

                speech.rate =
                    0.9;

                speech.onend =
                ()=>{

                    speakThenListen(

                        "Say expense item or command",

                        (text)=>{

                            const voiceText =

                                text
                                .toLowerCase()
                                .trim();

                            /* ================= COMMAND MODE ================= */

                            if(

                                voiceText.includes(
                                    "today"
                                )

                                ||

                                voiceText.includes(
                                    "month"
                                )

                                ||

                                voiceText.includes(
                                    "year"
                                )

                                ||

                                voiceText.includes(
                                    "settlement"
                                )

                                ||

                                voiceText.includes(
                                    "split"
                                )

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

                            /* ================= FAST EXPENSE ================= */

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

                            /* ================= GUIDED MODE ================= */

                            item =
                                voiceText;

                            askAmount();
                        }
                    );
                };

                speechSynthesis.speak(
                    speech
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

                speak(
                    "Expense added successfully"
                );

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

            user.toLowerCase()

            ===

            paidBy.toLowerCase()
        );

    if(matchedUser){

        paidBy =
            matchedUser;
    }
    if(!paidBy){

        alert(
            "Please enter payer"
        );

        return;
    }

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

    /* ================= SAVE EACH ITEM ================= */

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
    ₹${Math.round(

    grandTotal /
    selectedUsers.length

    )}`
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

    dateInput.onchange =
    ()=>{

        dateInput.onchange =
            null;

        const selectedDate =
            dateInput.value;

        if(!selectedDate){

            alert(
                "Please select split date"
            );

            return;
        }

        console.log(
            "Split date selected:",
            selectedDate
        );

        /* SPEAK AFTER DATE */

        speechSynthesis.cancel();

        setTimeout(()=>{

            startSplitVoiceFlow();

        },300);
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

        speech.lang =
            "en-IN";

        speech.rate =
            0.9;

        speech.onend =
        ()=>{

            const recognition =
                new SpeechRecognition();

            recognition.lang =
                "en-IN";

            recognition.continuous =
                false;

            recognition.interimResults =
                false;

            recognition.maxAlternatives =
                1;

            recognition.start();

            recognition.onresult =
            (event)=>{

                recognition.stop();

                const text =

                    event
                    .results[0][0]
                    .transcript
                    .trim();

                callback(text);
            };

            recognition.onerror =
            ()=>{

                speak(
                    "Could not hear properly"
                );
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

                selectedUsers =

                    text
                    .toLowerCase()
                    .replace(/,/g," ")
                    .split(" ")
                    .filter(Boolean);

                askItem();
            }
        );
    }

    function askItem(){

        speakThenListen(

            "Please say expense item",

            (text)=>{

                item =
                    text;

                askAmount();
            }
        );
    }

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

                    speak(
                        "Invalid amount"
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

                paidBy =
                    text
                    .toLowerCase()
                    .trim();

                saveSplitExpense(

                    item,

                    amount,

                    selectedUsers,

                    paidBy
                );

                const splitAmount =
                    Math.round(

                        amount /

                        selectedUsers.length
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
        );
    }
}

function saveSplitExpense(

    item,

    totalAmount,

    selectedUsers,

    paidBy
){

    const splitAmount =

        Math.round(

            totalAmount /

            selectedUsers.length
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

    const balances = {};

    users.forEach(user=>{

        balances[user] = 0;
    });

    splitHistory.forEach(split=>{

        split.users.forEach(user=>{

            if(

                user.toLowerCase()

                !==

                split.paidBy
                .toLowerCase()

            ){

                balances[user] -=
                    split.each;

                balances[
                    split.paidBy
                ] += split.each;
            }
        });
    });

    const creditors = [];
    const debtors = [];

    Object.entries(
        balances
    )

    .forEach(([user,balance])=>{

        if(balance > 0){

            creditors.push({

                user,

                amount:
                    balance
            });
        }

        else if(balance < 0){

            debtors.push({

                user,

                amount:
                    Math.abs(balance)
            });
        }
    });

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

    debtors.forEach(debtor=>{

        creditors.forEach(creditor=>{

            if(

                debtor.amount <= 0 ||

                creditor.amount <= 0
            ){
                return;
            }

            const payment =

                Math.min(

                    debtor.amount,

                    creditor.amount
                );

            tableHtml +=

            `
            <tr>

                <td>
                    ${debtor.user}
                </td>

                <td>
                    ${creditor.user}
                </td>

                <td>
                    ₹${payment}
                </td>

            </tr>
            `;

            debtor.amount -=
                payment;

            creditor.amount -=
                payment;
        });
    });

    if(

        creditors.length === 0 ||

        debtors.length === 0
    ){

        tableHtml +=

        `
        <tr>

            <td colspan="3">

                ✅ No outstanding balance

            </td>

        </tr>
        `;
    }

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

    const balances = {};
    const spent = {};

    users.forEach(user=>{

        balances[user] = 0;
        spent[user] = 0;
    });

    let total = 0;
    let spentHtml = "";
    let rawOwesHtml = "";

    /* ================= RAW HISTORY ================= */

    splitHistory.forEach(split=>{

        total += split.total;

        spent[split.paidBy] +=
            split.total;

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

                balances[user] -=
                    split.each;

                balances[
                    split.paidBy
                ] += split.each;
            }
        });
    });

    /* ================= NET OUTSTANDING ================= */

    const creditors = [];
    const debtors = [];

    Object.entries(
        balances
    )

    .forEach(([user,balance])=>{

        if(balance > 0){

            creditors.push({

                user,

                amount:balance
            });
        }

        else if(balance < 0){

            debtors.push({

                user,

                amount:
                    Math.abs(balance)
            });
        }
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

    debtors.forEach(debtor=>{

        creditors.forEach(creditor=>{

            if(

                debtor.amount <= 0 ||

                creditor.amount <= 0

            ){

                return;
            }

            const payment =

                Math.min(

                    debtor.amount,

                    creditor.amount
                );

            netHtml += `

            <tr>

                <td>
                    ${debtor.user}
                </td>

                <td>
                    ${creditor.user}
                </td>

                <td>
                    ₹${payment}
                </td>

            </tr>
            `;

            debtor.amount -=
                payment;

            creditor.amount -=
                payment;
        });
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
}

let expenseChart;

function renderChart(){

    const canvas =
        document.getElementById(
            "expenseChart"
        );

    if(!canvas){

        console.log(
            "Chart canvas not found"
        );

        return;
    }

    const ctx =
        canvas.getContext("2d");

    const totals = {};

    /* NORMAL EXPENSES */

    filteredExpenses.forEach(exp=>{

        if(!totals[exp.date]){

            totals[exp.date] = 0;
        }

        totals[exp.date] +=
            Number(exp.price);
    });

    /* SPLIT EXPENSES */

    const splitHistory =

        JSON.parse(

            localStorage.getItem(
                "splitHistory"
            )

        ) || [];

    splitHistory.forEach(split=>{

        const exists =

            filteredExpenses.some(

                exp => exp.date === split.date
            );

        if(!exists){
            return;
        }

        if(!totals[split.date]){

            totals[split.date] = 0;
        }

        totals[split.date] +=
            Number(split.total);
    });

    const labels =
        Object.keys(totals);

    const data =
        Object.values(totals);

    if(expenseChart){

        expenseChart.destroy();
    }

    expenseChart =
        new Chart(ctx,{

            type:"bar",

            data:{

                labels:
                    labels.length
                    ? labels
                    : ["No Data"],

                datasets:[{

                    label:
                        "Daily Expenses",

                    data:
                        data.length
                        ? data
                        : [0],

                    backgroundColor:
                        "#facc15",

                    borderRadius:12
                }]
            },

            options:{

                responsive:true,

                maintainAspectRatio:false,

                plugins:{

                    legend:{

                        labels:{

                            font:{

                                size:24
                            }
                        }
                    },

                    tooltip:{

                        titleFont:{

                            size:22
                        },

                        bodyFont:{

                            size:22
                        }
                    }
                },

                scales:{

                    x:{

                        ticks:{

                            font:{

                                size:22
                            }
                        }
                    },

                    y:{

                        beginAtZero:true,

                        ticks:{

                            font:{

                                size:22
                            }
                        }
                    }
                }
            }
        });

    console.log(
        "Bar chart rendered"
    );
}

let pieChart;

function renderPieChart(){

    const canvas =
        document.getElementById(
            "expensePieChart"
        );

    if(!canvas){

        console.log(
            "Pie chart canvas not found"
        );

        return;
    }

    const ctx =
        canvas.getContext("2d");

    const totals = {};

    /* NORMAL EXPENSES */

    filteredExpenses.forEach(exp=>{

        if(!totals[exp.item]){

            totals[exp.item] = 0;
        }

        totals[exp.item] +=
            Number(exp.price);
    });

    /* SPLIT SHARE */

    const splitHistory =

        JSON.parse(

            localStorage.getItem(
                "splitHistory"
            )

        ) || [];

    splitHistory.forEach(split=>{

        if(!totals[split.item]){

            totals[split.item] = 0;
        }

        totals[split.item] +=
            Number(split.total);
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

                labels:
                    labels.length
                    ? labels
                    : ["No Data"],

                datasets:[{

                    data:
                        data.length
                        ? data
                        : [1]
                }]
            },

            options:{

                responsive:true,

                maintainAspectRatio:false
            }
        });

    console.log(
        "Pie chart rendered"
    );
}

/* ================= OPEN BAR GRAPH WINDOW ================= */

function openBarChartWindow(){

    const chartWindow =
        window.open(
            "",
            "_blank",
            "width=1200,height=700"
        );

    const totals = {};

    /* NORMAL EXPENSES */

    filteredExpenses.forEach(exp=>{

        if(!totals[exp.item]){

            totals[exp.item] = 0;
        }

        totals[exp.item] +=
            Number(exp.price);
    });

    /* SPLIT SHARE */

    const splitHistory =

        JSON.parse(

            localStorage.getItem(
                "splitHistory"
            )

        ) || [];

    splitHistory.forEach(split=>{

        if(!totals[split.item]){

            totals[split.item] = 0;
        }

        totals[split.item] +=
            Number(split.total);
    });

    const labels =
        JSON.stringify(
            Object.keys(totals)
        );

    const data =
        JSON.stringify(
            Object.values(totals)
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

    text-align:center;

    margin:0;
}

canvas{

    width:100% !important;

    height:80vh !important;
}

</style>

</head>

<body>

<h1>
📊 Expense Graph
</h1>

<canvas id="graph"></canvas>

<script>

window.onload = ()=>{

    const ctx =
        document.getElementById(
            "graph"
        ).getContext("2d");

    new Chart(ctx,{

        type:"bar",

        data:{

            labels:${labels},

            datasets:[{

                label:
                    "Daily Expenses",

                data:${data},

                backgroundColor:"#facc15",

                borderRadius:12
            }]
        },

        options:{

            responsive:true,

            maintainAspectRatio:false,

            plugins:{

                legend:{

                    labels:{

                        font:{

                            size:28
                        }
                    }
                },

                tooltip:{

                    titleFont:{

                        size:26
                    },

                    bodyFont:{

                        size:26
                    }
                }
            },

            scales:{

                x:{

                    ticks:{

                        font:{

                            size:24
                        }
                    }
                },

                y:{

                    beginAtZero:true,

                    ticks:{

                        font:{

                            size:24
                        }
                    }
                }
            }
        }
    });
};

</script>

</body>

</html>

`);

    chartWindow.document.close();
}

/* ================= OPEN PIE GRAPH WINDOW ================= */

function openPieChartWindow(){

    const chartWindow =
        window.open(
            "",
            "_blank",
            "width=1200,height=700"
        );

    const totals = {};

    /* NORMAL EXPENSES */

    filteredExpenses.forEach(exp=>{

        if(!totals[exp.item]){

            totals[exp.item] = 0;
        }

        totals[exp.item] +=
            Number(exp.price);
    });

    /* SPLIT SHARE */

    const splitHistory =

        JSON.parse(

            localStorage.getItem(
                "splitHistory"
            )

        ) || [];

    splitHistory.forEach(split=>{

        if(!totals[split.item]){

            totals[split.item] = 0;
        }

        totals[split.item] +=
            Number(split.total);
    });

    const labels =
        JSON.stringify(
            Object.keys(totals)
        );

    const data =
        JSON.stringify(
            Object.values(totals)
        );

    chartWindow.document.write(`

<html>

<head>

<title>
Expense Pie Graph
</title>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>

body{

    background:#111827;

    color:white;

    font-family:Arial;

    padding:30px;

    text-align:center;

    margin:0;
}

canvas{

    width:100% !important;

    height:80vh !important;
}

</style>

</head>

<body>

<h1>
🥧 Expense Pie Graph
</h1>

<canvas id="pie"></canvas>

<script>

window.onload = ()=>{

    const ctx =
        document.getElementById(
            "pie"
        ).getContext("2d");

    new Chart(ctx,{

        type:"pie",

        data:{

            labels:${labels},

            datasets:[{

                data:${data}
            }]
        },

        options:{

            responsive:true,

            maintainAspectRatio:false
        }
    });
};

</script>

</body>

</html>

`);

    chartWindow.document.close();
}