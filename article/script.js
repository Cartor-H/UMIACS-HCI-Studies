//---------------------------------------------------Global Variables-----------------------------------------------------//
let articleID = "-1";
let userID = "-1";

let chainOfThought = null;
let article = {};

messageCount = 0;
messageIDs = {};

let chatState = "";

let sendMsgEnabled = true;

//---------------------------------------------------Call Backend-----------------------------------------------------//

/**
 * Calls the provided function from the backend with the given data.
 * Then calls callBack(responseData), where responseData is the data returned from the backend.
 * @param {*} functionName 
 * @param {*} data 
 * @param {*} callBack 
 */
function callFunction(functionName, data, callBack) {
    $.ajax({
        url: `functions/${functionName}.py`,
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: data,
        success: function (data) {
            console.log(data)
            if (data["Status"] == "Success") {
                callBack(data["Data"]);
            } else if (data["Status"] == "Error") {
                console.log("Py Status: " + data.Status + "\n" +
                            "Py Error: " + data.Error + "\n" +
                            "Py Traceback: " + data.Traceback);
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            console.log("JS Status: " + textStatus + "\n" +
                        "JS Error: " + errorThrown);
            if (data["Status"] == "Error") {
                console.log("Py Status: " + data.Status + "\n" +
                            "Py Error: " + data.Error + "\n" +
                            "Py Traceback: " + data.Traceback);
            }
        }
    });
}

//---------------------------------------------------Send Message-----------------------------------------------------//

/*
Contains all the necessary steps for the act of "sending" a message.
- Show the message locally.
- Starting the Chatbot message response process.
- Updating the SQL database with the new message.
*/
function clientSendMsg() {

    let message = document.getElementById("message").innerText;

    if (message!="" && articleID!="-1" && userID!="-1" && sendMsgEnabled){

        sendMsgEnabled = false;

        //Show Message Locally
        addMessageRight(message, new Date().toISOString());

        //Add Message To SQL Server
        saveMessage(message, "Client", messageCount);

        
        // Check chat state
        if (chatState === "InitialTakeaways") { setStateDiscussion() }
        if (chatState != "FinalTakeAways") {
            //Send Message to ChatBot
            sendMessageToChatBot(message, messageCount);
            messageCount = messageCount + 1;
        } else {
            setStateCompleted()
        }

        //Clear Message and Scroll to Bottom
        document.getElementById("message").innerText = ""
        scrollBottom();
    }
}

//---------------------------------------------------Save Message-----------------------------------------------------//
function saveMessage(message, sender, localMessageIDTracker) {
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
            if (data["Status"] == "Success") {
                messageID = data["Data"]["MessageID"]
                messageIDs[localMessageIDTracker] = messageID
                console.log("Message ID: " + messageID + " Local Message ID: " + localMessageIDTracker)
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
}


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
        document.getElementById("homeNav").href = "../home?userID=" + userID;
        document.getElementById("historyNav").href = "../history?userID=" + userID;
    }

    // Get Article ID From URL
    if (params.get('articleID') != null) {
        articleID = params.get('articleID');
    }

    // Get Article Content From SQL Server
    getArticleContent(articleID);

    // Retrieve Previously Sent Messages From SQL Server
    getPreviousMessages( function(messages) {

    // Retrieve Previous Chain Of Thought From SQL Server
    getPrevChainOfThought( function(chot) {

    // Add open action to ArticleOpenHistory
    saveArticleAction("open");

    // State Mangeament
    callFunction("get_article_state", {articleID: articleID, userID: userID}, function(data) {
        handleStateOnLoad(data);
        checkLastMessageWasSent();
    });

    // Focus on text input area
    document.getElementById("message").focus();

    });});
}

//----------------------------------------------Adding Messages To Screen---------------------------------------------//

/**
 * 
 * @param {Date} time The time to be converted.
 * @returns {string} The time in the format h:m.
 */
function time2hm(time) {
    const date = new Date(time);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12; // Convert to 12-hour format and handle midnight (0)
    return `${hours}:${minutes} ${ampm}`;
}

/**
 * Returns Previous Message Element.
 */
function getLastMessageElement() {
    return document.querySelector('#chatWindow .card:last-child');
}

/**
 * Adds a txt msg as if the client sent it.
 * 
 * @param message The message to be sent.
 * @param time The time the message was sent.
 */
function addMessageRight (message, time) {
    let formattedDate = time2hm(time);

    // // Get the last message element
    // let lastMessage = document.querySelector('#chatWindow .card.right-color:last-child');
    // // If the time in minutes is the same and the side is on the right then remove the time
    // if (lastMessage && lastMessage.getAttribute('side') === 'right' && lastMessage.querySelector('.date')) {
    //     // Delete <p> element
    //     lastMessage.querySelector('.date').parentElement.remove();
    // }


    document.getElementById("chatWindow").innerHTML +=
        '<div class="card right-color offset-2 mb-3" side="right">' +
        '<div class="card-body pt-2 pb-2">' +
        message +
        '<p class="text-end mb-0">' +
        '<small class="date">' + formattedDate + '</small>' +
        '</p>' +
        '</div>' +
        '</div>';

    scrollBottom();
}

/**
 * Adds a txt msg as if the client was sent a msg by someone else.
 * 
 * @param message The message to be sent.
 * @param time The time the message was sent.
 */
function addMessageLeft (message, time) {
    let formattedDate = time2hm(time);


    document.getElementById("chatWindow").innerHTML +=
        '<div class="card left-color col-10 mb-3" side="left">' +
        '<div class="card-body pt-2 pb-2">' +
        message +
        '<p class="text-start mb-0">' +
        '<small>' + formattedDate + '</small>' +
        '</p>' +
        '</div>' +
        '</div>';

    scrollBottom();
}

/**
 * Adds a text message to the middle of the chat window.
 */
function addMessageMiddle(message, time, id) {
    let formattedDate = time2hm(time);

    document.getElementById("chatWindow").innerHTML +=
        `<div class="card middle-color text-center offset-1 col-10 mb-3" id=${id} side="middle">` +
        '<div class="card-body pt-2 pb-2">' +
        message +
        // '<p class="text-center mb-0">' +
        // '<small>' + formattedDate + '</small>' +
        // '</p>' +
        '</div>' +
        '</div>';

    scrollBottom();
}

function addLine() {
    document.getElementById("chatWindow").innerHTML += '<hr class="mb-3">';
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

function getPreviousMessages(callBack) {
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
                    console.log(data["Data"])
                    for (let i = 0; i < messages.length; i++) {
                        console.log(messages[i]["TimeSent"])
                        console.log(new Date(messages[i]["TimeSent"]))

                        // UTC to EST
                        let adjustedTime = new Date(messages[i]["TimeSent"]);
                        adjustedTime.setHours(adjustedTime.getHours() - 4);

                        if (messages[i]["Sender"] == "Client") {
                            addMessageRight(messages[i]["Message"], adjustedTime);
                        } else if (messages[i]["Sender"] == "ChatBot") {
                            addMessageLeft(mdToHtml(messages[i]["Message"]), adjustedTime);
                        } else if (messages[i]["Sender"] == "System") {
                            addMessageMiddle(mdToHtml(messages[i]["Message"]), adjustedTime, getIdFromMessage(messages[i]["Message"]));
                        } else if (messages[i]["Sender"] == "Line") {
                            addLine();
                        }
                    }
                } else {
                    console.log("Something Went Wrong On Data Retrieval");
                    console.log(data);
                }

                
                // Call Back Function
                if (callBack) {
                    callBack(data);
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

function addArticleTittle (line) {
    document.getElementById("articleWindow").innerHTML +=
        '<div class="text-center mb-0 pt-2 pb-0">' +
        '<p class="fs-4 fw-bolder mb-0">' +
        line +
        '</p>' +
        '</div>';
}

function addArticleLine (line) {    

    line = line.replace(/(<br>\s*){2,}/g, "<br><br>");
    
    document.getElementById("articleWindow").innerHTML +=
        '<div class="text-left mb-3 pt-2 pb-2">' +
        line +
        '</div>';
}

function addArticleAuthorAndDate (author, date) {
    // Convert SQL datetime2(7) to standard date format
    let formattedDate = new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    document.getElementById("articleWindow").innerHTML +=
        '<div class="text-center mb-2 pt-1 pb-1">' +
        '<p class="fs-6 fw-light">' +
        author + " | " + formattedDate +
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


function getArticleContent(articleID) {
    $.ajax({
        url: 'functions/get_article.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: {articleID: articleID},
        success: function (data) {
            console.log(data)
            if (data["Status"] == "Success") {
                article = JSON.parse(data["Data"])[0]

                // Add Article Content To Page
                addArticleTittle(mdToHtml(article["Title"]));
                addArticleAuthorAndDate(article["Author"], article["Published_Date"]);
                addArticleLine(mdToHtml(article["Content"]));
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
}


//----------------------------------------- User Article History Control -------------------------------------//

function saveArticleAction(action) {
    $.ajax({
        url: 'functions/save_article_action.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: {
            articleID: articleID,
            userID: userID,
            action: action,
            time: new Date().toISOString()
        },
        success: function (data) {
            if (data["Status"] == "Success") {
                // console.log("Save Article Action: " + JSON.parse(data["Data"]))
            } else {
                console.log("Save Article Action Action Went Wrong");
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
        }
    });
}

//------------------------------------------------- Chat Bot -------------------------------------------------//

/**
 * Start Chatbot Pipeline
 */
function startChatBotPipeline() {
    

    // // Wait until chainOfThought and article are not null
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
}

function getPrevChainOfThought( callBack) {
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
                callBack(data);
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                alert("Status: " + textStatus);
                alert("Error: " + errorThrown);
            }
        });
    }
}


/*
This function should containt the logic for the chat bot pipeline.
Each different prompt should be a different function.
It is also possible to have one function that takes prompt type as a parameter, or have the python script take
the prompt type as a parameter.
Just MAKE SURE that the python script never takes a prompt as a parameter. Otherwise people can use our api key
without having to know it.
*/
function sendMessageToChatBot(message, localMessageIDTracker) {

    gptRespondMessage(message, localMessageIDTracker);
    addTypingAlertLeft();

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
function gptRespondMessage(message, localMessageIDTracker) {
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

            if (data["Status"] == "Success") {

                data = JSON.parse(data["Data"])

                chainOfThought = data["chainOfThought"]
                let responses = data["response"]
                let classification = data["classification"]
                let intention = data["intention"]

                for (let i = 0; i < responses.length; i++) {
                    setTimeout(function() {
                        removeTypingAlertLeft();
                        addMessageLeft(mdToHtml(responses[i]), new Date().toISOString());
                        saveMessage(responses[i], "ChatBot", -1);
                        scrollBottom();
                        if (i == responses.length - 1) {
                            sendMsgEnabled = true;
                        } else {
                            addTypingAlertLeft();
                        }
                    }, i * 2000);
                }
                
                // Save Chain Of Thought
                saveChainOfThought();

                // Save Classification & Intention
                console.log("Classification: " + classification)
                console.log("Intention: " + intention)
                if (classification != "" || intention != "") {
                    saveClassAndIntent(localMessageIDTracker, message, classification, intention)
                }

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

function saveClassAndIntent(localMessageIDTracker, message, classification, intention) {

    let waitForMessageID = setInterval(function() {
        if (messageIDs[localMessageIDTracker] !== undefined) {
            
            clearInterval(waitForMessageID);
            let messageID = messageIDs[localMessageIDTracker];
            delete messageIDs[localMessageIDTracker];

            if (classification != "") {
                $.ajax({
                    url: 'functions/save_classification.py',
                    type: 'POST',
                    loading: false,
                    dataType: 'json',
                    data: {
                        message: message,
                        classification: classification,
                        articleID: articleID,
                        userID: userID,
                        messageID: messageID
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

            if (intention != "") {
                $.ajax({
                    url: 'functions/save_intention.py',
                    type: 'POST',
                    loading: false,
                    dataType: 'json',
                    data: {
                        message: message,
                        intention: intention,
                        articleID: articleID,
                        userID: userID,
                        messageID: messageID
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
        }
    }, 100);
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
    saveArticleAction("close");
});

//---------------------------------------------------State Management-----------------------------------------------------//

let msgInitialTakeaways = "*What are your main takeaways from this news article?\n"+
"Please write down some of your thoughts before talking to the chatbot.*"

let msgDiscussion = "*Thank you for sharing your thoughts.\n"+
    "You can now start your converstation with the chatbot.*"

let msgFinalTakeAways = "*Thank you for your conversation with the chatbot.\n\n"+
    "Based on your own reading of the article and the conversation, what are your final takeaways from this news article? "+
    "Please write down some of your thoughts before leaving this article.*"




function handleStateOnLoad(data) {
    console.log(data)
    // setStateIninitialTakeaways()
    if (data["ChatState"] == "InitialTakeaways") { setStateIninitialTakeaways() }
    if (data["ChatState"] == "Discussion"      ) { setStateDiscussion        () }
    if (data["ChatState"] == "FinalTakeAways"  ) { setStateFinalTakeAways    () }
    if (data["ChatState"] == "Completed"       ) { setStateAlreadyCompleted  () }
}

function setStateIninitialTakeaways() {
    // Set Chat State
    chatState = "InitialTakeaways";

    // Add Initial Takeaways Message if not already added
    if (document.getElementById("InitialTakeawaysMessage") == null) {
        addMessageMiddle(mdToHtml(msgInitialTakeaways),
            new Date(), "InitialTakeawaysMessage");
        saveMessage(msgInitialTakeaways, "System", -1);
    }

    document.getElementById("stepInitialTakeaways").classList.remove("disabled-tab");
    document.getElementById("stepInitialTakeaways").classList.add("active-tab");
    document.getElementById("stepDiscussionMessage").classList.add("disabled-tab");
    document.getElementById("stepStateFinalTakeAways").classList.add("disabled-tab");

    // Save To SQL Server
    saveArticleAction("InitialTakeaways");
}

function setStateDiscussion() {
    // Set Chat State
    chatState = "Discussion";

    // Add Discussions Message if not already added
    if (document.getElementById("DiscussionMessage") == null) {
        addMessageMiddle(mdToHtml(msgDiscussion),
            new Date(), "DiscussionMessage");
        addLine();
        saveMessage(msgDiscussion, "System", -1);
        setTimeout(() => {
            saveMessage("<hr>", "Line", -1);
        }, 500);
    }
    // startChatBotPipeline();

    // Enable Ending Button
    document.getElementById("btnSetStateFinalTakeAways").classList.remove("btn-disabled");

    
    document.getElementById("stepDiscussionMessage").classList.remove("disabled-tab");
    document.getElementById("stepDiscussionMessage").classList.add("active-tab");
    document.getElementById("stepInitialTakeaways").classList.add("disabled-tab");
    document.getElementById("stepStateFinalTakeAways").classList.add("disabled-tab");

    // Save To SQL Server
    saveArticleAction("Discussion");
}

function setStateFinalTakeAways() {
    // Set Chat State
    chatState = "FinalTakeAways";

    // Add Discussions Message if not already added
    if (document.getElementById("FinalTakeAwaysMessage") == null) {
        addLine();
        addMessageMiddle(mdToHtml(msgFinalTakeAways),
            new Date(), "FinalTakeAwaysMessage");
        saveMessage("<hr>", "Line", -1);
        saveMessage(msgFinalTakeAways, "System", -1);
    }

    // Dissable Ending Button
    document.getElementById("btnSetStateFinalTakeAways").classList.add("btn-disabled");

    
    document.getElementById("stepStateFinalTakeAways").classList.remove("disabled-tab");
    document.getElementById("stepStateFinalTakeAways").classList.add("active-tab");
    document.getElementById("stepDiscussionMessage").classList.add("disabled-tab");
    document.getElementById("stepInitialTakeaways").classList.add("disabled-tab");

    saveArticleAction("FinalTakeAways");
}

function setStateCompleted() {
    // Set Chat State
    chatState = "Completed";

    // Send a popup message to the user
    createPopUp("Article Completed", "You have completed reading this news article. You can now close this page or return to the home page.");

    
    document.getElementById("stepStateFinalTakeAways").classList.add("disabled-tab");
    document.getElementById("stepDiscussionMessage").classList.add("disabled-tab");
    document.getElementById("stepInitialTakeaways").classList.add("disabled-tab");

    saveArticleAction("Completed");

    sendMsgEnabled = false;
}

function setStateAlreadyCompleted() {
    // Set Chat State
    chatState = "Completed";

    // Send a popup message to the user
    createPopUp("Article Completed", "You have already completed reading this news article. You can now close this page or return to the home page.");

    
    document.getElementById("stepStateFinalTakeAways").classList.add("disabled-tab");
    document.getElementById("stepDiscussionMessage").classList.add("disabled-tab");
    document.getElementById("stepInitialTakeaways").classList.add("disabled-tab");

    saveArticleAction("Completed");

    sendMsgEnabled = false;
}

function getIdFromMessage(message) {
    console.log(message)
    console.log(msgInitialTakeaways)
    if (message == msgInitialTakeaways) { return "InitialTakeawaysMessage" }
    if (message == msgDiscussion      ) { return "DiscussionMessage" }
    if (message == msgFinalTakeAways  ) { return "FinalTakeAwaysMessage" }
}



function createPopUp(title, message) {
        // Use a modal dialog for a better user experience
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';
    
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = '#fff';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '8px';
        modalContent.style.textAlign = 'center';
        modalContent.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    
        const modalTitle = document.createElement('h2');
        modalTitle.innerText = title;
        modalContent.appendChild(modalTitle);
    
        const modalMessage = document.createElement('p');
        modalMessage.innerText = message; // 
        modalContent.appendChild(modalMessage);
    
        const closeButton = document.createElement('button');
        closeButton.innerText = 'Close';
        closeButton.style.marginTop = '10px';
        closeButton.style.padding = '10px 20px';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.backgroundColor = '#007bff';
        closeButton.style.color = '#fff';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        modalContent.appendChild(closeButton);
    
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
}

function checkCursor() {
    console.log("Delete This Function")
}






function checkLastMessageWasSent() {
    let lastMessage = document.getElementById("chatWindow").lastElementChild;
    
    // If the last message is an hr and the chat state is Discussion
    if (lastMessage && lastMessage.tagName == "HR" && chatState == "Discussion") {
        sendMessageToChatBot(null, messageCount);
        messageCount = messageCount + 1;

    // Check if last message if from the user and the chat state is Discussion
    } else if ((lastMessage && lastMessage.getAttribute("side") != "left") && chatState == "Discussion") {
        // Resend the last message to the chatbot
        let lastMessageContent = lastMessage.querySelector(".card-body").innerHTML;
        lastMessageContent = lastMessageContent.replace(/<br>/g, "\n").replace(/<small.*?<\/small>/g, "").trim();
        console.log("Last Message: " + lastMessageContent);

        sendMessageToChatBot(lastMessageContent, messageCount);
        messageCount = messageCount + 1;
    }   
}