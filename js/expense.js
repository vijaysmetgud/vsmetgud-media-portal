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

    const recognition =
        new SpeechRecognition();

    recognition.lang = "en-IN";

    recognition.start();

    document.getElementById(
        "voiceStatus"
    ).innerText =
        "Listening...";

    recognition.onresult =
    (event) => {

        const command =

            event.results[0][0]
            .transcript
            .toLowerCase();

        processVoice(command);

    };

}

function processVoice(command){

    if(
        command.includes("show today")
    ){

        showTodayExpenses();

        return;

    }

    const words =
        command.split(" ");

    let amount = null;

    words.forEach(word => {

        if(!isNaN(word)){

            amount = Number(word);

        }

    });

    if(amount){

        const item =
            command
            .replace(amount,"")
            .trim();

        expenses.push({

            id:Date.now(),

            date:new Date()
                .toISOString()
                .split("T")[0],

            item,

            price:amount

        });

        saveExpenses();

        renderExpenses();

        speak(
            `${item} added`
        );

    }

}

function showTodayExpenses(){

    const today =
        new Date()
        .toISOString()
        .split("T")[0];

    const todayExpenses =
        expenses.filter(
            exp => exp.date === today
        );

    const expenseList =
        document.getElementById(
            "expenseList"
        );

    expenseList.innerHTML = "";

    todayExpenses.forEach(exp => {

        expenseList.innerHTML += `

        <div class="expenseItem">

            <h3>${exp.item}</h3>

            <p>${exp.date}</p>

            <h2>₹${exp.price}</h2>

        </div>

        `;

    });

}