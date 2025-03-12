//---------------------------------------------------Global Variables-----------------------------------------------------//
let articleID = "-1";
let userID = "-1";

let chainOfThought = null;
let article = {};


//---------------------------------------------------Send Message-----------------------------------------------------//

/*
Contains all the necessary steps for the act of "sending" a message.
- Show the message locally.
- Starting the Chatbot message response process.
- Updating the SQL database with the new message.
*/
function clientSendMsg() {

    let message = document.getElementById("message").innerText;

    if (message!="" && articleID!="-1" && userID!="-1"){
        //Show Message Locally
        addMessageRight(message);

        //Send Message to ChatBot
        sendMessageToChatBot(message);

        //Add Message To SQL Server
        saveMessage(message, "Client");

        //Clear Message and Scroll to Bottom
        document.getElementById("message").innerText = ""
        scrollBottom();
    }
}

//---------------------------------------------------Save Message-----------------------------------------------------//
function saveMessage(message, sender) {
    //Ajax Call To Serverside Python
    $.ajax({
        url: 'functions/save_message.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: {
            message: message,
            userID: userID,
            articleID: articleID,
            sender: sender,
            timeSent: new Date().toISOString()
        },
        success: function (data) {
            console.log(data)
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
        }
    });
}

{/* <div class="accordion" id="questionsAccordion">
    <div class="accordion-item">
        <h2 class="accordion-header" id="headingOne">
        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
            Question 1
        </button>
        </h2>
        <div id="collapseOne" class="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#questionsAccordion">
        <div class="accordion-body">
            Answer to question 1.
        </div>
        </div>
    </div>
    <div class="accordion-item">
        <h2 class="accordion-header" id="headingTwo">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
            Question 2
        </button>
        </h2>
        <div id="collapseTwo" class="accordion-collapse collapse" aria-labelledby="headingTwo" data-bs-parent="#questionsAccordion">
        <div class="accordion-body">
            Answer to question 2.
        </div>
        </div>
    </div>
    <div class="accordion-item">
        <h2 class="accordion-header" id="headingThree">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
            Question 3
        </button>
        </h2>
        <div id="collapseThree" class="accordion-collapse collapse" aria-labelledby="headingThree" data-bs-parent="#questionsAccordion">
        <div class="accordion-body">
            Answer to question 3.
        </div>
        </div>
    </div>
</div> */}


//------------------------------------------------------On Load-------------------------------------------------------//

/*
Performs necessary actions imdeiately upon loading the page.
- Reads URL parameters to determine the article and user IDs.
- Loads the news article content.
- Retrieves any existing messages from the SQL database.
*/
function onLoad(){

    // Read URL Params
    const params = new URLSearchParams(document.location.search);
    
    // Get User ID From URL
    if (params.get('userID') != null) {
        userID = params.get('userID');
        document.getElementById("userID").innerText = userID;
    }

    // Get Article ID From URL
    if (params.get('articleID') != null) {
        articleID = params.get('articleID');
    }

//---------------------------------------------------------------------------------------------------Get Articles
    //Ajax Python Call To Get Messages From SQL Server
    $.ajax({
        url: 'functions/get_user_read_articles.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        success: function (data) {
            console.log(data)
            if (data["Status"] == "Success") {
                let articleData = data["Data"]

                //---------------------------------------------------------------------------------------------------Add Articles

                categories = JSON.parse(articleData["Categories"]);
                articles = JSON.parse(articleData["Articles"]);

                console.log(categories);
                console.log(articles);

                for (let i = 0; i < categories.length; i++) {
                    let category = categories[i]["Category"];
                    let title = articles[i]["Title"];
                    document.getElementById("questionWindow").innerHTML += `
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="heading${strToID(title)}">
                            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${strToID(title)}" aria-expanded="true" aria-controls="collapse${strToID(title)}">
                                ${title}
                            </button>
                            </h2>
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

    // Retrieve Previously Sent Messages From SQL Server
    if(articleID && userID && articleID!="" && userID!="") {
        $.ajax({
            url: 'functions/get_messages.py',
            type: 'POST',
            loading: false,
            dataType: 'json',
            data: {articleID: articleID, userID: userID},
            success: function (data) {
                if (data["Status"] == "Success") {

                    // Add Messages To Page
                    let messages = JSON.parse(data["Data"])
                    for (let i = 0; i < messages.length; i++) {
                        if (messages[i]["Sender"] == "Client") {
                            addMessageRight(messages[i]["Message"]);
                        } else {
                            addMessageLeft(mdToHtml(messages[i]["Message"]));
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

    // Wait until chainOfThought and article are not null
    let checkDataInterval = setInterval(function() {
        if (article && Object.keys(article).length !== 0) {
            clearInterval(checkDataInterval);
            
            // Ensure Chain Of Thought is null for first message.
            // let tempCOT = chainOfThought
            chainOfThought = null;
            // Call GPT
            sendMessageToChatBot("");

            // chainOfThought = tempCOT;
        }
    }, 100);

    // Retreive Previous Chain Of Thought
    if(articleID && userID && articleID!="" && userID!="") {
        $.ajax({
            url: 'functions/get_chain_of_thought.py',
            type: 'POST',
            loading: false,
            dataType: 'json',
            data: {articleID: articleID, userID: userID},
            success: function (data) {
                if (data["Status"] == "Success") {
                    chainOfThought = JSON.parse(JSON.parse(data["Data"])[0]["Content"])
                    console.log(chainOfThought)
                } else {
                    console.log("No Data, Starting New Chain Of Thought");
                }
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                alert("Status: " + textStatus);
                alert("Error: " + errorThrown);
            }
        });
    }

    // Focus on text input area
    document.getElementById("message").focus();
}

//----------------------------------------------------Clock Update----------------------------------------------------//

// // MICHT NOT BE RELEVANT ANYMORE - DELETE LATER

// let startTime = null;

// /*
// A function primarily used to inform the user of how much time they're taking, and how much time they have left in the
// istant messagin session.
// */
// function updateClock() {
//     const clockElement = document.getElementById("clock");
//     if (clockElement) {
//         const currentTime = Date.now();
//         const elapsedTime = currentTime - startTime;

//         // Calculate minutes and seconds
//         const minutes = Math.floor(elapsedTime / 60000);
//         const seconds = Math.floor((elapsedTime % 60000) / 1000);

//         // Format minutes and seconds with leading zeros
//         const formattedMinutes = String(minutes).padStart(2, "0");
//         const formattedSeconds = String(seconds).padStart(2, "0");

//         // Update the clock display
//         clockElement.value = `${formattedMinutes}:${formattedSeconds}`;

//         // Schedule the next update in 1 second
//         setTimeout(updateClock, 1000);
//     }
// }

//--------------------------------------------------Typing Detection--------------------------------------------------//

// // MICHT NOT BE RELEVANT ANYMORE - DELETE LATER
// // Might be useful to display a notice of typing when chat gpt is thinking.

function checkCursor() {

}


// var typingTimeout;

// /*
// A function that detects when the user is typing, and sends a notification to the server.
// */
// function notifyTyping () {
//     if (typingTimeout != undefined) {
//         clearTimeout(typingTimeout);
//     } else {
//         notifyTypingHelper(document.getElementById("receiverID").value,"Start")
//     }
//     typingTimeout = setTimeout(function() {
//         notifyTypingHelper(document.getElementById("receiverID").value,"Stop");
//         typingTimeout = undefined;
//     }, 1000);
// }

// function notifyTypingHelper(to, status){
//     fetch(`http://52.15.204.7:8080/notify-typing?to=${to}&status=${status}&section=${document.title}`)
//         .then(response => response.text())
//         .then(result => {
//             console.log(result);
//         })
//         .catch(error => {
//             console.error(error);
//         });
//     console.log(typingTimeout)
//     console.log("Typing " + status + " to " + to)
// }

//----------------------------------------------Adding Messages To Screen---------------------------------------------//

/*
Add's a txt msg as if the client sent it.
*/
function addMessageRight (message) {
    document.getElementById("chatWindow").innerHTML +=
        '<div class="card right-color offset-2 mb-3">' +
        '<div class="card-body pt-2 pb-2">' +
        message +
        '</div>' +
        '</div>';
}

/*
Add's a txt msg as if the client was sent a msg by someone else.
*/
function addMessageLeft (message) {
    document.getElementById("chatWindow").innerHTML +=
        '<div class="card left-color col-10 mb-3">' +
        '<div class="card-body pt-2 pb-2">' +
        message +
        '</div>' +
        '</div>';
}

function addTypingAlertLeft() {
    document.getElementById("chatWindow").innerHTML += `
        <div class="card left-color mb-3" id="typingAlertLeft" style="display: inline-block; animation: pulse 1.5s infinite; transform-origin: left;">
            <div class="card-body pt-2 pb-2">
                <strong>. . .</strong>
            </div>
        </div>
        `
    }

function removeTypingAlertLeft() {
    document.getElementById("typingAlertLeft").remove();
}

// function addMessagesLeft (messages) {
//     for (let i = 0; i < messages.length; i++) {

//---------------------------------------------------Scroll Bottom----------------------------------------------------//

function scrollBottom() {
    var messageBody = document.querySelector('#chatWindow');
    messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
}



//-------------------------------------------------Multiline Textbox--------------------------------------------------//

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

function mdToHtml(text) {
    text = text.replace( /(?:\r\n|\r|\n)/g         , '<br>');                // New Line
    text = text.replace( /(?:\*\*(.*?)\*\*)/g      , '<strong>$1</strong>'); // Bold
    text = text.replace( /(?:\*(.*?)\*)/g          , '<em>$1</em>');         // Italics
    text = text.replace( /(?:\~\~(.*?)\~\~)/g      , '<del>$1</del>');       // Strikethrough
    text = text.replace( /(?:\`(.*?)\`)/g          , '<code>$1</code>');     // Code
    text = text.replace( /(?:\_\_(.*?)\_\_)/g      , '<span style="text-decoration: underline;">$1</span>'); // Underline
    text = text.replace( /(?:\[(.*?)\]\((.*?)\))/g , '<a href="$2" target="_blank">$1</a>'); // Link
    return text;
}

function strToID(str){
    return str.charAt(0).toLowerCase() + str.slice(1).replace(/\s+/g, '');
}

//------------------------------------------------- Chat Bot -------------------------------------------------//

/*
This function should containt the logic for the chat bot pipeline.
Each different prompt should be a different function.
It is also possible to have one function that takes prompt type as a parameter, or have the python script take
the prompt type as a parameter.
Just MAKE SURE that the python script never takes a prompt as a parameter. Otherwise people can use our api key
without having to know it.
*/
function sendMessageToChatBot(message) {
    // Commented Out For Now - Bc Not Implemented Yet //

    gptRespondMessage(message);
    // document.getElementById("typingAlert").hidden = false
    addTypingAlertLeft();

    // let context, classification = classifyMessage(message);
    
    // if (classification == "PRACTICAL_GUIDANCE") {

    // } else if (classification == "BROADER IMPACT") {
    // } else if (classification == "REFERENTIAL_FACT") {
    // } else if (classification == "VIEWPOINT_SYNTHESIS") {
    // } else if (classification == "LITERARY_COMPREHENSION") {
    // }
    
}

/*
Demo of how to run a prompt on the gpt api.
    chainOfThought: json {} | Contains the chain of thought as a json. Or any
                            | other data format you need for the msg history.
    promptVariant: string | The variant of the prompt you want to run.
                          | DO NOT SEND THE PROMPT ITSELF. JUST THE VARIANT.
                          | This is to prevent people from using our website
                          | as a free chat gpt api.
*/
function gptRespondMessage(message) {
    $.ajax({
        url: 'functions/gpt_respond_message.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: {
            message: message,
            article: JSON.stringify(article),
            chainOfThought: JSON.stringify(chainOfThought)
        },
        success: function (data) {
            // document.getElementById("typingAlert").hidden = true
            removeTypingAlertLeft();

            if (data["Status"] == "Success") {

                data = JSON.parse(data["Data"])

                chainOfThought = data["chainOfThought"]
                let classification = data["classification"]
                let responses = data["response"]

                for (let i = 0; i < responses.length; i++) {
                    setTimeout(function() {
                        addMessageLeft(mdToHtml(responses[i]));
                        saveMessage(responses[i], "ChatBot");
                        scrollBottom();
                    }, i * 500);
                }
                
                //Save Chain Of Thought
                saveChainOfThought();

                // saveClassification(message, classification)
                scrollBottom();
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
        }
    });
    
}

function saveChainOfThought() {
    $.ajax({
        url: 'functions/save_chain_of_thought.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: {
            chainOfThought: JSON.stringify(chainOfThought),
            articleID: articleID,
            userID: userID
        },
        success: function (data) {
            console.log(data)
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
        }
    });
}


//---------------------------------------------------Close Page-----------------------------------------------------//

function closeTab() {
    if (window.opener && !window.opener.closed) {

        window.opener.location.href = '/home';
        
        window.opener.focus();

        
        window.opener.postMessage({ action: 'focusHome', url: '/home' }, '*');
    }
    window.close();
    
    saveChainOfThought();

    return false;
}

window.addEventListener('beforeunload', function (e) {
    closeTab();
});