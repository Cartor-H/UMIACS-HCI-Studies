//---------------------------------------------------Global Variables-----------------------------------------------------//
let articleID = "-1";
let userID = "-1";

let tables = [
    { name: "Articles"               , upload: true , download: true  },
    { name: "ArticleCategories"      , upload: true , download: true  },
    { name: "ArticleOpenHistory"     , upload: false, download: true  },
    { name: "Messages"               , upload: false, download: true  },
    { name: "UnifiedMessages"        , upload: false, download: true  },
    { name: "MessageClassifications" , upload: false, download: true  },
    { name: "MessageIntentions"      , upload: false, download: true  },
    { name: "ChainOfThought"         , upload: false, download: true  },
];


//------------------------------------------------------On Load-------------------------------------------------------//

function onLoad(){

    //---------------------------------------------------------------------------------------------------Read URL Params
    const params = new URLSearchParams(document.location.search);

    // Get User ID From URL
    if (params.get('userID') != null) {
        userID = params.get('userID');
    }

    // Get Article ID From URL
    if (params.get('articleID') != null) {
        articleID = params.get('articleID');
    }

    for (let i = 0; i < tables.length; i++) {
        addTableRow(tables[i]);
    }
}

//----------------------------------------------------Clock Update----------------------------------------------------//

let startTime = null;

function updateClock() {
    const clockElement = document.getElementById("clock");
    if (clockElement) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;

        // Calculate minutes and seconds
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);

        // Format minutes and seconds with leading zeros
        const formattedMinutes = String(minutes).padStart(2, "0");
        const formattedSeconds = String(seconds).padStart(2, "0");

        // Update the clock display
        clockElement.value = `${formattedMinutes}:${formattedSeconds}`;

        // Schedule the next update in 1 second
        setTimeout(updateClock, 1000);
    }
}

//--------------------------------------------------Typing Detection--------------------------------------------------//

var typingTimeout;

function notifyTyping () {
    if (typingTimeout != undefined) {
        clearTimeout(typingTimeout);
    } else {
        notifyTypingHelper(document.getElementById("receiverID").value,"Start")
    }
    typingTimeout = setTimeout(function() {
        notifyTypingHelper(document.getElementById("receiverID").value,"Stop");
        typingTimeout = undefined;
    }, 1000);
}

function notifyTypingHelper(to, status){
    fetch(`http://52.15.204.7:8080/notify-typing?to=${to}&status=${status}&section=${document.title}`)
        .then(response => response.text())
        .then(result => {
            console.log(result);
        })
        .catch(error => {
            console.error(error);
        });
    console.log(typingTimeout)
    console.log("Typing " + status + " to " + to)
}

//----------------------------------------------Adding Messages To Screen---------------------------------------------//

function addMessageRight (message) {
    document.getElementById("chatWindow").innerHTML +=
        '<div class="card right-color offset-6 mb-3">' +
        '<div class="card-body pt-2 pb-2">' +
        message +
        '</div>' +
        '</div>';
}

function addMessageLeft (message) {
    document.getElementById("chatWindow").innerHTML +=
        '<div class="card left-color col-6 mb-3">' +
        '<div class="card-body pt-2 pb-2">' +
        message +
        '</div>' +
        '</div>';
}

//---------------------------------------------------Scroll Bottom----------------------------------------------------//

function scrollBottom() {
    var messageBody = document.querySelector('#chatWindow');
    messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
}


let shift = false;

function keyDown(e, func, element) {
    // Prevent default behavior of the Enter key
    if (e.keyCode === 13) {
        if (!shift) {
            e.preventDefault();
            func();
        }
    } else if (e.keyCode === 8 && !e.shiftKey) {
        // Handle backspace key
        const spanElement = document.getElementById(element.id);
        const content = spanElement.innerHTML;

        if (content === '<br>' || content === '<br><br>') {
            e.preventDefault();
            spanElement.innerHTML = '';
        }
    } else if (e.keyCode === 16) {
        shift = true;
    }
}

function keyUp(e) {
    if (e.keyCode == 16) {
        shift = false;
    }
}


//------------------------------------------------- Artilce Control -------------------------------------------------//

let articles = [];

function addArticle (location, title, description, date, id, photo = 'default_news_photo.png') {
    document.getElementById(location).innerHTML +=
        `<div class="col-md-2 mb-3">\n` +
        `  <a href="../article?articleID=${id}&userID=${userID}" class="card-link" style="text-decoration: none; color: inherit;" target="_blank">\n` +
        `    <div class="card h-100" style="transition: transform 0.2s, background-color 0.2s; cursor: pointer; background-color: #f8f9fa; border: none;">\n` +
        `      <div class="card-img-top" style="background-image: url('${photo}'); background-size: cover; background-position: center; aspect-ratio: 4 / 2;"></div>\n` +
        `      <div class="card-body p-3" style="font-family: 'Times New Roman', Times, serif;">\n` +
        `        <h5 class="card-title fs-4 font-weight-bold">${title}</h5>\n` +
        `        <p class="card-date">${date}</p>\n` +
        `        <p class="card-text">${description}</p>\n` +
        `      </div>\n` +
        `    </div>\n` +
        `  </a>\n` +
        `</div>\n`;

    // Add hover effect
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseover', () => {
            card.style.transform = 'scale(1.05)';
            card.style.backgroundColor = '#e2e6ef';
        });
        card.addEventListener('mouseout', () => {
            card.style.transform = 'scale(1)';
            card.style.backgroundColor = '#f8f9fa';
        });
    });
}

//------------------------------------------------- Article Upload -------------------------------------------------//

// Upload Excel File & Parse it into JSON of Articles
function uploadArticles() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx';
    fileInput.onchange = () => {
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Assuming the first sheet contains the articles
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert the sheet to JSON
                const articles = XLSX.utils.sheet_to_json(worksheet);

                // Process the articles as needed
                console.log(articles);

                // Add articles to the database
                addJSONArticlesToDB(articles);
            };
            reader.readAsArrayBuffer(file);
        }
    }
    fileInput.click();
}

function addJSONArticlesToDB(articles) {
    $.ajax({
        url: 'functions/save_articles.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: { articles: JSON.stringify(articles) },
        success: function (data) {
            console.log(data);
            if (data["Status"] == "Success") {
                console.log(JSON.parse(data["Data"]));
                // location.reload();
            } else {
                console.log(data);
                console.log(data["Traceback"]);
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
        }
    });
}

function downloadArticles() {

    $.ajax({
        url: 'functions/get_articles.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: {},
        success: function (data) {
            console.log(data)
            const jsonData = JSON.parse(data.Data);
            // Create a worksheet
            const ws = XLSX.utils.json_to_sheet(jsonData);

            // Create a workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "ChatLogs");

            // Generate the Excel file
            XLSX.writeFile(wb, "chat_logs.xlsx");
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
        }
    });
}

// ------------------------------------------------- Data Control ------------------------------------------------- //

function addTableRow(table) {
    let html = `
      <div class="card d-flex align-items-center mb-2 w-100 flex-shrink-1">
        <div class="card-body d-flex justify-content-between align-items-center w-100">
          <div class="d-flex align-items-center">
            <input type="checkbox" class="form-check-input table-name-check me-3 mt-0">
            <h5 class="mb-0 text-start d-md-none" style="font-size: 0.8rem;">${table.name}</h5>
            <h5 class="mb-0 text-start d-none d-md-block">${table.name}</h5>
          </div>
          <div class="ms-auto">
    `

    if (table.upload) {
        html += `
            <button type="button" class="btn btn-primary btn-sm ms-3" onclick="uploadData('${table.name}')">
                <i class="fas fa-upload"></i> Upload
            </button>
        `
    }

    if (table.download) {
        html += `
            <button type="button" class="btn btn-primary btn-sm ms-3" onclick="downloadData('${table.name}')">
                <i class="fas fa-download"></i> Download
            </button>
        `
    }

    console.log(table.name + " Added");
    html += `
          </div>
        </div>
      </div>
    `  

    document.getElementById("tableList").innerHTML += html;
}

// ╔═╗┬ ┬┌─┐┌─┐┬┌─┌┐ ┌─┐─┐ ┬  ╔═╗┌─┐┌┐┌┌┬┐┬─┐┌─┐┬  ┌─┐
// ║  ├─┤├┤ │  ├┴┐├┴┐│ │┌┴┬┘  ║  │ ││││ │ ├┬┘│ ││  └─┐
// ╚═╝┴ ┴└─┘└─┘┴ ┴└─┘└─┘┴ └─  ╚═╝└─┘┘└┘ ┴ ┴└─└─┘┴─┘└─┘

function selectAll() {
    const checkboxes = document.querySelectorAll('.table-name-check');
    if (document.getElementById('selectAll').checked) {
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
    } else {
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }
}

// ╦ ╦┌─┐┬  ┌─┐┌─┐┌┬┐  ╔╦╗┌─┐┌┬┐┌─┐
// ║ ║├─┘│  │ │├─┤ ││   ║║├─┤ │ ├─┤
// ╚═╝┴  ┴─┘└─┘┴ ┴─┴┘  ═╩╝┴ ┴ ┴ ┴ ┴

function uploadData(tableName) {

    let localTables = [tableName,];

    if (tableName === "all") {
        localTables = tables.map(table => table.name);
    }

    if (tableName === "selected") {
        localTables = [];
        const checkboxes = document.querySelectorAll('.table-name-check');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                localTables.push(checkbox.parentElement.querySelector('h5').innerText);
            }
        });
    }

    // For the selected tables, get the data and upload it from
    let tableData = {};
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx';
    fileInput.onchange = () => {
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                localTables.forEach((tableName) => {
                    if (workbook.SheetNames.includes(tableName)) {
                        const worksheet = workbook.Sheets[tableName];
                        const tableContent = XLSX.utils.sheet_to_json(worksheet);

                        // Insert table data into tableData for each table name
                        tableData[tableName] = tableContent;

                        console.log(`Data for table ${tableName}:`, tableContent);
                    } else {
                        console.warn(`Sheet for table ${tableName} not found in the workbook.`);
                    }
                });


                $.ajax({
                    url: 'functions/save_all_tables.py',
                    type: 'POST',
                    loading: false,
                    dataType: 'json',
                    data: { tables: JSON.stringify(localTables), data: JSON.stringify(tableData) },
                    success: function (data) {
                        console.log(data);

                        if (data.Status === "Success") {
                            const jsonData = JSON.parse(data.Data);
                            console.log(jsonData);

                            if (jsonData["Articles"] !== undefined) {
                                articles = JSON.parse(jsonData["Articles"]);
                                console.log(articles);
                            }

                            if (jsonData["ArticleCategories"] !== undefined) {
                                const categories = JSON.parse(jsonData["ArticleCategories"]);
                                console.log(categories);
                            }
                        }
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        alert("Status: " + textStatus);
                        alert("Error: " + errorThrown);
                    }
                });


            };
            reader.readAsArrayBuffer(file);
        }
    };
    fileInput.click();

    // Data format: { table1: [data1], table2: [data2], ... }
    
}

// ╔╦╗┌─┐┬ ┬┌┐┌┬  ┌─┐┌─┐┌┬┐  ╔╦╗┌─┐┌┬┐┌─┐
//  ║║│ ││││││││  │ │├─┤ ││   ║║├─┤ │ ├─┤
// ═╩╝└─┘└┴┘┘└┘┴─┘└─┘┴ ┴─┴┘  ═╩╝┴ ┴ ┴ ┴ ┴

function downloadData(tableName) {

    let localTables = [tableName,];

    if (tableName === "all") {
        localTables = tables.map(table => table.name);
    }

    if (tableName === "selected") {
        localTables = [];
        const checkboxes = document.querySelectorAll('.table-name-check');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                localTables.push(checkbox.parentElement.querySelector('h5').innerText);
            }
        });
    }

    $.ajax({
        url: 'functions/get_all_tables.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: { tables: JSON.stringify(localTables) },
        success: function (data) {
            console.log(data);
            const jsonData = JSON.parse(data.Data);
            console.log(jsonData);
            const wb = XLSX.utils.book_new();

            for (const table of Object.keys(jsonData)) {
                console.log(table);
                if (jsonData[table] == "") {
                    console.log("Empty Table");
                    continue;
                }
                console.log(JSON.parse(jsonData[table]));
                const ws = XLSX.utils.json_to_sheet(JSON.parse(jsonData[table]));
                XLSX.utils.book_append_sheet(wb, ws, table);
            }

            // Generate the Excel file
            XLSX.writeFile(wb, `${tableName}.xlsx`);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
        }
    });
}