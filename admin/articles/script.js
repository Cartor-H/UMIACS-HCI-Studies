//---------------------------------------------------Global Variables-----------------------------------------------------//
let articleID = "-1";
let userID = "-1";


//------------------------------------------------------On Load-------------------------------------------------------//

function onLoad(){

    //---------------------------------------------------------------------------------------------------Read URL Params
    // const params = new URLSearchParams(document.location.search);
    // if(params.get('editable')!=null){
    //     document.getElementById("senderID").readOnly = false;
    //     document.getElementById("receiverID").readOnly = false;
    //     document.getElementById("trialNumber").readOnly = false;
    // }
    let sender = "";
    let receiver = "";
    // sender = params.get('from');
    // receiver = params.get('to');
    // document.getElementById("senderID").value = sender;
    // document.getElementById("receiverID").value = receiver;
    // //Trial
    // let trial = params.get('trial');
    // document.getElementById("trialNumber").value = trial;

    // document.getElementById("typingAlert").innerText = receiver+" is Typing"

    // Read URL Params
    const params = new URLSearchParams(document.location.search);

    // Get User ID From URL
    if (params.get('userID') != null) {
        userID = params.get('userID');
    }

    // Get Article ID From URL
    if (params.get('articleID') != null) {
        articleID = params.get('articleID');
    }


    // //---------------------------------------------------------------------------------------------------Get Articles
    // //Ajax Python Call To Get Messages From SQL Server
    // $.ajax({
    //     url: 'functions/get_articles.py',
    //     type: 'POST',
    //     loading: false,
    //     dataType: 'json',
    //     success: function (data) {
    //         console.log(data)
    //         if (data["Status"] == "Success") {
    //             articles = JSON.parse(data["Data"])

    //             //---------------------------------------------------------------------------------------------------Add Articles
    //             const oneWeekAgo = new Date();
    //             oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    //             for (let i = 0; i < articles.length; i++) {
    //                 let articleDate = new Date(articles[i]["Published_Date"]);
    //                 let formattedDate = articleDate.toLocaleDateString();
    //                 if (articleDate >= oneWeekAgo) {
    //                     addArticle("recentlyUpdatedArticles", articles[i]["Title"], articles[i]["Description"], formattedDate, articles[i]["ID"]);
    //                 } else {
    //                     addArticle("olderNewsArticles", articles[i]["Title"], articles[i]["Description"], formattedDate, articles[i]["ID"]);
    //                 }
    //             }
    //         } else {
    //             console.log("Something Went Wrong On Data Retrieval");
    //             console.log(data);
    //         }
    //     },
    //     error: function (XMLHttpRequest, textStatus, errorThrown) {
    //         alert("Status: " + textStatus);
    //         alert("Error: " + errorThrown);
    //     }
    // });


    //---------------------------------------------------------------------Connect to Server and Listen For New Messages
    // let sse = new EventSource(`http://52.15.204.7:8080/stream?sender=${sender}&to=${receiver}&section=${document.title}`);
    // sse.onmessage = console.log;
    // sse.onmessage = (event) => {
    //     if(event.data!=null){
    //         const data = event.data
    //         let dataJSON = JSON.parse(data);
    //         console.log(dataJSON);

    //         if(dataJSON["connected"] && dataJSON["startTime"]){
    //             console.log("Start Clock")
    //             startTime = dataJSON["startTime"];
    //             document.getElementById("alerts").innerHTML =
    //                 '<div class="alert alert-success alert-dismissible fade show p-2 mt-0 mb-2 ms-2 me-2 flex-shrink-1 d-flex align-items-center" id="ConnectedAlert" role="alert">\n' +
    //                 '  <svg class="bi bi-check-circle-fill flex-shrink-0 me-2" viewBox="0 0 16 16" fill="currentColor" width="24" height="24" role="img" xmlns="http://www.w3.org/2000/svg">\n' +
    //                 '     <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>\n' +
    //                 '  </svg>\n' +
    //                 '  Both people have joined the room.\n' +
    //                 '  <!-- <button type="button" class="btn-close flex-shrink-0" style="padding: 12px" data-bs-dismiss="alert" aria-label="Close"></button> -->\n' +
    //                 '</div>'
    //             updateClock();
    //         }

    //         //------------------------------------------------------------------------Local Response To Notice Of Typing
    //         if(dataJSON["Status"]!=null){
    //             if(dataJSON["Status"]=="Start"){
    //                 document.getElementById("typingAlert").hidden = false
    //             } else {
    //                 document.getElementById("typingAlert").hidden = true
    //             }
    //         }

    //         //-----------------------------------------------------------------------------Local Response To New Message
    //         if(dataJSON["message"]!=null){
    //             const {to, message} = dataJSON;
    //             // if (to == document.getElementById("senderID").value) {
    //             addMessageLeft(message);
    //             scrollBottom();
    //             // }
    //         }
    //     }
    // }

    //-------------------------------------------------------------------------------------------Get Messages On Refresh
    // //Ajax Python Call To Get Messages From SQL Server
    // if(sender && receiver && sender!="" && receiver!="") {
    //     $.ajax({
    //         url: 'functions/getMessages.py',
    //         type: 'POST',
    //         loading: false,
    //         dataType: 'json',
    //         data: {to: receiver, from: sender, trial: trial},
    //         success: function (data) {
    //             console.log(data)
    //             if (data["Status"] == "Success") {
    //                 let messages = JSON.parse(data["Data"])
    //                 for (let i = 0; i < messages.length; i++) {
    //                     if (messages[i]["SenderID"] == sender) {
    //                         addMessageRight(messages[i]["Message"]);
    //                     } else {
    //                         addMessageLeft(messages[i]["Message"]);
    //                     }
    //                 }
    //             } else {
    //                 console.log("Something Went Wrong On Data Retrieval");
    //                 console.log(data);
    //             }

    //             scrollBottom();
    //         },
    //         error: function (XMLHttpRequest, textStatus, errorThrown) {
    //             alert("Status: " + textStatus);
    //             alert("Error: " + errorThrown);
    //         }
    //     });
    // }


    // document.getElementById("message").focus();
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
                // Count and print the number of \r and \n in the Content column before and after processing
                let beforeCountR = 0;
                let beforeCountN = 0;
                articles.forEach(article => {
                    if (article.Content) {
                        beforeCountR += (article.Content.match(/\r/g) || []).length;
                        beforeCountN += (article.Content.match(/\n/g) || []).length;
                    }
                });
                console.log(`Before processing: \\r count = ${beforeCountR}, \\n count = ${beforeCountN}`);

                // Process the articles' Content column
                articles.forEach(article => {
                    if (article.Content) {
                        const content = article.Content;
                        const contentCountR = (content.match(/\r/g) || []).length;
                        const contentCountN = (content.match(/\n/g) || []).length;
                        // console.log(`Article ID: ${article.ID}, Content \\r count = ${contentCountR}, \\n count = ${contentCountN}`);
                    }
                });

                const processedData = JSON.stringify(articles);
                const afterCountR = (processedData.match(/\r/g) || []).length;
                const afterCountN = (processedData.match(/\n/g) || []).length;
                console.log(`After processing: \\r count = ${afterCountR}, \\n count = ${afterCountN}`);

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