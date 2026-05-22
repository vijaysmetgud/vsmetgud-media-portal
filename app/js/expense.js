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

let lastVoiceCommand = "";

let voiceLock = false;

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

    speech.onend = ()=>{

        console.log(
            "Speech finished"
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

    if(

        !currentUser &&

        users.length > 0

    ){

        alert(
            "Please add/select a user"
        );

        return;
    }

    try{

        const SpeechRecognition =

            window.SpeechRecognition ||

            window.webkitSpeechRecognition;

        if(!SpeechRecognition){

            alert(
                "Speech Recognition not supported in this browser"
            );

            return;
        }

        const recognition =
            new SpeechRecognition();

        recognition.lang = "en-IN";

        recognition.continuous = false;

        recognition.interimResults = false;

        recognition.maxAlternatives = 1;

        document.getElementById(
            "voiceStatus"
        ).innerText =
            "🎤 Listening...";

        recognition.start();

        recognition.onstart = ()=>{

            console.log(
                "Voice recognition started"
            );
        };

        recognition.onresult =
        (event)=>{

            recognition.stop();

            const text =

                event.results[0][0]
                .transcript
                .toLowerCase()
                .trim();

            console.log(
                "Voice:",
                text
            );

            /* IGNORE DUPLICATES */

            if(

                voiceLock ||

                text === lastVoiceCommand
            ){

                console.log(
                    "Duplicate voice ignored"
                );

                return;
            }

            voiceLock = true;

            lastVoiceCommand =
                text;

            document.getElementById(
                "voiceStatus"
            ).innerText =
                "You said: " + text;

            processVoiceExpense(
                text
            );

            /* RELEASE LOCK */

            setTimeout(()=>{

                voiceLock = false;

            },2000);
        };

        recognition.onerror = (event)=>{

            console.error(
                "Speech error:",
                event.error
            );

            document.getElementById(
                "voiceStatus"
            ).innerText =
                "Error: " + event.error;

            alert(
                "Speech Error: " +
                event.error
            );
        };

        recognition.onend = ()=>{

            console.log(
                "Speech ended"
            );

            document.getElementById(
                "voiceStatus"
            ).innerText =
                "🎤 Voice stopped";
        };

    }

    catch(err){

        console.error(err);

        alert(err.message);
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

        text.includes("add user")

        ||

        text.includes("new user")

    ){

        let userName = text

            .replace(
                "add user",
                ""
            )

            .replace(
                "new user",
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

        return;
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

/* ================= FILTERED RENDER ================= */

function renderFilteredExpenses(
    list,
    title
){

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
}

/* ================= SPLIT EXPENSES ================= */

function splitExpense(){

    const dateInput =

        document.getElementById(
            "date"
        );

    /* AUTO OPEN CALENDAR */

    dateInput.showPicker?.();

    alert(
        "Please select split date"
    );

    /* WAIT FOR DATE */

    dateInput.onchange =
    function(){

        dateInput.onchange =
            null;

        const selectedDate =
            dateInput.value;

        if(!selectedDate){

            alert(
                "Please select date"
            );

            return;
        }

        if(users.length === 0){

            alert(
                "Please add users first"
            );

            return;
        }

        const item =
            prompt(
                "Expense item?"
            );

        if(!item){

            return;
        }

        const totalAmount =
            Number(

                prompt(
                    "Total amount?"
                )
            );

        if(!totalAmount){

            return;
        }

        const paidBy =
            prompt(
                "Who paid total amount?"
            )
            ?.trim();

        if(!paidBy){

            speak(
                "Please enter who paid"
            );

            return;
        }

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

        const newUser =
            prompt(

                "Add another user? (optional)"
            );

        if(newUser){

            const cleanName =
                newUser.trim();

            if(

                !users.some(

                    u =>

                    u.toLowerCase() ===
                    cleanName.toLowerCase()
                )
            ){

                users.push(
                    cleanName
                );

                selectedUsers.push(
                    cleanName
                );

                localStorage.setItem(

                    "expenseUsers",

                    JSON.stringify(
                        users
                    )
                );
            }
        }

        if(
            selectedUsers.length === 0
        ){

            alert(
                "No users selected"
            );

            return;
        }

        saveSplitExpense(

            item,

            totalAmount,

            selectedUsers,

            paidBy
        );

        const splitAmount =
            Math.round(

                totalAmount /

                selectedUsers.length
            );

        alert(

`Split Successful

Date:
${selectedDate}

Item:
${item}

Paid By:
${paidBy}

Total:
₹${totalAmount}

Users:
${selectedUsers.join(", ")}

Each Pays:
₹${splitAmount}`

        );

        /* RESET */

        dateInput.onchange =
            null;
    };
}

function processSplitVoice(){

    speak(
        "Please use split voice button"
    );

    startSplitVoice();
}

function saveSplitExpense(

    item,

    amount,

    selectedUsers,

    paidBy
){

    if(

        !item ||

        !amount ||

        selectedUsers.length === 0
    ){

        speak(
            "Invalid split expense"
        );

        return;
    }

    selectedUsers.forEach(user=>{

        const exists =
            users.some(

                u =>

                u.toLowerCase()
                ===
                user.toLowerCase()
            );

        if(!exists){

            users.push(user);
        }
    });

    localStorage.setItem(

        "expenseUsers",

        JSON.stringify(users)
    );

    loadUsers();

    const splitAmount =
        Math.round(

            amount /
            selectedUsers.length
        );

    const selectedDate =

        document.getElementById(
            "date"
        ).value ||

        new Date()
        .toISOString()
        .split("T")[0];

    saveSplitHistory({

        item:item,

        total:amount,

        users:selectedUsers,

        each:splitAmount,

        paidBy:paidBy,

        date:selectedDate
    });

    const key =
        getExpenseKey(
            paidBy
        );

    let payerExpenses =
        JSON.parse(

            localStorage.getItem(
                key
            )

        ) || [];

    payerExpenses.push({

        id:
            Date.now()
            + Math.random(),

        user:paidBy,

        date:selectedDate,

        item:
            `${item} (Split)`,

        price:amount,

        split:true,

        splitUsers:
            selectedUsers,

        each:
            splitAmount
    });

    localStorage.setItem(

        key,

        JSON.stringify(
            payerExpenses
        )
    );

    loadExpenses();

    renderExpenses();

    renderChart();

    renderPieChart();

    renderSplitHistory();

    speak(

`${item} split among ${selectedUsers.length} users`
    );
}

function startSplitVoice(){

    const selectedDate =

        document.getElementById(
            "date"
        );

    if(!selectedDate.value){

        selectedDate.showPicker?.();

        alert(
            "Please select split date"
        );

        selectedDate.onchange =
        ()=>{

            selectedDate.onchange =
                null;

            startSplitVoice();
        };

        return;
    }

    speechSynthesis.cancel();

    const SpeechRecognition =

        window.SpeechRecognition ||

        window.webkitSpeechRecognition;

    if(!SpeechRecognition){

        alert(
            "Speech Recognition not supported"
        );

        return;
    }

    /* ================= ASK USERS ================= */

    const speech1 =
        new SpeechSynthesisUtterance(
            "Please say users"
        );

    speech1.lang = "en-IN";

    speech1.onend = ()=>{

        const userRecognition =
            new SpeechRecognition();

        userRecognition.lang =
            "en-IN";

        userRecognition.continuous =
            false;

        userRecognition.interimResults =
            false;

        userRecognition.maxAlternatives =
            1;

        userRecognition.start();

        userRecognition.onerror =
        ()=>{

            speak(
                "Could not hear users"
            );
        };

        userRecognition.onresult =
        function(event){

            userRecognition.stop();

            const userText =

                event.results[0][0]
                .transcript
                .toLowerCase()
                .trim();

            const selectedUsers =

                userText
                .replace(/,/g," ")

                .split(" ")

                .filter(Boolean);

            /* ================= ASK ITEM ================= */

            const speech2 =
                new SpeechSynthesisUtterance(
                    "Please say expense item"
                );

            speech2.lang =
                "en-IN";

            speech2.onend = ()=>{

                const itemRecognition =
                    new SpeechRecognition();

                itemRecognition.lang =
                    "en-IN";

                itemRecognition.continuous =
                    false;

                itemRecognition.interimResults =
                    false;

                itemRecognition.maxAlternatives =
                    1;

                itemRecognition.start();

                itemRecognition.onerror =
                ()=>{

                    speak(
                        "Could not hear expense item"
                    );
                };

                itemRecognition.onresult =
                function(itemEvent){

                    itemRecognition.stop();

                    const item =

                        itemEvent
                        .results[0][0]
                        .transcript
                        .trim();

                    /* ================= ASK AMOUNT ================= */

                    const speech3 =
                        new SpeechSynthesisUtterance(
                            "Please say amount"
                        );

                    speech3.lang =
                        "en-IN";

                    speech3.onend = ()=>{

                        const amountRecognition =
                            new SpeechRecognition();

                        amountRecognition.lang =
                            "en-IN";

                        amountRecognition.continuous =
                            false;

                        amountRecognition.interimResults =
                            false;

                        amountRecognition.maxAlternatives =
                            1;

                        amountRecognition.start();

                        amountRecognition.onerror =
                        ()=>{

                            speak(
                                "Could not hear amount"
                            );
                        };

                        amountRecognition.onresult =
                        function(amountEvent){

                            amountRecognition.stop();

                            const amount =

                                Number(

                                    amountEvent
                                    .results[0][0]
                                    .transcript
                                    .replace(
                                        /[^0-9]/g,
                                        ""
                                    )
                                );

                            if(!amount){

                                speak(
                                    "Could not understand amount"
                                );

                                return;
                            }

                            const speech4 =
                                new SpeechSynthesisUtterance(
                                    "Who paid the total amount"
                                );

                            speech4.lang =
                                "en-IN";

                            speech4.onend = ()=>{

                                const payerRecognition =
                                    new SpeechRecognition();

                                payerRecognition.lang =
                                    "en-IN";

                                payerRecognition.start();

                                payerRecognition.onresult =
                                function(payEvent){

                                    payerRecognition.stop();

                                    const paidBy =

                                        payEvent
                                        .results[0][0]
                                        .transcript
                                        .trim()
                                        .toLowerCase();

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

                                    speak(

                                `${item} split among ${selectedUsers.length} users`
                                    );
                                };
                            };

                            speechSynthesis.speak(
                                speech4
                            );                        

                            
                        };
                    };

                    speechSynthesis.speak(
                        speech3
                    );
                };
            };

            speechSynthesis.speak(
                speech2
            );
        };
    };

    speechSynthesis.speak(
        speech1
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

    let splitHistory =
        JSON.parse(

            localStorage.getItem(
                "splitHistory"
            )

        ) || [];

    container.innerHTML = "";

    if(
        splitHistory.length === 0
    ){

        container.innerHTML =

        `
        <div class="expenseItem">

            No split expenses

        </div>
        `;

        return;
    }

    splitHistory
    .slice()
    .reverse()

    .forEach(split=>{

        container.innerHTML +=

        `
        <div class="expenseItem">

            <h3>
                ${split.item}
            </h3>

            <p>
                Total :
                ₹${split.total}
            </p>

            <p>
                Date :
                ${split.date}
            </p>
            
            <p>
                Paid By :
                ${split.paidBy || "Unknown"}
            </p>

            <p>
                Split:
                ${split.users.join(", ")}
            </p>

            <h2>
                Each :
                ₹${split.each}
            </h2>

        </div>
        `;
    });
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
            💸 Who Owes
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

    let allExpenses = [];

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

    const splitExpenses =

        allExpenses.filter(
            exp => exp.split
        );

    const spent = {};

    users.forEach(user=>{

        spent[user] = 0;
    });

    /* ONLY SPLIT EXPENSES */

    splitExpenses.forEach(exp=>{

        spent[exp.user] +=
            exp.price;
    });

    const balances = {};

    users.forEach(user=>{

        balances[user] = 0;
    });

    let total = 0;

    /* SPLIT-WISE CALCULATION */

    splitExpenses.forEach(exp=>{

        total += exp.price;

        const each =
            exp.each;

        /* payer paid full amount */

        balances[exp.user] +=
            exp.price;

        /* every participant owes share */

        exp.splitUsers.forEach(user=>{

            balances[user] -= each;
        });
    });
    let spentHtml = "";

    let oweHtml = "";

    users.forEach(user=>{

        const userExpenses =

            splitExpenses.filter(

                exp =>
                    exp.user === user
            );

        let itemsHtml = "";

        userExpenses.forEach(exp=>{

            itemsHtml += `

            <div
                style="
                    margin-bottom:15px;
                    padding:12px;
                    background:#1e293b;
                    border-radius:12px;
                "
            >

                <p>
                    📅 ${exp.date}
                </p>

                <p>
                    🧾 ${exp.item}
                </p>

                <p>
                    💰 ₹${exp.price}
                </p>

                ${
                    exp.split
                    ?

                    `<p>
                        👥 Split:
                        ${exp.splitUsers.join(", ")}
                    </p>

                    <p>
                        💵 Each:
                        ₹${exp.each}
                    </p>`
                    :

                    ""
                }

            </div>
            `;
        });

        spentHtml += `

        <div class="settlementItem">

            <h3>
                👤 ${user}
            </h3>

            ${itemsHtml}

            <hr>

            <b>
                Total Spent:
                ₹${spent[user]}
            </b>

        </div>
        `;
    });

    const creditors = [];
    const debtors = [];

    users.forEach(user=>{

        const balance =
            balances[user];

        if(balance > 0){

            creditors.push({

                user:user,

                amount:balance
            });
        }

        else if(balance < 0){

            debtors.push({

                user:user,

                amount:
                    Math.abs(balance)
            });
        }
    });

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

            const creditorExpenses =

                splitExpenses.filter(

                    exp =>
                        exp.user ===
                        creditor.user
                );

            let expenseInfo = "";

            creditorExpenses.forEach(exp=>{

                expenseInfo += `

                <p>

                    📅 ${exp.date}

                    —

                    ${exp.item}

                    —

                    ₹${exp.price}

                </p>
                `;
            });

            oweHtml += `

            <div class="settlementItem owe">

                <h3>

                    💸 ${debtor.user}

                    owes

                    ${creditor.user}

                </h3>

                <h2>

                    ₹${payment}

                </h2>

                <p>
                    For:
                </p>

                ${expenseInfo}

            </div>
            `;

            debtor.amount -=
                payment;

            creditor.amount -=
                payment;
        });
    });

    return {

        total,

        eachShare:
            "Dynamic",

        spentHtml,

        oweHtml
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

EACH SHARE:
₹${result.eachShare}

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

EACH SHARE:
₹${result.eachShare}

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

EACH SHARE:
₹${result.eachShare}

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

    addNewUser();
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

    expenses.forEach(exp=>{

        if(!totals[exp.date]){

            totals[exp.date] = 0;
        }

        totals[exp.date] += exp.price;
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
                        "#2563eb",

                    borderRadius:10
                }]
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

    expenses.forEach(exp=>{

        if(!totals[exp.item]){

            totals[exp.item] = 0;
        }

        totals[exp.item] += exp.price;
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

    expenses.forEach(exp=>{

        if(!totals[exp.date]){

            totals[exp.date] = 0;
        }

        totals[exp.date] += exp.price;
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

                borderRadius:12
            }]
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

    expenses.forEach(exp=>{

        if(!totals[exp.item]){

            totals[exp.item] = 0;
        }

        totals[exp.item] += exp.price;
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