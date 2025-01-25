let language = "English"
let ling = "none"

function submit() {
    console.log("'" + document.getElementById("message").innerText
        + "' From: " + document.getElementById("senderID").value
        + " To: " + document.getElementById("receiverID").value);

    let message = document.getElementById("message").innerText;
    let from = document.getElementById("senderID").value;
    let to = document.getElementById("receiverID").value;
    let trial = document.getElementById("trialNumber").value;

    if (message!="" && to!="" && from!=""){
        //------------------------------------------------------------------------------------Get Translation of Message
        let translatedMessage //= "*"+message+"* Translated To "+(language=="English"?"Mandarin":"English");
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
                translatedMessage = data["Data"];
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                alert("Status: " + textStatus);
                alert("Error: " + errorThrown);
            }
        });
        // }

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

        //Ajax to Python then to SQL Server
        let data = {lang: language, to: to, from: from, trial: trial}
        data["engMessage"] = bothMessages["engMessage"];
        data["manMessage"] = bothMessages["manMessage"];
        $.ajax({
            url: 'handleMessages.py',
            type: 'POST',
            loading: false,
            dataType: 'json',
            data: data,
            success: function (data) {
                console.log(data)
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                alert("Status: " + textStatus);
                alert("Error: " + errorThrown);
            }
        });
        console.log(data)

        //Clear Message and Scroll to Bottom
        document.getElementById("message").innerText = ""
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
    //Language
    document.getElementById("typingAlert").innerText = receiver+" is Typing"
    if(params.get('lang') && params.get('lang').toLowerCase()=="man"){
        language="Mandarin";
        document.getElementById("senderLbl").innerText = "你自己：";
        document.getElementById("receiverLbl").innerText = "发给：";
        document.getElementById("message").setAttribute("placeholder", "输入消息...");
        document.getElementById("trialNumber").placeholder = "试用号";
        document.getElementById("trialNumberLbl").innerText = "试用号：";
        document.getElementById("typingAlert").innerText = receiver+" 在打字"
        document.getElementById("WaitingAlertText").innerText = "对方还未进入聊天室"
        document.getElementById("clockLbl").innerText = "聊天时长："
        document.getElementById("message").style.minHeight = "88px"
        document.querySelectorAll('.btn').forEach(element => {element.style.width = "58px"})
    }
    document.querySelectorAll('.input-group-text').forEach(element => {
        language=="Mandarin"?element.style.width = "106px":element.style.width = "143px";
    })
    //Bilingual
    ling = params.get('bi-ling') ? params.get('bi-ling').toLowerCase() : ling ;

    //---------------------------------------------------------------------Connect to Server and Listen For New Messages
    let sse = new EventSource(`http://52.15.204.7:8080/stream?sender=${sender}&to=${receiver}&section=${document.title}`);
    sse.onmessage = console.log;
    sse.onmessage = (event) => {
        if(event.data!=null){
            const data = event.data
            let dataJSON = JSON.parse(data);
            console.log(dataJSON);

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
                console.log(data)
                if (data["Status"] == "Success"){
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


    document.getElementById("message").focus();
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