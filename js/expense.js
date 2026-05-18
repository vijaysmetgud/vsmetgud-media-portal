let expenses =
    JSON.parse(
        localStorage.getItem(
            "expenses"
        )
    ) || [];

document.getElementById(
    "date"
).value =
    new Date()
    .toISOString()
    .split("T")[0];

renderExpenses();

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
        document.getElementById(
            "price"
        ).value;

    if(!item || !price){

        alert(
            "Fill all fields"
        );

        return;
    }

    expenses.push({

        id:Date.now(),

        date,

        item,

        price:Number(price)

    });

    saveExpenses();

    renderExpenses();

    speak(
        `${item} added`
    );

}

function saveExpenses(){

    localStorage.setItem(

        "expenses",

        JSON.stringify(expenses)

    );

}

function renderExpenses(){

    const expenseList =
        document.getElementById(
            "expenseList"
        );

    expenseList.innerHTML = "";

    expenses
    .slice()
    .reverse()
    .forEach(exp => {

        expenseList.innerHTML += `

        <div class="expenseItem">

            <h3>${exp.item}</h3>

            <p>${exp.date}</p>

            <h2>₹${exp.price}</h2>

        </div>

        `;

    });

    calculateTotals();

}

function calculateTotals(){

    const today =
        new Date()
        .toISOString()
        .split("T")[0];

    const currentMonth =
        new Date().getMonth();

    const currentYear =
        new Date().getFullYear();

    let daily = 0;
    let monthly = 0;
    let yearly = 0;
    let overall = 0;

    expenses.forEach(exp => {

        overall += exp.price;

        const expDate =
            new Date(exp.date);

        if(exp.date === today){

            daily += exp.price;

        }

        if(

            expDate.getMonth()
            === currentMonth &&

            expDate.getFullYear()
            === currentYear

        ){

            monthly += exp.price;

        }

        if(

            expDate.getFullYear()
            === currentYear

        ){

            yearly += exp.price;

        }

    });

    document.getElementById(
        "dailyTotal"
    ).innerText = `₹${daily}`;

    document.getElementById(
        "monthlyTotal"
    ).innerText = `₹${monthly}`;

    document.getElementById(
        "yearlyTotal"
    ).innerText = `₹${yearly}`;

    document.getElementById(
        "overallTotal"
    ).innerText = `₹${overall}`;

}

function speak(text){
 

    speechSynthesis.cancel();

    const speech =
        new SpeechSynthesisUtterance(
            text
        );

    speech.lang = "en-IN";

    speechSynthesis.speak(
        speech
    );

}

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

    recognition.start();

    document.getElementById(
        "voiceStatus"
    ).innerText =
        "🎤 Listening...";

    recognition.onresult = (event) => {

        const speech =
            event.results[0][0]
            .transcript
            .toLowerCase();

        console.log(
            "Voice:",
            speech
        );

        document.getElementById(
            "voiceStatus"
        ).innerText =
            "You said: " + speech;

        processVoiceExpense(speech);

    };

    recognition.onerror = (err) => {

        console.error(err);

        document.getElementById(
            "voiceStatus"
        ).innerText =
            "Voice recognition failed";
    };
}

function processVoiceExpense(text){

    text = text.toLowerCase();

    /* ================= TODAY ================= */

    if(
        text.includes("today expenses") ||

        text.includes("show today")
    ){

        showTodayExpenses();

        return;
    }

    /* ================= MONTH ================= */

    if(
        text.includes("monthly expenses") ||

        text.includes("show month")
    ){

        showMonthlyExpenses();

        return;
    }

    /* ================= YEAR ================= */

    if(
        text.includes("yearly expenses") ||

        text.includes("show year")
    ){

        showYearlyExpenses();

        return;
    }

    /* ================= TOTAL CALCULATION FOR ANY SPECIFIC DAY, DATE, WEEK, MONTH,YEAR  ================= */

    if(
        text.includes("today total")
    ){

        const today =
            new Date()
            .toISOString()
            .split("T")[0];

        const total =
            expenses

            .filter(
                exp => exp.date === today
            )

            .reduce(
                (sum, exp) =>
                    sum + exp.price,
                0
            );

        speak(
            `Today's total is ${total} rupees`
        );

        return;
    }

    /* ================= MONTH TOTAL ================= */

    if(
        text.includes("month total")
    ){

        const now =
            new Date();

        const total =
            expenses

            .filter(exp => {

                const d =
                    new Date(exp.date);

                return(

                    d.getMonth() ===
                    now.getMonth()

                    &&

                    d.getFullYear() ===
                    now.getFullYear()

                );

            })

            .reduce(
                (sum, exp) =>
                    sum + exp.price,
                0
            );

        speak(
            `Monthly total is ${total} rupees`
        );

        return;
    }

    /* ================= YEAR TOTAL ================= */

    if(
        text.includes("year total")
    ){

        const year =
            new Date()
            .getFullYear();

        const total =
            expenses

            .filter(exp =>

                new Date(exp.date)
                .getFullYear() === year

            )

            .reduce(
                (sum, exp) =>
                    sum + exp.price,
                0
            );

        speak(
            `Yearly total is ${total} rupees`
        );

        return;
    }

    /* ================= SPECIFIC DATE ================= */

    const dateMatch =
        text.match(
            /\d{4}-\d{2}-\d{2}/
        );

    if(dateMatch){

        showExpensesByDate(
            dateMatch[0]
        );

        return;
    }

    /* ================= ADD EXPENSE ================= */

    const words =
        text.split(" ");

    let amount = null;

    let itemWords = [];

    words.forEach(word => {

        const num =
            Number(word);

        if(!isNaN(num)){

            amount = num;

        } else {

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

    const expense = {

        id:Date.now(),

        date:today,

        item:item,

        price:Number(amount)

    };

    expenses.push(expense);

    saveExpenses();

    renderExpenses();

    speak(
        `${item} expense of ${amount} rupees added`
    );
}

function showTodayExpenses(){

    const today =
        new Date()
        .toISOString()
        .split("T")[0];

    const filtered =
        expenses.filter(
            exp => exp.date === today
        );

    renderExpenseHistory(
        filtered,
        "Today's Expenses"
    );
}

function showMonthlyExpenses(){

    const now =
        new Date();

    const filtered =
        expenses.filter(exp => {

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

    renderExpenseHistory(
        filtered,
        "Monthly Expenses"
    );
}

function showYearlyExpenses(){

    const year =
        new Date()
        .getFullYear();

    const filtered =
        expenses.filter(exp => {

            return(
                new Date(exp.date)
                .getFullYear() === year
            );

        });

    renderExpenseHistory(
        filtered,
        "Yearly Expenses"
    );
}

function showExpensesByDate(date){

    const filtered =
        expenses.filter(
            exp => exp.date === date
        );

    renderExpenseHistory(
        filtered,
        `Expenses for ${date}`
    );
}

function renderExpenseHistory(
    list,
    title
){

    const expenseList =
        document.getElementById(
            "expenseList"
        );

    expenseList.innerHTML =
        `<h2>${title}</h2>`;

    if(list.length === 0){

        expenseList.innerHTML += `
            <p>
                No expenses found
            </p>
        `;

        speak(
            "No expenses found"
        );

        return;
    }

    let total = 0;

    list.forEach(exp => {

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

window.addEventListener(

    "DOMContentLoaded",

    ()=>{

        speak(
            "Expense tracker ready"
        );

    }
);

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

    expenses.forEach(exp => {

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
========================

TOTAL = ₹${total}
`;

    const blob =
        new Blob(

            [text],

            {
                type:"text/plain"
            }

        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download =
        "expense-report.txt";

    a.click();

    URL.revokeObjectURL(url);

    speak(
        "Expense report downloaded"
    );
}