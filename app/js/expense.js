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

    speech.lang = "en-IN";

    speechSynthesis.speak(speech);
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

    if(!currentUser){

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

            const text =

                event.results[0][0]
                .transcript
                .toLowerCase();

            console.log(
                "Voice:",
                text
            );

            document.getElementById(
                "voiceStatus"
            ).innerText =
                "You said: " + text;

            processVoiceExpense(text);
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

    const today =
        new Date()
        .toISOString()
        .split("T")[0];

    expenses.push({

        id:Date.now(),

        user:currentUser,

        date:today,

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