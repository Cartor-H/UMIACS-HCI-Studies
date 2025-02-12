function submit() {
    console.log("'" + document.getElementById("message").innerText
        + "' From: " + document.getElementById("senderID").value
        + " To: " + document.getElementById("receiverID").value);

    let message = document.getElementById("message").innerText;
    let from = document.getElementById("senderID").value;
    let to = document.getElementById("receiverID").value;
    let trial = document.getElementById("trialNumber").value;

    if (message!="" && to!="" && from!=""){
        //Show Message Locally
        addMessageRight(message);

        //Send Message to Receiver
        sendMessage(to,message);

        //-------------------------------------------------------------------------------------Add Message To SQL Server
        //Ajax Call To Serverside Python
        $.ajax({
            url: 'handleMessages.py',
            type: 'POST',
            loading: false,
            dataType: 'json',
            data: {to: to, from: from, trial: trial, message: message},
            success: function (data) {
                console.log(data)
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                alert("Status: " + textStatus);
                alert("Error: " + errorThrown);
            }
        });

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
    // const params = new URLSearchParams(document.location.search);
    // if(params.get('editable')!=null){
    //     document.getElementById("senderID").readOnly = false;
    //     document.getElementById("receiverID").readOnly = false;
    //     document.getElementById("trialNumber").readOnly = false;
    // }
    // let sender = "";
    // let receiver = "";
    // sender = params.get('from');
    // receiver = params.get('to');
    // document.getElementById("senderID").value = sender;
    // document.getElementById("receiverID").value = receiver;
    // //Trial
    // let trial = params.get('trial');
    // document.getElementById("trialNumber").value = trial;

    // document.getElementById("typingAlert").innerText = receiver+" is Typing"


    //---------------------------------------------------------------------------------------------------Add Articles
    addArticleTittle(articleTittle);
    for (let i = 0; i < articles.length; i++) {
        addArticleLine(articles[i]);
    }

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
                    '  Both people have joined the room.\n' +
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
                addMessageLeft(message);
                scrollBottom();
                // }
            }
        }
    }

    //-------------------------------------------------------------------------------------------Get Messages On Refresh
    //Ajax Python Call To Get Messages From SQL Server
    if(sender && receiver && sender!="" && receiver!="") {
        $.ajax({
            url: 'getMessages.py',
            type: 'POST',
            loading: false,
            dataType: 'json',
            data: {to: receiver, from: sender, trial: trial},
            success: function (data) {
                console.log(data)
                if (data["Status"] == "Success") {
                    let messages = JSON.parse(data["Data"])
                    for (let i = 0; i < messages.length; i++) {
                        if (messages[i]["SenderID"] == sender) {
                            addMessageRight(messages[i]["Message"]);
                        } else {
                            addMessageLeft(messages[i]["Message"]);
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




function getGPTMessage(message) {


    $.ajax({
        url: 'getGPTMessage.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: {message: message, selectStart: selectStart , selectEnd: selectEnd, prompt: prompt},
        success: function (data) {
            parasArray = JSON.parse(data["Data"])["paraphrases"]
            console.log(parasArray)
            showParas(parasArray)
            hideProgressBar()
            paraReturnTime = getTime();
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
        }
    });
}


//------------------------------------------------- Artilce Control -------------------------------------------------//

articleTittle = "LOREM IPSUM!"

let articles = [
`Lorem ipsum odor amet, consectetuer adipiscing elit. Sapien mus accumsan nisl vehicula dapibus fermentum nec enim. Enim cras convallis mi conubia sodales rutrum tortor morbi viverra. Hendrerit eget dolor venenatis; cursus donec dignissim dui. Maecenas efficitur leo morbi tincidunt nulla eleifend. Accumsan faucibus inceptos arcu viverra habitasse placerat bibendum rutrum. Ac penatibus class dictumst; finibus interdum donec. Fames inceptos venenatis commodo laoreet magnis facilisi orci. Blandit consectetur quam massa arcu litora convallis.`
,
`Morbi habitant vestibulum justo non libero velit. Penatibus taciti feugiat tempor blandit eros ante? Ipsum gravida efficitur urna turpis per non fermentum mollis. Turpis lectus lectus suscipit sodales lacus maecenas inceptos. Sodales sed venenatis nostra purus cras. Volutpat felis mauris, quis pellentesque pretium quam. Praesent interdum volutpat sit orci varius.`
,
`Pretium massa felis consectetur ultrices aliquet quam cursus proin. Velit aenean penatibus lobortis hendrerit, semper aenean quis. Ullamcorper semper mattis tortor, vivamus ante fusce facilisis vivamus. Lacinia habitasse quisque tincidunt mus venenatis suspendisse sem ante. Proin ligula duis eu sociosqu condimentum quis penatibus elementum duis. Rutrum himenaeos consectetur hac leo vitae potenti. Nam ut facilisi eros primis at lobortis tellus. Varius porta porta facilisis eu ipsum. Mus ornare egestas dignissim nunc urna mollis viverra finibus.`
,
`Fusce vivamus nec congue semper turpis sagittis magna at. Phasellus eget auctor in eros curabitur class odio. Elementum nisi curabitur integer praesent; maximus gravida imperdiet nostra. Ornare eleifend mus habitant fusce adipiscing. Sollicitudin suscipit aenean phasellus sit iaculis interdum aptent vel molestie. Habitasse diam lobortis vel donec, dis hendrerit mattis vestibulum.`
,
`Sodales placerat lectus ultricies diam lacinia duis orci lobortis pharetra. Dapibus tempor dictum fermentum rutrum blandit diam dignissim. Potenti imperdiet quisque odio elit erat lectus velit. Parturient arcu ligula ligula ultrices enim commodo quam efficitur. Tortor magna suspendisse mattis et dui sit venenatis. Volutpat libero ultrices porttitor suscipit diam.`
,
`Hendrerit ut aptent lacinia netus elementum ut scelerisque. Elit massa dui dis risus taciti? Et facilisis sem fringilla volutpat facilisis curabitur vulputate. Vestibulum gravida luctus facilisis; enim lectus massa neque taciti etiam. Penatibus massa proin duis sem faucibus fusce. Ligula class porttitor ipsum curabitur dignissim pellentesque. Lacus taciti lobortis tincidunt curabitur iaculis lectus. Praesent sociosqu facilisi eget natoque aptent pharetra bibendum tempor.`
,
`Sed nibh curabitur ex commodo sagittis platea tortor blandit. Class nibh non quis aptent ultrices; potenti praesent consequat. Tincidunt ad gravida efficitur sem iaculis vivamus senectus. Molestie diam rhoncus felis sollicitudin sed vel per blandit fringilla. Arcu dignissim dictum lacinia luctus porttitor tortor, rutrum blandit. Dignissim urna maecenas sed parturient elementum pretium erat diam. Eget pretium rutrum bibendum id hendrerit. Montes aliquam purus arcu sapien sapien nullam tempus. Nec eget non ex habitasse facilisis consequat convallis phasellus.`
,
`Primis facilisi vehicula neque lobortis sapien phasellus dictum dapibus cubilia. Hac maximus sed nunc maecenas nisi ipsum. Curabitur magna orci sollicitudin ad aptent. Himenaeos pulvinar quis sagittis ultrices dolor sollicitudin maximus lectus taciti. Taciti ante justo aptent ultrices vehicula maximus. Facilisi imperdiet imperdiet porta aptent primis lacinia non; consectetur sodales. Donec ac cubilia diam libero pellentesque amet torquent turpis ultricies. Augue lacus erat felis nascetur; quam vivamus natoque risus.`
]

function addArticleLine (line) {
    document.getElementById("articleWindow").innerHTML +=
        '<div class="text-left mb-3 pt-2 pb-2">' +
        line +
        '</div>';
}

function addArticleTittle (line) {
    document.getElementById("articleWindow").innerHTML +=
        '<div class="text-center mb-3 pt-2 pb-2">' +
        '<p class="fs-4 font-weight-bold">' +
        line +
        '</p>' +
        '</div>';
}