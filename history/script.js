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

headerList = {
    "G D" : "Question Distribution",
    "M P" : "Main Plot",
    "S P" : "Sub Plot",
    "I T" : "Initial Takeaways",
    "F T" : "Final Takeaways"
}


/**
 * Retrieves images for a user and displays them in the questionDistributionBody div
 */
function getAndDisplayImages() {
    // Get the containers
    const questionDistributionBody = document.getElementById('questionDistributionBody');
    const discussionFlowBody = document.getElementById('discussionFlowBody');
    const takeawayMessagesBody = document.getElementById('takeawayMessagesBody');
    
    // Create loading indicators with unique IDs
    const loadingIndicatorHTML = '<div class="text-center loading-indicator"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    // Append loading indicators to existing content
    questionDistributionBody.insertAdjacentHTML('beforeend', loadingIndicatorHTML);
    discussionFlowBody.insertAdjacentHTML('beforeend', loadingIndicatorHTML);
    takeawayMessagesBody.insertAdjacentHTML('beforeend', loadingIndicatorHTML);
    
    // Call the get_images function
    callFunction('get_images', { ID: userID }, function(responseData) {
        // Sort images alphabetically by their headers
        // responseData.sort((a, b) => {
        //     return headerList[a.header].localeCompare(headerList[b.header]);
        // });
        
        // Remove all loading indicators
        document.querySelectorAll('.loading-indicator').forEach(indicator => {
            indicator.remove();
        });
        
        // Group images by subpage and weekNumber for counting
        const imageGroups = {};
        responseData.forEach(image => {
            const key = `${image.subpage}_${image.weekNumber}`;
            if (!imageGroups[key]) {
                imageGroups[key] = [];
            }
            imageGroups[key].push(image);
        });
        
        // Loop through each image and add it to the container
        responseData.forEach(image => {            
            // Create card header with image info
            let card;
            let cardHeader;
            let cardBody;
            const cardKey = `card_${image.subpage}_${image.weekNumber}`;
            
            if (document.getElementById(cardKey) != null) {
                console.log("Card already exists: " + image.subpage + "_" + image.weekNumber);

                card = document.getElementById(cardKey);
                cardHeader = card.querySelector('.card-header');
                cardBody = card.querySelector('.card-body');
            } else {
                console.log("Creating new card: " + image.subpage + "_" + image.weekNumber);
                
                card = document.createElement('div');
                card.className = 'card mb-3';
                card.id = cardKey;
                
                cardHeader = document.createElement('div');
                cardHeader.className = 'card-header d-flex justify-content-between align-items-center';

                // Add header text
                const headerText = document.createElement('h4');
                headerText.fontWeight = 'bold';
                headerText.className = 'mb-0';
                headerText.textContent = "Week " + image.weekNumber;
            
                cardHeader.appendChild(headerText);

                // Create card body with flex layout for images
                cardBody = document.createElement('div');
                cardBody.className = 'card-body';
                // Use flex layout to make images arrange in a row
                cardBody.style.display = 'flex';
                cardBody.style.flexWrap = 'nowrap'; // Keep all in one row
                cardBody.style.justifyContent = 'center'; // Center the images
                cardBody.style.overflow = 'auto'; // Add scroll if needed

                card.appendChild(cardHeader);
                card.appendChild(cardBody);
            }
            
            // Get total image count for this card to calculate flex basis
            const imageCount = imageGroups[`${image.subpage}_${image.weekNumber}`].length;
            
            // Create and set up the image element
            const imgElement = document.createElement('img');
            imgElement.className = 'img-fluid'; // Keep responsive
            
            // Create a container for the image and its label
            const imgContainer = document.createElement('div');
            // Use flex to control sizing based on image count
            imgContainer.style.flex = `0 0 ${Math.floor(100 / imageCount)}%`; // Divide space evenly
            imgContainer.style.padding = '10px';
            imgContainer.style.textAlign = 'center';
            imgContainer.style.minWidth = '0'; // Allow container to shrink below content size
            imgContainer.style.maxWidth = '70%'; // Prevent overflow

            // Add a header above the image
            const imgHeader = document.createElement('h3');
            imgHeader.style.fontWeight = 'bold';
            imgHeader.textContent = headerList[image.header] || image.header;
            imgContainer.appendChild(imgHeader);

            // Set the image source from base64 data
            if (image.fileData.startsWith('data:')) {
                imgElement.src = image.fileData;
            } else {
                const fileExt = image.fileName.split('.').pop().toLowerCase();
                let mimeType = 'image/jpeg'; // Default mime type

                if (fileExt === 'png') mimeType = 'image/png';
                else if (fileExt === 'gif') mimeType = 'image/gif';
                else if (fileExt === 'svg') mimeType = 'image/svg+xml';
                else if (fileExt === 'webp') mimeType = 'image/webp';

                imgElement.src = `data:${mimeType};base64,${image.fileData}`;
            }
            
            // Make sure images can scale down properly
            imgElement.style.maxWidth = '100%';
            imgElement.style.objectFit = 'contain';

            // Add the image to the container
            imgContainer.appendChild(imgElement);

            // Add the container to the card body
            cardBody.appendChild(imgContainer);
        
            // Add the card to the container if it doesn't already exist
            switch(parseInt(image.subpage)) {
                case 1:
                    if (document.getElementById(cardKey) == null) {
                        questionDistributionBody.appendChild(card);
                    }
                    break;
                case 2:
                    if (document.getElementById(cardKey) == null) {
                        discussionFlowBody.appendChild(card);
                    }
                    break;
                case 3:
                    if (document.getElementById(cardKey) == null) {
                        takeawayMessagesBody.appendChild(card);
                    }
                    break;
            }
        });

        // If no images were found for a subpage, display a message
        // Only add the message if there are no cards in the container
        if (questionDistributionBody.querySelectorAll('.card').length === 0) {
            questionDistributionBody.insertAdjacentHTML('beforeend', '<div class="alert alert-info mb-0">No Graphs Found.</div>');
        }
        if (discussionFlowBody.querySelectorAll('.card').length === 0) {
            discussionFlowBody.insertAdjacentHTML('beforeend', '<div class="alert alert-info mb-0">No Graphs Found.</div>');
        }
        if (takeawayMessagesBody.querySelectorAll('.card').length === 0) {
            takeawayMessagesBody.insertAdjacentHTML('beforeend', '<div class="alert alert-info mb-0">No Graphs Found.</div>');
        }
        return;
    });
}