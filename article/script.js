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
        // sendMessage(to,message);

        //Send Message to ChatBot
        sendMessageToChatBot(message);

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
    const params = new URLSearchParams(document.location.search);
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
    let articleID = params.get('articleID');


    //---------------------------------------------------------------------------------------------------Get Article
    $.ajax({
        url: 'getArticle.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: {articleID: articleID},
        success: function (data) {
            console.log(data)
            if (data["Status"] == "Success") {
                let article = JSON.parse(data["Data"])[0]
                
                //---------------------------------------------------------------------------------------------------Add Article
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

function sendMessageToChatBot(message) {
    let context, classification = classifyMessage(message);
    
    if (classification == "PRACTICAL_GUIDANCE") {
    }
}

function classifyMessage(message) {
    $.ajax({
        url: 'gptClassifyMessage.py',
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