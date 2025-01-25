let language = "English"
let ling = "none"
let agency = false

let originalTranslation = ""
let timeOfTranslation = ""
let reTranslated = false


function translateBtn() {
    (document.getElementById("translateBtn").innerText == "翻译")? translateMessage() : clearTranslation();
}

function clearTranslation() {
    console.log("Clear")
    originalTranslation = ""
    keyList = " "
    reTranslated = false
    document.getElementById("message").innerText = ""
    document.getElementById("translatedMessage").focus();
    // if(agency){
    document.getElementById("message").setAttribute("contenteditable","");
    // document.getElementById("sendGroup").hidden = true;
    // document.getElementById("optionGroup").hidden = true;
    document.getElementById("message").focus();
    // }
    document.getElementById("translatedMessage").innerText = ""
    document.getElementById("translateBtn").innerText = "翻译"

    stopSnaphshot()
    englishMessages = []
}


async function translateMessage() {
    if (originalTranslation != "" && originalTranslation != "\n") {
        reTranslated = true
    }

    let message = document.getElementById("message").innerText;

    if (message!="") {
        originalTranslation = getTranslation(message);


        //----------------------------------------------------------------------------------------Paraphrase Translation
        // let paras1 = [originalTranslation, originalTranslation+" 1",originalTranslation+" 2",originalTranslation+" 3"]
        let paras = await getPraphrases(originalTranslation)

        // paras.push(originalTranslation)

        // let indexRemoved = Math.floor(Math.random() * 4)
        document.getElementById("translatedMessage").innerText = originalTranslation//paras[indexRemoved];
        // paras.splice(indexRemoved,1)

        for(let i = paras.length; i>0; i--){
            let indexRemoved = Math.floor(Math.random() * i)
            document.getElementById("optionMessage"+(5-i)).innerText = paras[indexRemoved];
            paras.splice(indexRemoved,1)
        }

        document.getElementById("message").removeAttribute("contenteditable")
        // document.getElementById("sendGroup").hidden = false;
        // document.getElementById("optionGroup").hidden = false;
        document.getElementById("translatedMessage").focus();
        document.getElementById("translateBtn").innerText = "清空"

        startSnaphshot(document.getElementById("translatedMessage"))
    }
}

async function getPraphrases(message) {
    const url = 'https://rewriter-paraphraser-text-changer-multi-language.p.rapidapi.com/rewrite';
    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': '535beaecb1mshecafc8660263b1ep196787jsn8c85904a3032',
            'X-RapidAPI-Host': 'rewriter-paraphraser-text-changer-multi-language.p.rapidapi.com'
        },
        body: JSON.stringify({
            language: 'en',
            strength: 3,
            text: message
        })
    };

    try {
        const response = await fetch(url, options);
        const result = await response.text();

        const data = JSON.parse(result);

        // Extract the relevant properties from the API response
        const rewrite = data.rewrite;
        const synonyms = data.synonyms;

        // Replace each synonym in the rewrite with its first synonym
        let list = [rewrite,rewrite,rewrite,rewrite]
        for (const word in synonyms) {
            synonyms[word].push(word)
            list[1] = list[1].replace(new RegExp(`\\b${word}\\b`, 'gi'), synonyms[word][0%synonyms[word].length]);
            list[2] = list[2].replace(new RegExp(`\\b${word}\\b`, 'gi'), synonyms[word][1%synonyms[word].length]);
            list[3] = list[3].replace(new RegExp(`\\b${word}\\b`, 'gi'), synonyms[word][2%synonyms[word].length]);
        }
        console.log(list);

        console.log(result);
        return list
    } catch (error) {
        console.error(error);
    }
}

function switchMessage(number) {
    let temp = document.getElementById("translatedMessage").innerText
    document.getElementById("translatedMessage").innerText = document.getElementById("optionMessage"+number).innerText
    document.getElementById("optionMessage"+number).innerText = temp
}


//--------------------------------------------------------------------------------------------------------Submit Message

function submit() {
    console.log("'" + document.getElementById("message").innerText
        + "' From: " + document.getElementById("senderID").value
        + " To: " + document.getElementById("receiverID").value);


    let message = agency? document.getElementById("message").innerText :
        document.getElementById("translatedMessage").innerText;
    let from = document.getElementById("senderID").value;
    let to = document.getElementById("receiverID").value;
    let trial = document.getElementById("trialNumber").value;

    if(message==""){
        return
    }

    let translatedMessage = agency ?
        document.getElementById("translatedMessage").innerText : getTranslation(message);


    if (translatedMessage!="" && to!="" && from!=""){

        stopSnaphshot()

        let bothMessages
        if(language=="English"){
            bothMessages = {engMessage: message, manMessage: translatedMessage}
        } else {
            bothMessages = {engMessage: translatedMessage, manMessage: message}
        }

        //Show Message Locally
        addMessageRight(message,translatedMessage);
        //Send Message to Receiver
        sendMessage(to,JSON.stringify(bothMessages));


        //-------------------------------------------------------------------------------------Add Message To SQL Server
        let messageID
        let data = {lang: language, to: to, from: from, trial: trial}
        data["engMessage"] = bothMessages["engMessage"];
        data["manMessage"] = bothMessages["manMessage"];
        //Ajax Call To Serverside Python
        $.ajax({
            url: 'handleMessages.py',
            type: 'POST',
            loading: false,
            dataType: 'json',
            data: data,
            success: function (data) {
                console.log("Data From Message Add: "+data)
                if (data["Status"] == "Success"){
                    messageID = data["Data"]
                    addToEdits(messageID,from,message,translatedMessage)
                    submitSnapshot(messageID)
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


        //----------------------------------------------------------------------------Clear Message and Scroll to Bottom
        document.getElementById("message").innerText = ""
        document.getElementById("translatedMessage").focus();
        if(agency){
            document.getElementById("message").setAttribute("contenteditable","")
            // document.getElementById("sendGroup").hidden = true;
            // document.getElementById("optionGroup").hidden = true;
            document.getElementById("message").focus();
            document.getElementById("translateBtn").innerText = "翻译"
        }
        document.getElementById("translatedMessage").innerText = ""
        scrollBottom();
    }
}


function sendMessage(to, message) {
    fetch(`http://52.15.204.7:8080/send-message?to=${to}&message=${message}&section=${document.title}`)
        .then(response => response.text())
        .then(result => {
            console.log(result);
        })
        .catch(error => {
            console.error(error);
        });
}

//-----------------------------------------------------------------------------------------If Agency Add To Edit History
function addToEdits(messageID,from,message,translatedMessage){
    if(agency){
        //Ajax Call To Serverside Python
        $.ajax({
            url: 'handleEdits.py',
            type: 'POST',
            loading: false,
            dataType: 'json',
            data: {mID: messageID, time: timeOfTranslation, senderID: from, source: message, keys: keyList,
                translation: originalTranslation, editedTranslation: translatedMessage, reTranslated: reTranslated},
            success: function (data) {
                console.log(data)
                originalTranslation = ""
                keyList = " "
                reTranslated = false
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                alert("Status: " + textStatus);
                alert("Error: " + errorThrown);
            }
        });
    }
}

//--------------------------------------------------Get Translation---------------------------------------------------//

function getTranslation(message) {
    //-------------------------------------------------------------Call To Translation API To Get The Translated Message
    let tempTranslation// = "*"+message+"* Translated To "+(language=="English"?"Mandarin":"English");
    // if(language=="Mandarin"){
        $.ajax({
            url: '../getTranslation.py',
            type: 'POST',
            loading: false,
            dataType: 'json',
            data: {message: message, language: language},
            async: false,
            success: function (data) {
                console.log(data)
                tempTranslation = data["Data"];
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                alert("Status: " + textStatus);
                alert("Error: " + errorThrown);
            }
        });
    // }

    // Get the current time
    let currentTime = new Date();
    // Subtract 4 hours
    currentTime.setHours(currentTime.getHours() - 4);
    // Convert the time to the SQL Server datetime2 format
    timeOfTranslation = currentTime.toISOString().slice(0, 19).replace('T', ' ');

    return tempTranslation;
}


//------------------------------------------------------On Load-------------------------------------------------------//

function onLoad(){

    //---------------------------------------------------------------------------------------------------Read URL Params
    const params = new URLSearchParams(document.location.search);
    //Editable
    if(params.get('editable')!=null){
        document.getElementById("senderID").readOnly = false;
        document.getElementById("receiverID").readOnly = false;
        document.getElementById("trialNumber").readOnly = false;
    }
    //To & From
    let sender = "";
    let receiver = "";
    sender = params.get('from');
    receiver = params.get('to');
    document.getElementById("senderID").value = sender;
    document.getElementById("receiverID").value = receiver;
    //Trial
    let trial = params.get('trial');
    document.getElementById("trialNumber").value = trial;
    //Agency
    agency = params.get('agency')=="" ? true : false;
    //Language
    document.getElementById("typingAlert").innerText = receiver+" is Typing"
    if(params.get('lang') && params.get('lang').toLowerCase()=="man"){
        language="Mandarin";
        agency=true;
        document.getElementById("senderLbl").innerText = "你自己：";
        document.getElementById("receiverLbl").innerText = "发给：";
        document.getElementById("message").setAttribute("placeholder", "输入消息...");
        document.getElementById("translatedMessage").setAttribute("placeholder", "翻译的消息");
        document.getElementById("translateBtn").innerText = "翻译";
        document.getElementById("trialNumber").placeholder = "试用号";
        document.getElementById("trialNumberLbl").innerText = "试用号：";
        document.getElementById("typingAlert").innerText = receiver+" 在打字"
        document.getElementById("WaitingAlertText").innerText = "对方还未进入聊天室"
        document.getElementById("clockLbl").innerText = "聊天时长："
        document.querySelectorAll('.btn-same').forEach(element => {element.style.width = "58px"})
    }
    document.querySelectorAll('.input-group-text').forEach(element => {
        language=="Mandarin"?element.style.width = "106px":element.style.width = "143px";
    })
    //Bilingual
    ling = params.get('bi-ling') ? params.get('bi-ling').toLowerCase() : ling ;
    //Agency Effects
    document.getElementById("message").focus();
    if(!agency){
        document.getElementById("sendGroup").hidden=false;
        document.getElementById("translatedMessage").setAttribute("placeholder",
            document.getElementById("message").getAttribute("placeholder"));
        document.getElementById("sendGroup").classList.remove('mt-2');
        document.getElementById("translateGroup").hidden=true;
        document.getElementById("translatedMessage").focus();
    }


    //---------------------------------------------------------------------Connect to Server and Listen For New Messages
    let sse = new EventSource(`http://52.15.204.7:8080/stream?sender=${sender}&to=${receiver}&section=${document.title}`);
    sse.onmessage = console.log;
    sse.onmessage = (event) => {
        if(event.data!=null){
            const data = event.data
            let dataJSON = JSON.parse(data);

            if(dataJSON["connected"] && dataJSON["startTime"]){
                console.log("Start Clock")
                startTime = dataJSON["startTime"];
                document.getElementById("alerts").innerHTML =
                    '<div class="alert alert-success alert-dismissible fade show p-2 mt-0 mb-2 ms-2 me-2 flex-shrink-1 d-flex align-items-center" id="ConnectedAlert" role="alert">\n' +
                    '  <svg class="bi bi-check-circle-fill flex-shrink-0 me-2" viewBox="0 0 16 16" fill="currentColor" width="24" height="24" role="img" xmlns="http://www.w3.org/2000/svg">\n' +
                    '     <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>\n' +
                    '  </svg>\n' +
                    (language=="Mandarin"? '对方已进入聊天室\n' : 'Both people have joined the room.\n') +
                    '  <!-- <button type="button" class="btn-close flex-shrink-0" style="padding: 12px" data-bs-dismiss="alert" aria-label="Close"></button> -->\n' +
                    '</div>'
                updateClock();
            }

            //------------------------------------------------------------------------Local Response To Notice Of Typing
            if(dataJSON["Status"]!=null){
                if(dataJSON["Status"]=="Start"){
                    document.getElementById("typingAlert").hidden = false
                } else {
                    document.getElementById("typingAlert").hidden = true
                }
            }

            //-----------------------------------------------------------------------------Local Response To New Message
            if(dataJSON["message"]!=null){
                const {to, message} = dataJSON;
                // if (to == document.getElementById("senderID").value) {
                let parsed = JSON.parse(message);
                if(language=="Mandarin"){
                    addMessageLeft(parsed["manMessage"],parsed["engMessage"])
                } else {
                    addMessageLeft(parsed["engMessage"],parsed["manMessage"])
                }
                // }
            }

            scrollBottom();
        }
    }


    //-------------------------------------------------------------------------------------------Get Messages On Refresh
    //Ajax Python Call To Get Messages From SQL Server
    if(sender && receiver && sender!="" && receiver!=""){
        $.ajax({
            url: 'getMessages.py',
            type: 'POST',
            loading: false,
            dataType: 'json',
            data: {to: receiver, from: sender, trial: trial},
            success: function (data) {
                if (data["Status"] == "Success"){
                    console.log(data)
                    let messages = JSON.parse(data["Data"])
                    let messageType = language=="Mandarin" ?
                        ["MandarinMessage" , "EnglishMessage"] : ["EnglishMessage" , "MandarinMessage"];
                    for(let i = 0; i<messages.length; i++){
                        if(messages[i]["SenderID"]==sender){
                            addMessageRight(messages[i][messageType[0]],messages[i][messageType[1]]);
                        } else {
                            addMessageLeft(messages[i][messageType[0]],messages[i][messageType[1]]);
                        }
                    }
                } else {
                    console.log("Something Went Wrong On Data Retrieval");
                    console.log(data);
                }

                scrollBottom();
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                alert("Status: " + textStatus);
                alert("Error: " + errorThrown);
            }
        });
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
    // console.log(typingTimeout)
    // console.log("Typing " + status + " to " + to)
}

//----------------------------------------------Adding Messages To Screen---------------------------------------------//

function addMessageRight (topText,bottomText) {
    document.getElementById("chatWindow").innerHTML +=
        '<div class="card right-color offset-6 mb-3">' +
        '<div class="card-body pt-2 pb-2">' +
        topText +
        (ling=="both"||ling=="right"?'<p class="secondary-color m-0">'+bottomText+'</p>':"") +
        '</div>' +
        '</div>';
}

function addMessageLeft  (topText,bottomText) {
    document.getElementById("chatWindow").innerHTML +=
        '<div class="card left-color col-6 mb-3">' +
        '<div class="card-body pt-2 pb-2">' +
        topText +
        (ling=="both"||ling=="left"?'<p class="secondary-color m-0">'+bottomText+'</p>':"") +
        '</div>' +
        '</div>';
}

//---------------------------------------------------Scroll Bottom----------------------------------------------------//

function scrollBottom() {
    var messageBody = document.querySelector('#chatWindow');
    messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
}

//--------------------------------------------------Submit With Keys--------------------------------------------------//

let shift = false;

let keyList = " "

function checkCursor() {
    // Log Clicks
    if (agency && originalTranslation !== "") {
        let spanElement = document.getElementById("translatedMessage");

        document.addEventListener("click", function(event) {
            if (event.target === spanElement) {
                let clickPosition = window.getSelection().getRangeAt(0);
                let clickStart = clickPosition.startOffset;
                let clickEnd = clickPosition.endOffset;
                let clickText = "Click " + clickStart + (clickStart === clickEnd ? "" : "->" + clickEnd);

                if (keyList.endsWith(clickText)) {
                    let startIndex = keyList.lastIndexOf(",") + 1;
                    let repeatCount = parseInt(keyList.substring(startIndex)) + 1;
                    if (isNaN(repeatCount)) {
                        repeatCount = 1;
                    }

                    keyList = keyList.substring(0, startIndex) + repeatCount + "x " + clickText;
                } else {
                    keyList += "," + clickText;
                }
            }
        });
    }
}

function keyDown(e, func, element) {
    // Log Keys
    if (agency && originalTranslation !== "") {
        if (keyList.endsWith(e.key)) {
            // If the last character in keyList is the same as the current key
            let startIndex = keyList.lastIndexOf(",") + 1;
            let repeatCount = parseInt(keyList.substring(startIndex)) + 1;
            if (isNaN(repeatCount)) {
                repeatCount = 1;
            }

            keyList = keyList.substring(0, startIndex) + repeatCount + "x " + e.key;
        } else {
            keyList += "," + e.key;
        }
    }

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
    if (e.keyCode == 16){
        shift = false;
    }
}

//--------------------------------------------Translation Snapshot History--------------------------------------------//

// const inputElement = document.getElementById('myInput');
let englishMessages = [];

let intervalId;

// inputElement.addEventListener('focus', () =>
function startSnaphshot(inputElement) {
    // Start the interval when the input box is focused
    if (document.activeElement === inputElement) {
        const inputValue = inputElement.innerText;
        englishMessages.push(inputValue);
        console.log('Snapshots:', englishMessages);
    }
    intervalId = setInterval(() => {
        if (document.activeElement === inputElement) {
            const inputValue = inputElement.innerText;
            englishMessages.push(inputValue);
            console.log('Snapshots:', englishMessages);
        }
    }, 5000); // Every 5 seconds
}

// inputElement.addEventListener('blur', () =>
function stopSnaphshot() {
    // Stop the interval when the input box loses focus
    clearInterval(intervalId);
}

function submitSnapshot(messageID) {
    if(agency){
        //Ajax Call To Serverside Python
        $.ajax({
            url: 'handleSnapshots.py',
            type: 'POST',
            loading: false,
            dataType: 'json',
            data: {mID: messageID, englishMessages: JSON.stringify(englishMessages)},
            success: function (data) {
                console.log(data)
                englishMessages = []
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                alert("Status: " + textStatus);
                alert("Error: " + errorThrown);
            }
        });
    }
}

//-----------------------------------------------------Toggle Menu----------------------------------------------------//

// function toggleDropDown() {
//     let menu = document.getElementById("dropdown-menu")
//     if (menu.hidden){
//         menu.hidden = false;
//     } else {
//         menu.hidden = true;
//     }
// }