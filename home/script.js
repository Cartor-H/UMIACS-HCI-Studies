//---------------------------------------------------Global Variables-----------------------------------------------------//
let articleID = "-1";
let userID = "-1";
let historyCategory = "";


//------------------------------------------------------On Load-------------------------------------------------------//

function onLoad(){

    //---------------------------------------------------------------------------------------------------Read URL Params

    let sender = "";
    let receiver = "";

    // Read URL Params
    const params = new URLSearchParams(document.location.search);

    // Get User ID From URL
    if (params.get('userID') != null) {
        userID = params.get('userID');
        document.getElementById("userID").innerText = userID;
        document.getElementById("homeNav").href = "../home?userID=" + userID;
        document.getElementById("historyNav").href = "../history?userID=" + userID;
    }

    // Get Article ID From URL
    if (params.get('articleID') != null) {
        articleID = params.get('articleID');
    }


    //---------------------------------------------------------------------------------------------------Get Articles
    //Ajax Python Call To Get Messages From SQL Server
    $.ajax({
        url: 'functions/get_articles.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: {userID: userID},
        success: function (data) {
            console.log(data)
            if (data["Status"] == "Success") {
                let articleData = data["Data"]

                //---------------------------------------------------------------------------------------------------Add Articles
                // const oneWeekAgo = new Date();
                // oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                categories = JSON.parse(articleData["Categories"]);
                articles = JSON.parse(articleData["Articles"]);

                console.log(categories);
                console.log(articles);

                for (let i = 0; i < categories.length; i++) {
                    let category = categories[i]["Category"];
                    // if (i == 1) {
                    //     historyCategory = category;
                    // }
                    document.getElementById("content").innerHTML += `
                    <div class="row m-5 mb-4">
                        <div class="col">
                            <h2><strong>${category}</strong></h2>
                            <div id="${strToID(category)}" class="row">
                            </div>
                        </div>
                    </div>
                    `;
                }


                for (let i = 0; i < articles.length; i++) {
                    let articleDate = new Date(articles[i]["Published_Date"]);
                    let formattedDate = articleDate.toLocaleDateString();
                    let category = articles[i]["Category"]

                    console.log(category)

                    if (category != null && document.getElementById(strToID(category)) != null) {
                        addArticle(strToID(category), articles[i]["Title"], articles[i]["Description"], formattedDate, articles[i]["ID"]);
                    }
                }
            } else {
                console.log("Something Went Wrong On Data Retrieval");
                console.log(data);
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
        }
    });


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
        `  <div class="card h-100" style="transition: transform 0.2s, background-color 0.2s; cursor: pointer; background-color: #f8f9fa; border: none;" onclick="window.open('../article?articleID=${id}&userID=${userID}', '_blank')">\n` +
        `    <div class="card-body p-3" style="font-family: 'Times New Roman', Times, serif;">\n` +
        `      <h5 class="card-title fs-4 fw-bold">${title}</h5>\n` +
        `      <p class="card-date fw-bold" style="color: #6c757d;">${date}</p>\n` +
        `      <p class="card-text">${description}</p>\n` +
        `    </div>\n` +
        `  </div>\n` +
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

function strToID(str){
    return str.charAt(0).toLowerCase() + str.slice(1).replace(/\s+/g, '');
}


// Listen For Arctile Page Redirect Home
window.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'focusHome') {
      // Optionally ensure the URL is set correctly
      window.location.href = event.data.url;
      window.focus();
    }
  });