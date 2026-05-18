let expenses =

    JSON.parse(
        localStorage.getItem(
            "expenses"
        )
    ) || [];

/* ================= SAVE ================= */

function saveExpenses(){

    localStorage.setItem(

        "expenses",

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

/* ================= ADD EXPENSE ================= */

function addExpense(){

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

        date,

        item,

        price
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

        processVoiceExpense(
            text
        );
    };

    recognition.onerror =
    (event)=>{

        console.error(event);

        document.getElementById(
            "voiceStatus"
        ).innerText =
            "Voice recognition failed";

        speak(
            "Voice recognition failed"
        );
    };
}

/* ================= PROCESS VOICE ================= */

function processVoiceExpense(text){

    text =
        text.toLowerCase();

    /* ================= TODAY ================= */

    if(
        text.includes(
            "today expenses"
        )
    ){

        showTodayExpenses();

        return;
    }

    /* ================= MONTH ================= */

    if(
        text.includes(
            "monthly expenses"
        )
    ){

        showMonthlyExpenses();

        return;
    }

    /* ================= YEAR ================= */

    if(
        text.includes(
            "yearly expenses"
        )
    ){

        showYearlyExpenses();

        return;
    }

    /* ================= ADD EXPENSE ================= */

    const words =
        text.split(" ");

    let amount = null;

    let itemWords = [];

    words.forEach(word=>{

        const num =
            Number(word);

        if(!isNaN(num)){

            amount = num;

        }

        else{

            itemWords.push(word);
        }
    });

    const item =
        itemWords.join(" ");

    if(!item || !amount){

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
        "expense-report.txt";

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

renderExpenses();