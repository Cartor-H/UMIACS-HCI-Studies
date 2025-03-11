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
    }

    // Get Article ID From URL
    if (params.get('articleID') != null) {
        articleID = params.get('articleID');
    }

    // Get Article Content From SQL Server
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
                addArticleTittle(article["Title"]);
                addArticleLine(article["Content"]);
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

    // Wait until chainOfThought and article are not null
    let checkDataInterval = setInterval(function() {
        if (chainOfThought && article && Object.keys(article).length !== 0) {
            clearInterval(checkDataInterval);
            // Call GPT
            sendMessageToChatBot("");
        }
    }, 100);

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
    // console.log(message)
    message = message.replace(    /(?:\r\n|\r|\n)/g , '<br>');                // New Line
    message = message.replace( /(?:\*\*(.*?)\*\*)/g , '<strong>$1</strong>'); // Bold
    message = message.replace(     /(?:\*(.*?)\*)/g , '<em>$1</em>');         // Italics
    message = message.replace( /(?:\~\~(.*?)\~\~)/g , '<del>$1</del>');       // Strikethrough
    message = message.replace(     /(?:\`(.*?)\`)/g , '<code>$1</code>');     // Code
    message = message.replace( /(?:\_\_(.*?)\_\_)/g , '<span style="text-decoration: underline;">$1</span>'); // Underline


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
// let articles = [
//     {
//       "id": 1,
//       "title": "City Council Approves New Park Renovation",
//       "description": "The city council approved a renovation plan for the historic park, promising new facilities and community spaces.",
//       "date": "2023-10-10"
//     },
//     {
//       "id": 2,
//       "title": "Local Library Hosts Summer Reading Program",
//       "description": "The downtown library is launching its annual summer reading event, encouraging residents of all ages to explore new books.",
//       "date": "2023-06-15"
//     },
//     {
//       "id": 3,
//       "title": "Community Garden Initiative Blossoms in Westside Neighborhood",
//       "description": "Local residents have come together to transform a vacant lot into a vibrant community garden, promoting sustainability and neighborhood bonding.",
//       "date": "2023-05-20"
//     },
//     {
//       "id": 4,
//       "title": "Downtown Business Week Attracts Entrepreneurs",
//       "description": "A week-long event in the heart of downtown has drawn local and regional entrepreneurs, showcasing innovative business ideas and networking opportunities.",
//       "date": "2023-09-25"
//     },
//     {
//       "id": 5,
//       "title": "Local High School Wins State Championship",
//       "description": "In a thrilling finale, the local high school soccer team clinched the state title, sparking celebrations across the community.",
//       "date": "2023-11-05"
//     },
//     {
//       "id": 6,
//       "title": "Neighborhood Cleanup Day Scheduled for Saturday",
//       "description": "Residents are encouraged to participate in a community cleanup event aimed at revitalizing local parks and streets.",
//       "date": "2023-04-08"
//     },
//     {
//       "id": 7,
//       "title": "New Art Exhibit Showcases Local Talent",
//       "description": "The city museum has unveiled a new exhibit that highlights the work of emerging local artists, drawing art enthusiasts from across the region.",
//       "date": "2023-07-12"
//     },
//     {
//       "id": 8,
//       "title": "City Police Increase Patrols to Combat Rising Vandalism",
//       "description": "Authorities are stepping up patrols in several neighborhoods in response to a recent spike in vandalism incidents.",
//       "date": "2023-08-18"
//     },
//     {
//       "id": 9,
//       "title": "Local Restaurant Earns Michelin Star",
//       "description": "A recently opened restaurant downtown has received a Michelin star, marking a milestone for the local culinary scene.",
//       "date": "2023-10-01"
//     },
//     {
//       "id": 10,
//       "title": "City Announces Free Health Clinics for Residents",
//       "description": "In a bid to improve community health, the city is offering free health clinics at various locations over the next month.",
//       "date": "2023-03-15"
//     },
//     {
//       "id": 11,
//       "title": "Historic Building Gets Renovated for Community Use",
//       "description": "A beloved historic building is being repurposed into a community center, complete with meeting rooms and cultural spaces.",
//       "date": "2023-09-10"
//     },
//     {
//       "id": 12,
//       "title": "Local Sports Club Launches Youth Training Program",
//       "description": "The sports club has introduced a new training initiative aimed at nurturing local talent and promoting physical fitness among youths.",
//       "date": "2023-06-05"
//     },
//     {
//       "id": 13,
//       "title": "City Council Debates New Zoning Laws",
//       "description": "Council members are currently deliberating proposed zoning changes that could impact local businesses and residential areas.",
//       "date": "2023-08-22"
//     },
//     {
//       "id": 14,
//       "title": "New Public Transit Route to Improve Connectivity",
//       "description": "A new bus route has been announced, promising to enhance transportation options for residents in suburban areas.",
//       "date": "2023-07-30"
//     },
//     {
//       "id": 15,
//       "title": "Local Theater Group Stages a Classic Play",
//       "description": "The community theater is set to perform a beloved classic, inviting locals to enjoy an evening of culture and drama.",
//       "date": "2023-05-25"
//     },
//     {
//       "id": 16,
//       "title": "Fire Department Hosts Safety Awareness Workshop",
//       "description": "Local firefighters are offering a series of workshops to educate residents on emergency preparedness and fire safety.",
//       "date": "2023-04-20"
//     },
//     {
//       "id": 17,
//       "title": "New Recycling Program Launched in the City",
//       "description": "City officials have rolled out an innovative recycling initiative designed to boost environmental sustainability and reduce waste.",
//       "date": "2023-03-01"
//     },
//     {
//       "id": 18,
//       "title": "Local Farmer's Market Returns This Weekend",
//       "description": "After a long hiatus, the popular farmer's market is back, featuring fresh produce, artisanal goods, and community fun.",
//       "date": "2023-09-15"
//     },
//     {
//       "id": 19,
//       "title": "City Plans to Expand Bicycle Lanes",
//       "description": "Local government announced plans to extend bike lanes throughout the city, promoting eco-friendly transportation and healthier lifestyles.",
//       "date": "2023-10-20"
//     },
//     {
//       "id": 20,
//       "title": "Community Raises Funds for Local Shelter",
//       "description": "A fundraising event held over the weekend successfully raised significant funds to support the local shelter and aid community members in need.",
//       "date": "2023-11-12"
//     }
//   ]

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
                        addMessageLeft(responses[i]);
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