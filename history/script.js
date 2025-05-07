//---------------------------------------------------Global Variables-----------------------------------------------------//
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


    getAndDisplayImages();
}

//------------------------------------------------- Artilce Control -------------------------------------------------//

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


//-------------------------------------------------- Display Images --------------------------------------------------//
/**
 * Retrieves images for a user and displays them in the questionDistributionBody div
 */
function getAndDisplayImages() {
    // Show loading indicator
    const questionDistributionBody = document.getElementById('questionDistributionBody');
    const discussionFlowBody = document.getElementById('discussionFlowBody');
    const takeawayMessagesBody = document.getElementById('takeawayMessagesBody');
    const loadingIndicator = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    questionDistributionBody.innerHTML = loadingIndicator;
    discussionFlowBody.innerHTML = loadingIndicator;
    takeawayMessagesBody.innerHTML = loadingIndicator;
    

    // Call the get_images function
    callFunction('get_images', { ID: userID }, function(responseData) {
        // Loop through each image and add it to the container
        responseData.forEach(image => {
            // Create a card element for each image
            const card = document.createElement('div');
            card.className = 'card mb-3';
            
            // Create card header with image info
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header d-flex justify-content-between align-items-center';
            
            // Add header text
            const headerText = document.createElement('h5');
            headerText.className = 'mb-0';
            headerText.textContent = image.header;
            cardHeader.appendChild(headerText);
            
            // Add card header to card
            card.appendChild(cardHeader);
            
            // Create card body with the image
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body text-center';
            
            // Create and set up the image element
            const imgElement = document.createElement('img');
            imgElement.className = 'img-fluid';
            imgElement.style.maxHeight = '300px';
            
            // Set the image source from base64 data
            // Determine if base64 data already has the data URL prefix
            if (image.fileData.startsWith('data:')) {
                imgElement.src = image.fileData;
            } else {
                // If not, add appropriate prefix based on file extension
                const fileExt = image.fileName.split('.').pop().toLowerCase();
                let mimeType = 'image/jpeg'; // Default mime type
                
                // Set appropriate mime type based on file extension
                if (fileExt === 'png') mimeType = 'image/png';
                else if (fileExt === 'gif') mimeType = 'image/gif';
                else if (fileExt === 'svg') mimeType = 'image/svg+xml';
                else if (fileExt === 'webp') mimeType = 'image/webp';
                
                imgElement.src = `data:${mimeType};base64,${image.fileData}`;
            }
            
            // Add image to card body
            cardBody.appendChild(imgElement);
            card.appendChild(cardBody);
            
            // Create card footer with date and filename
            const cardFooter = document.createElement('div');
            cardFooter.className = 'card-footer text-muted d-flex justify-content-between';
            
            // Add date
            const dateElement = document.createElement('small');
            dateElement.textContent = `Uploaded: ${new Date(image.date).toLocaleString()}`;
            cardFooter.appendChild(dateElement);
            
            // Add filename
            const filenameElement = document.createElement('small');
            filenameElement.textContent = image.fileName;
            cardFooter.appendChild(filenameElement);
            
            // Add footer to card
            card.appendChild(cardFooter);
            // Add the card to the container
            switch(parseInt(image.subpage)) {
                case 1:
                    // Clear loading indicators if present & this is the first time images are being loaded
                    if (questionDistributionBody.innerHTML === loadingIndicator) {
                        questionDistributionBody.innerHTML = '';
                    }
                    questionDistributionBody.appendChild(card);
                    break;
                case 2:
                    // Clear loading indicators if present & this is the first time images are being loaded
                    if (discussionFlowBody.innerHTML === loadingIndicator) {
                        discussionFlowBody.innerHTML = '';
                    }
                    discussionFlowBody.appendChild(card);
                    break;
                case 3:
                    // Clear loading indicators if present & this is the first time images are being loaded
                    if (takeawayMessagesBody.innerHTML === loadingIndicator) {
                        takeawayMessagesBody.innerHTML = '';
                    }
                    takeawayMessagesBody.appendChild(card);
                    break;
            }
        });

        // If the container still is just the loading indicator, display a message
        const noImgsMsg = '<div class="alert alert-info mb-0">No Graphs Found.</div>';
        if (questionDistributionBody.innerHTML === loadingIndicator) {
            questionDistributionBody.innerHTML = noImgsMsg;
        }
        if (discussionFlowBody.innerHTML === loadingIndicator) {
            discussionFlowBody.innerHTML = noImgsMsg;
        }
        if (takeawayMessagesBody.innerHTML === loadingIndicator) {
            takeawayMessagesBody.innerHTML = noImgsMsg;
        }
        return;
    });

}