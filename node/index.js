const express = require("express");
const app = express();
const https = require("https");
const fs = require("fs");

//--------------------------------------------------------Cors--------------------------------------------------------//

var cors = require('cors')

// CORS configuration
app.use(cors({
    origin: 'https://system-fai-im.info', // Replace with your allowed origin
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type,Authorization'
}));

app.get('/products/:id', function (req, res, next) {
    res.json({msg: 'This is CORS-enabled for all origins!'})
})


//-----------------------------------------Handling Message & Typing Inputs-------------------------------------------//

let messages = [];

app.get("/send-data", (req, res) => {
    const { to, data, section } = req.query;
    if(to != "" && data != "" && section != "") {
        messages.push(JSON.stringify({To: to, Section: section, Data: data}));
    }
    res.send("Received");
});

//----------------------------------------------------- Subscribe ----------------------------------------------------//
function subscribe(roomData){
    if (roomData["section"] && roomData["sender"] && roomData["to"]) {
        let section = roomData["section"]
        let trialID = roomData["trialID"]
        let client1 = roomData["client1"]
        let client2 = roomData["client2"]
        let sender  = roomData["sender"]
        let to      = roomData["to"]
        let res     = roomData["res"]

        // Subscribe To Updates
        if (clients[section].subs[sender]) {
            clients[section].subs[sender].push(res);
        } else {
            clients[section].subs[sender] = [res];
        }

        // Close Function
        res.on("close", () => {
            console.log(`|\n|----Closing----\n|`)
            if (clients[section].subs[sender].length > 1) {
                let index = clients[section].subs[sender].indexOf(res)
                clients[section].subs[sender].splice(index, 1)
            } else {
                delete clients[section].subs[sender]
            }

            // Check if sander is last person in room if so delete room -----------------------------------------------------------------------
            let room = {}
            for(const tempRoom of clients[section].rooms) {
                if (tempRoom.client1 == client1 && tempRoom.client2 == client2 && tempRoom.trialID == trialID){
                    room = tempRoom
                }
            }

            if (Object.keys(room).length !== 0) {
                let { senderClient, toClient } = (room.client1 === sender)
                    ? { senderClient: "client1", toClient: "client2" }
                    : { senderClient: "client2", toClient: "client1" };

                // if Sender only person in the room then delete the room
                console.log("ToClient: "+ toClient+" = "+room[toClient+"Cntd"])
                if (!room[toClient+"Cntd"]) {
                    setTimeout(function() {
                        if (!room[toClient+"Cntd"]) {
                            let indexToRemove = clients[section].rooms.indexOf(room)
                            clients[section].rooms.splice(indexToRemove, 1)
                        }
                    }, 15000);
                } else {

                    // Check if the client already reconnected within the past 10 seconds
                    if (room[senderClient+"Time"] > 0) {
                        let timeDiff = Date.now() - room[senderClient+"Time"]
                        if (timeDiff < 2000) {
                            console.log("Time Diff: "+timeDiff)
                            room[senderClient+"Cntd"] = true
                            return;
                        }
                    }


                    // Otherwise set sender connected to false and wait
                    room[senderClient+"Cntd"] = false

                    // console.log( + " Not Connected: " + !room[senderClient+"Cntd"])
                    console.log("Set "+senderClient+"Cntd to false")
                    console.log("Room: "+JSON.stringify(room))

                    // If after waiting sender connected is still false then set time to -1
                    setTimeout(function() {
                        // console.log(room[senderClient+"Cntd"])
                        console.log("Check If "+senderClient+"Cntd if false, if so remove room")
                        console.log(": "+JSON.stringify(room))
                        if (!room[senderClient+"Cntd"]) {
                            // room.startTime = -1

                            // Update Other Clients and Experimenters
                            messages.push(JSON.stringify({
                                To         : to,
                                Section    : section,
                                Data       : JSON.stringify({
                                    updateType : "disconnect",
                                    connected  : false
                                })
                            }));
                            // Update Experimenters Who Might Be In Sender View
                            messages.push(JSON.stringify({
                                updateType : "disconnect",
                                To         : sender,
                                Section    : section,
                                Data       : JSON.stringify({
                                    updateType : "disconnect",
                                    connected  : false
                                })
                            }));

                            // notifyExperimentersOfDisconnect(room)
                        }
                    }, 10000);
                }
            }
        })
    }
}

//-------------------------------------------------- Double Subscribe ------------------------------------------------//

function watcherSubscribe(roomData){
    if (roomData["section"] && roomData["sender"] && roomData["to"]) {
        let section = roomData["section"]
        let sender  = roomData["sender"]
        let to      = roomData["to"]
        let res     = roomData["res"]

        // Subscribe To Updates
        if (clients[section].subs[sender]) {
            clients[section].subs[sender].push(res);
        } else {
            clients[section].subs[sender] = [res];
        }

        // Close Function
        res.on("close", () => {
            if (clients[section].subs[sender].length > 1) {
                let index = clients[section].subs[sender].indexOf(res)
                clients[section].subs[sender].splice(index, 1)
            } else {
                delete clients[section].subs[sender]
            }
        })
    }
}


//---------------------------------------------------- Create Room ---------------------------------------------------//

function createRoom(roomData){
    if (roomData["section"] && roomData["sender"] && roomData["to"]) {
        let section = roomData["section"]
        let trialID = roomData["trialID"]
        let client1 = roomData["client1"]
        let client2 = roomData["client2"]
        let sender  = roomData["sender"]
        let to      = roomData["to"]

        console.log("Rooms: "+clients[section].rooms.length)

        let room = {}
        for(const tempRoom of clients[section].rooms) {
            if (tempRoom.client1 == client1 && tempRoom.client2 == client2 && tempRoom.trialID == trialID){
                room = tempRoom
            }
        }

        console.log("Room Before: "+JSON.stringify(room))

        // If room isn't null
        let retVal
        if(Object.keys(room).length !== 0){

            let client = (room.client1 == sender) ? "client1" : "client2";
            room[client+"Cntd"] = true;
            room[client+"Time"] = Date.now();

            // Check if both clients are connected
            if (room.client1Cntd && room.client2Cntd) {

                // Connect Timer If It's Not already Existing
                if (room.startTime<0){
                    room.startTime = Date.now()
                }

                // Send Out Start Time
                messages.push(JSON.stringify({
                    To: sender,
                    Section: section,
                    Data: JSON.stringify({
                        connected: true,
                        startTime: room.startTime
                    })
                }));
                messages.push(JSON.stringify({
                    To: to,
                    Section: section,
                    Data: JSON.stringify({
                        connected: true,
                        startTime: room.startTime
                    })
                }));

                // notifyExperimentersOfConnect(room)
            }

            retVal = "Room Updated"
        } else {
            room = {
                trialID     : trialID,
                client1     : client1,
                client2     : client2,
                client1Cntd : false,
                client2Cntd : false,
                startTime   : -1,
                client1Time : -1,
                client2Time : -1
            }

            let client = (room.client1 == sender) ? "client1" : "client2";
            room[client+"Cntd"] = true;
            room[client+"Time"] = Date.now();
            clients[section].rooms.push(room)

            retVal = "Room Created"
        }

        console.log("Room After: "+JSON.stringify(room))
        console.log("Rooms After: "+clients[section].rooms.length)

        messages.push(JSON.stringify({
            To: sender,
            Section: section,
            Data: JSON.stringify({
                serverStatusUpdate: retVal
            })
        }));
    }
}

//--------------------------------------------------- Get Room Time --------------------------------------------------//

function getRoomTime(roomData) {
    if (roomData["section"] && roomData["sender"] && roomData["to"]) {
        let client1 = roomData["client1"]
        let client2 = roomData["client2"]
        let section = roomData["section"]
        let trialID = roomData["trialID"]
        let sender  = roomData["sender"]

        let room = {}
        for (const tempRoom of clients[section].rooms) {
            if (tempRoom.client1 == client1 && tempRoom.client2 == client2 && tempRoom.trialID == trialID) {
                room = tempRoom
            }
        }

        // If room isn't null
        let retVal = -1;
        if (Object.keys(room).length !== 0) {
            retVal = room.startTime
        }
        messages.push(JSON.stringify({
            To: sender,
            Section: section,
            Data: JSON.stringify({
                startTime: retVal
            })
        }));
    }
}

//-------------------------------------------------- Get Room Status -------------------------------------------------//

function getRoomStatus(roomData) {
    if (roomData["section"] && roomData["sender"] && roomData["to"]) {
        let section = roomData["section"]
        let trialID = roomData["trialID"]
        let client1 = roomData["client1"]
        let client2 = roomData["client2"]
        let sender = roomData["sender"]

        let room = {}
        for (const tempRoom of clients[section].rooms) {
            if (tempRoom.client1 == client1 && tempRoom.client2 == client2 && tempRoom.trialID == trialID) {
                room = tempRoom
            }
        }

        // If room isn't null
        let retVal = false;
        if (Object.keys(room).length !== 0) {
            retVal = room.client1Cntd && room.client1Cntd
        }
        messages.push(JSON.stringify({
            To: sender,
            Section: section,
            Data: JSON.stringify({
                connected: retVal
            })
        }));
    }
}

//---------------------------------------------- Get Room Time And Status --------------------------------------------//

function getRoomTimeAndStatus(roomData) {
    if (roomData["section"] && roomData["sender"] && roomData["to"]) {
        let client1 = roomData["client1"]
        let client2 = roomData["client2"]
        let section = roomData["section"]
        let trialID = roomData["trialID"]
        let sender  = roomData["sender"]
        // let res  = roomData["res"]

        let room = {}
        for (const tempRoom of clients[section].rooms) {
            if (tempRoom.client1 == client1 && tempRoom.client2 == client2 && tempRoom.trialID == trialID) {
                room = tempRoom
            }
        }

        // If room exists and is active return that
        if (Object.keys(room).length !== 0) {
            if (room.startTime >= 0 && room.client1Cntd && room.client1Cntd) {
                messages.push(JSON.stringify({
                    To: sender,
                    Section: section,
                    Data: JSON.stringify({
                        connected: true,
                        startTime: room.startTime
                    })
                }));
            }
        }

        // Add to watchers list to keep track of future updates
        // clients[section].watchers.push(res)
    }
}

//--------------------------------------Handling Clients Subscribing To Streams---------------------------------------//

const clients = {
    "1":{rooms: [], subs: {}},  // watchers: [],
    "2":{rooms: [], subs: {}},  // watchers: [],
    "3":{rooms: [], subs: {}},  // watchers: [],
    "4":{rooms: [], subs: {}},  // watchers: [],
    "5":{rooms: [], subs: {}},  // watchers: [],
    "6":{rooms: [], subs: {}},  // watchers: [],
    "7":{rooms: [], subs: {}}}  // watchers: [],



let methods = {
    subscribe            : subscribe           ,
    createRoom           : createRoom          ,
    getRoomTime          : getRoomTime         ,
    getRoomStatus        : getRoomStatus       ,
    watcherSubscribe     : watcherSubscribe    ,
    getRoomTimeAndStatus : getRoomTimeAndStatus,
}

app.get("/connect", (req, res) => {
    res.setHeader("Content-Type"      , "text/event-stream")
    res.setHeader("Connection"        , "keep-alive"       )
    res.setHeader("Cache-Control"     , "no-cache"         )
    // res.setHeader("X-Accel-Buffering" , "no"               )

    // Send a comment to keep the connection alive (optional)
    res.write(':ok\n\n');


    let query = req.query
    let flags, section, sender, to, trialID
    if (query["flags"] && query["section"] && query["sender"] && query["to"] && query["trialID"]) {
        flags   = query["flags"]
        section = query["section"]
        sender  = query["sender"]
        to      = query["to"]
        trialID = query["trialID"]

        // flags = decodeURIComponent(flags)
        flags = JSON.parse(flags)

        let client1, client2
        if (sender < to) {
            client1 = sender
            client2 = to
        } else {
            client1 = to
            client2 = sender
        }

        let roomData = {
            flags   : flags   ,
            section : section ,
            sender  : sender  ,
            to      : to      ,
            client1 : client1 ,
            client2 : client2 ,
            trialID : trialID ,
            res     : res
        }

        for (const flag of flags) {
            console.log("Flag: "+flag)
            methods[flag](roomData)
        }
    }


    res.write("data: " + JSON.stringify({status:"received"}) + '\n\n');


});


//--------------------Recursive Infinite Loop that Handles Sending Messages to Subscribed Clients---------------------//

function send () {
    //Sending Messages
    for(let i=0; i<=messages.length-1; i++) {
        let data = messages.shift();
        let parsedData = JSON.parse(data);
        // let to = parsedData["to"] ? parsedData["to"] : parsedData["TypingTo"] ;
        let to = parsedData["To"]
        let section = parsedData["Section"]
        data = parsedData["Data"]

        if(clients[section].subs[to]){
            clients[section].subs[to].forEach((client) => {
                client.write("data: " + data + '\n\n'); //Optimize by reJSONifying and removing section param
            });
        }
    }

    setTimeout(() => send(), 250);
}

send();

//------------------------------------------------ Experimenter Mode -------------------------------------------------//
//
// function notifyExperimentersOfDisconnect(room) {
//
// }
//
// function notifyExperimentersOfConnect(room) {
//     // messages.push(JSON.stringify({
//     //     To: room.client1,
//     //     Section: room.section,
//     //     Data: JSON.stringify({
//     //         connected: true,
//     //         startTime: room.startTime
//     //     })
//     // }));
// }

//-------------------------------------------------Connection Status--------------------------------------------------//

watchers = []

app.get("/watch", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream")

    watchers.push(res)

    // res.write("data: " + JSON.stringify({status:"received"}) + '\n\n');
    console.log("Watcher Added. Total Watchers At: "+watchers.length)
    console.log(clients)

    //Go through the already existing clients and inform the watchers
    for (let condition in clients) {

        console.log("condition key: "+Object.keys(clients[condition]))

        for (let sender in clients[condition]) {

            console.log("sender: "+sender)
            let others = false
            if (clients[condition][sender]["convos"]!=null){
                for (let to in clients[condition][sender]["convos"]) {

                    console.log("to: "+to)
                    others = true
                    updateWatchers("add", clients[condition][to]["convos"][sender]!=null, sender, to, condition)

                }
            }

            if (!others) {
                updateWatchers("add", false, sender, "?", condition)
            }
        }
    }

    // Object.keys(clients).forEach((key) => {
    //     clients[key].forEach((sender) => {
    //         console.log(sender)
    //     })
    // })

    res.on("close", () => {
        watchers.splice(watchers.indexOf(res), 1)
    })
})

// [NAME] is wating for [PARTNER_NAME] in condition [1,2,3,4]
// Actions: add, remove, update
// name: the senderID
// partnerName: the partner's name
// condition: 1,2,3,4
function updateWatchers(action, connected, name, partnerName, condition){
    if (watchers.length>0) {
        watchers.forEach((watcher) => {
            watcher.write(
            "data: " +
            JSON.stringify({
                action : action,
                connected : connected,
                name : name,
                partnerName : partnerName,
                condition : condition
            }) +
            '\n\n'
                )
        })
    }
}

//-------------------------------------------------Connection Status--------------------------------------------------//

watchingModers = []

app.get("/watchingMode", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream")

    // watchingModers.push(res)

    // // res.write("data: " + JSON.stringify({status:"received"}) + '\n\n');
    // console.log("Watcher Added. Total Watchers At: "+watchers.length)
    // console.log(clients)

    let query = req.query
    let section, sender, to
    if (query["section"] && query["sender"] && query["to"]){
        section = query["section"]
        sender = query["sender"]
        to = query["to"]

        let watcher = {
            section : section,
            sender : sender,
            to : to,
            res : res
        }

        watchingModers.push(watcher)

        res.on("close", () => {
            watchingModers.splice(watchers.indexOf(watcher), 1)
        })

    }
})

//active = true or false
//time = the time the convo started
function updateWatchModers(active, time, section, from, to){
    watchingModers.forEach((watcher) => {
        if (watcher.section === section) {
            if ( (watcher.sender === from && watcher.to === to) || (watcher.sender === to && watcher.to === from)){
                watcher.res.write(
                "data: " +
                JSON.stringify({
                    active : active,
                    time : time
                }) +
                '\n\n'
                    )
            }
        }
    })
}

//---------------------------------------------------Final Touches----------------------------------------------------//

// app.listen(8080)
// console.log("Listening on 8080")

// HTTPS options
const httpsOptions = {
    cert: fs.readFileSync('/etc/pki/tls/certs/ssl_cert.pem'),
    key: fs.readFileSync('/etc/pki/tls/private/ssl_priv_key.key'),
    ca: fs.readFileSync('/etc/pki/tls/certs/origin_ca_rsa_root.pem')
};

// Create HTTPS server
https.createServer(httpsOptions, app).listen(8443, () => {
    console.log("Listening on port 8443 (HTTPS)");
});

//**************************************MAKE SURE TO MAKE THIS CODE RUN ON BOOT***************************************//
// Go to https://www.howtogeek.com/687970/how-to-run-a-linux-program-at-startup-with-systemd/ inorder to do this.
// https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-18-04
// systemctl status pm2-ec2-user
// pm2 restart /var/www/html/node/index.js
// nohup node index.js &
// nohup node /var/www/html/node/index.js &


// ... for when someone is typing
// fix time on sql server
// Maybe Switch On KeyPress and OnKeyDown in html
// Add URL Param Selection to Home Page
// # Add Enter Key To Submit on 1 and 2
// # Fix Tabbing
// # Optimized Out-going updates (Only send messages to matching clients)
// # |__Accurate Connected Count
// # |__Update Other (1 & 2) Js Calls to Node Server

// How precise does the time measurement need to be?
// How much storage does a micro RDS have?
// How many transfers of info can be made per minute?



// const express = require("express");
// const app = express();
//
// //--------------------------------------------------------Cors--------------------------------------------------------//
//
// var cors = require('cors')
//
// app.use(cors())
//
// app.get('/products/:id', function (req, res, next) {
//     res.json({msg: 'This is CORS-enabled for all origins!'})
// })
//
//
// //----------------------------------------------Handling Message Inputs-----------------------------------------------//
//
// let messages = [];
//
// app.get("/send-message", (req, res) => {
//     const { to, message, section } = req.query;
//     if(to != "" && message != "") {
//         messages.push(JSON.stringify({To: to, Section: section, Data:
//                 JSON.stringify({message: message})}));
//     }
//     res.send("Received");
// });
//
//
// //-----------------------------------------------Handling Typing Inputs-----------------------------------------------//
//
// app.get("/notify-typing", (req, res) => {
//     const { to, status, section } = req.query;
//     if(to != "" && status != "") {
//         messages.push(JSON.stringify({To: to, Section: section, Data:
//                 JSON.stringify({Status: status})}));
//     }
//     res.send("Received");
// });
// //Either an issue with AWS Throttling or Node Js is lagging
//
//
// //--------------------------------------Handling Clients Subscribing To Streams---------------------------------------//
//
// const clients = {"1":{},"2":{},"3":{},"4":{},"5":{}}
//
// let numberClosing = 0
//
// app.get("/stream", (req, res) => {
//     res.setHeader("Content-Type", "text/event-stream")
//
//     let query = req.query
//     let section, sender, to
//     let watching = query["watchingMode"]!=null;
//     if (query["section"] && query["sender"] && query["to"]) {
//         section = query["section"]
//         sender = query["sender"]
//         to = query["to"]
//
//         if (clients[section][sender]) {
//             clients[section][sender].res.push(res);
//         } else {
//             clients[section][sender] = {convos: {}, res: [res], watchers: 0}; //Watchers is not conversation specific !!!
//         }
//
//         if (watching) {
//             clients[section][sender].watchers++;
//         }
//
//         //Write the code to check if the receiver is already in clients[section]
//         //If the partner is also in the chat
//         if (clients[section][to] && ((clients[section][to].res.length > clients[section][to].watchers && !watching))) {// || (clients[section][to].res.length>1 && watching)){
//             let startTime
//             if (clients[section][to]["convos"][sender] && clients[section][sender]["convos"][to]) {
//                 console.log(`clients[${section}][${to}]["convos"][${sender}] (${clients[section][to]["convos"][sender]})`)
//                 console.log(`clients[${section}][${sender}]["convos"][${to}] (${clients[section][sender]["convos"][to]})`)
//                 console.log("Time Already Present")
//
//                 // If the time already exists (after a refresh or such)
//                 startTime = clients[section][sender]["convos"][to]
//             } else { // if(!watching)
//                 console.log(`clients[${section}][${to}]["convos"][${sender}] (${clients[section][to]["convos"][sender]})`)
//                 console.log(`clients[${section}][${sender}]["convos"][${to}] (${clients[section][sender]["convos"][to]})`)
//                 console.log("Time Not Present")
//                 // If they are the second person to join the meeting
//                 startTime = Date.now()
//                 clients[section][to]["convos"][sender] = startTime
//                 clients[section][sender]["convos"][to] = startTime
//                 updateWatchers("add", true, sender, to, section)
//                 updateWatchers("change", true, to, sender, section)
//                 updateWatchModers(true, startTime, section, sender, to)
//             }
//
//             messages.push(JSON.stringify({
//                 To: to, Section: section, Data:
//                     JSON.stringify({connected: true, startTime: startTime})
//             }));
//             messages.push(JSON.stringify({
//                 To: sender, Section: section, Data:
//                     JSON.stringify({connected: true, startTime: startTime})
//             }));
//         } else {
//             updateWatchers("add", false, sender, to, section)
//             updateWatchModers(false, null, section, sender, to)
//         }
//     }
//
//
//     res.on("close", () => {
//         if (section && clients[section][sender]){
//             numberClosing++
//             // let numOfReses = clients[section][sender].res.length;
//
//             setTimeout(() => {
//                 if (section && clients[section][sender]){
//                 //     if (clients[section][sender].res.length > numOfReses) {
//                 //         console.log(`clients[${section}][${sender}].res.length (${clients[section][sender].res.length})
//                 //         > numOfReses (${numOfReses})`)
//                 //         console.log("Not Delete")
//                 //         return
//                 //     }
//
//                     let index = clients[section][sender].res.indexOf(res)
//                     if (index > 1) {
//                         clients[section][sender].res.splice(index,1)
//                     } if (index == 0 && numberClosing==1) {
//                         delete clients[section][sender]
//                     }
//                     updateWatchers("remove", false, sender, to, section)
//                     updateWatchModers(false, null, section, sender, to)
//
//                     //Remove Times
//                     if (clients[section][to] && clients[section][to].res.length==0 && clients[section][sender].res.length==0) {
//                         console.log(`clients[${section}][${to}].res.length (${clients[section][to].res.length}) == 0`)
//                         console.log(`clients[${section}][${sender}].res.length (${clients[section][sender].res.length}) == 0`)
//                         console.log("Delete")
//                         delete clients[section][sender].convos[to]
//                         if (clients[section][to].convos[sender]){
//                             delete clients[section][to].convos[sender]
//                         }
//                         updateWatchers("change", false, to, sender, section)
//                         updateWatchModers(false, null, section, sender, to)
//                     }
//                     numberClosing--
//                 }
//             },20000)
//
//             console.log("####################REMOVED#####################\n"+
//                 "Client Removed from /"+section+"\nTotal Clients at /"+
//                 section+": "+Object.keys(clients[section]).length+"\n")  //+
//                 // (clients[section][sender].res.length-1)+" Duplicates");
//         }
//     });
//
//     res.write("data: " + JSON.stringify({status:"received"}) + '\n\n');
//
//     if (section && clients[section][sender]) {
//         console.log("####################CONECTED####################\n"+
//             "New Client Conected at /"+section+"\nTotal Clients at /"+
//             section+": "+Object.keys(clients[section]).length+"\n"+
//             (clients[section][sender].res.length-1)+" Duplicates");
//     }
// });
//
//
// //--------------------Recursive Infinite Loop that Handles Sending Messages to Subscribed Clients---------------------//
//
// function send () {
//     //Sending Messages
//     for(let i=0; i<=messages.length-1; i++) {
//         let data = messages.shift();
//         let parsedData = JSON.parse(data);
//         // let to = parsedData["to"] ? parsedData["to"] : parsedData["TypingTo"] ;
//         let to = parsedData["To"]
//         let section = parsedData["Section"]
//         data = parsedData["Data"]
//
//         if(clients[section][to]){
//             clients[section][to].res.forEach((client) => {
//                 client.write("data: " + data + '\n\n'); //Optimize by reJSONifying and removing section param
//             });
//         }
//     }
//
//     setTimeout(() => send(), 250);
// }
//
// send();
//
// //-------------------------------------------------Connection Status--------------------------------------------------//
//
// watchers = []
//
// app.get("/watch", (req, res) => {
//     res.setHeader("Content-Type", "text/event-stream")
//
//     watchers.push(res)
//
//     // res.write("data: " + JSON.stringify({status:"received"}) + '\n\n');
//     console.log("Watcher Added. Total Watchers At: "+watchers.length)
//     console.log(clients)
//
//     //Go through the already existing clients and inform the watchers
//     for (let condition in clients) {
//
//         console.log("condition key: "+Object.keys(clients[condition]))
//
//         for (let sender in clients[condition]) {
//
//             console.log("sender: "+sender)
//             let others = false
//             if (clients[condition][sender]["convos"]!=null){
//                 for (let to in clients[condition][sender]["convos"]) {
//
//                     console.log("to: "+to)
//                     others = true
//                     updateWatchers("add", clients[condition][to]["convos"][sender]!=null, sender, to, condition)
//
//                 }
//             }
//
//             if (!others) {
//                 updateWatchers("add", false, sender, "?", condition)
//             }
//         }
//     }
//
//     // Object.keys(clients).forEach((key) => {
//     //     clients[key].forEach((sender) => {
//     //         console.log(sender)
//     //     })
//     // })
//
//     res.on("close", () => {
//         watchers.splice(watchers.indexOf(res), 1)
//     })
// })
//
// // [NAME] is wating for [PARTNER_NAME] in condition [1,2,3,4]
// // Actions: add, remove, update
// // name: the senderID
// // partnerName: the partner's name
// // condition: 1,2,3,4
// function updateWatchers(action, connected, name, partnerName, condition){
//     if (watchers.length>0) {
//         watchers.forEach((watcher) => {
//             watcher.write(
//             "data: " +
//             JSON.stringify({
//                 action : action,
//                 connected : connected,
//                 name : name,
//                 partnerName : partnerName,
//                 condition : condition
//             }) +
//             '\n\n'
//                 )
//         })
//     }
// }
//
// //-------------------------------------------------Connection Status--------------------------------------------------//
//
// watchingModers = []
//
// app.get("/watchingMode", (req, res) => {
//     res.setHeader("Content-Type", "text/event-stream")
//
//     // watchingModers.push(res)
//
//     // // res.write("data: " + JSON.stringify({status:"received"}) + '\n\n');
//     // console.log("Watcher Added. Total Watchers At: "+watchers.length)
//     // console.log(clients)
//
//     let query = req.query
//     let section, sender, to
//     if (query["section"] && query["sender"] && query["to"]){
//         section = query["section"]
//         sender = query["sender"]
//         to = query["to"]
//
//         let watcher = {
//             section : section,
//             sender : sender,
//             to : to,
//             res : res
//         }
//
//         watchingModers.push(watcher)
//
//         res.on("close", () => {
//             watchingModers.splice(watchers.indexOf(watcher), 1)
//         })
//
//     }
// })
//
// //active = true or false
// //time = the time the convo started
// function updateWatchModers(active, time, section, from, to){
//     watchingModers.forEach((watcher) => {
//         if (watcher.section === section) {
//             if ( (watcher.sender === from && watcher.to === to) || (watcher.sender === to && watcher.to === from)){
//                 watcher.res.write(
//                     "data: " +
//                     JSON.stringify({
//                         active : active,
//                         time : time
//                     }) +
//                     '\n\n'
//                 )
//             }
//         }
//     })
// }
//
// //---------------------------------------------------Final Touches----------------------------------------------------//
//
// app.listen(8080)
// console.log("Listening on 8080")

//**************************************MAKE SURE TO MAKE THIS CODE RUN ON BOOT***************************************//
// Go to https://www.howtogeek.com/687970/how-to-run-a-linux-program-at-startup-with-systemd/ inorder to do this.
// https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-18-04
// systemctl status pm2-ec2-user
// pm2 restart /var/www/html/node/index.js
// nohup node index.js &
// nohup node /var/www/html/node/index.js &


// ... for when someone is typing
// fix time on sql server
// Maybe Switch On KeyPress and OnKeyDown in html
// Add URL Param Selection to Home Page
// # Add Enter Key To Submit on 1 and 2
// # Fix Tabbing
// # Optimized Out-going updates (Only send messages to matching clients)
// # |__Accurate Connected Count
// # |__Update Other (1 & 2) Js Calls to Node Server

// How precise does the time measurement need to be?
// How much storage does a micro RDS have?
// How many transfers of info can be made per minute?


//-----------------------------------------------------------------------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------------------------------------------------------------//


// const express = require("express");
// const app = express();
//
// //--------------------------------------------------------Cors--------------------------------------------------------//
//
// var cors = require('cors')
//
// app.use(cors())
//
// app.get('/products/:id', function (req, res, next) {
//     res.json({msg: 'This is CORS-enabled for all origins!'})
// })
//
//
// //----------------------------------------------Handling Message Inputs-----------------------------------------------//
//
// let messages = [];
//
// app.get("/send-message", (req, res) => {
//     const { to, message } = req.query;
//     // console.log(req.query);
//     if(to != "" && message != "") {
//         messages.push(JSON.stringify({to: to, message: message}));
//         console.log("Pushed {to: "+to+", message: "+message)
//     }
//     res.send("Received");
// });
//
//
// //-----------------------------------------------Handling Typing Inputs-----------------------------------------------//
//
// let typingClients = new Set();
// let clientsStoppedTyping = new Set();
//
// app.get("/notify-typing", (req, res) => {
//     const { to, status } = req.query;
//     // console.log(req.query);
//     if(to != "" && status != "") {
//         messages.push(JSON.stringify({TypingTo: to, Status: status}))
//         console.log("Pushed {to: "+to+", Status: "+status)
//         // typingClients.add(to);
//     }
//     res.send("Received");
// });
// //Either an issue with AWS Throttling or Node Js is lagging
//
//
// //--------------------------------------Handling Clients Subscribing To Streams---------------------------------------//
//
// const clients = new Set();
//
// app.get("/stream", (req, res) => {
//     res.setHeader("Content-Type", "text/event-stream")
//
//     clients.add(res);
//
//     res.on("close", () => {
//         clients.delete(res);
//         console.log("Connected: "+clients.size);
//     });
//     res.write("data: " + JSON.stringify({status:"received"}) + '\n\n');
//
//     console.log("Connected: "+clients.size);
// });
//
//
// //--------------------Recursive Infinite Loop that Handles Sending Messages to Subscribed Clients---------------------//
//
// //Can be optimized by turning clients into a map or senderID:res and only sending data to the client whose ID=to.
// function send () {//iteration
//     //Sending Messages
//     for(let i=0; i<=messages.length-1; i++) {
//         console.log("Messages: "+messages)
//         console.log("Clients: "+clients)
//         console.log("Data: "+i)
//         let data = messages.shift();
//         console.log("Shifted")
//         clients.forEach((client) => {
//             console.log("Client: "+client);
//             client.write("data: " + data + '\n\n');
//             console.log("Sent: "+data)
//         });
//         // res.write("data: " + data +'\n\n'); //"{to: "+globTo+", text: "+globMessage+"}"
//     }
//
//     // //Sending Typing Notifications
//     // typingClients.forEach( (typingTo) => {
//     //     clients.forEach((client) => {
//     //         client.write("data: " + JSON.stringify({"TypingTo":typingTo,"Continue":true}) + '\n\n');
//     //     });
//     //     clientsStoppedTyping.add(typingTo);
//     // });
//     //
//     // //Ending Typing Notification
//     // clientsStoppedTyping.forEach( (typingTo) => {
//     //     if(!typingClients.has(typingTo)){
//     //         clients.forEach((client) => {
//     //             client.write("data: " + JSON.stringify({"TypingTo":typingTo,"Continue":false}) + '\n\n');
//     //         });
//     //         clientsStoppedTyping.delete(typingTo);
//     //     }
//     // });
//     // typingClients.clear();
//
//     setTimeout(() => send(), 250);
// }
//
// send();
//
// /* function send () {//iteration
//     //Sending Messages
//     for(let i=0; i<=messages.length-1; i++)
//     {
//         let data = messages.shift();
//         clients.forEach((client) => {
//             client.write("data: " + data + '\n\n');
//         });
//         // res.write("data: " + data +'\n\n'); //"{to: "+globTo+", text: "+globMessage+"}"
//     }
//
//         //Sending Typing Notifications
//         typingClients.forEach( (typingTo) => {
//             console.log(typingClients)
//             console.log("Typing: "+typingTo)
//             clients.forEach((client) => {
//                 client.write("data: " + JSON.stringify({"TypingTo":typingTo,"Continue":true}) + '\n\n');
//             });
//             console.log(clientsStoppedTyping)
//             clientsStoppedTyping.add(typingTo);
//             console.log(clientsStoppedTyping)
//         });
//
//     // if(iteration == 4) {
//         //Ending Typing Notification
//         clientsStoppedTyping.forEach( (typingTo) => {
//             if(!typingClients.has(typingTo)){
//                 console.log(typingClients)
//                 console.log("Stopping: "+typingTo)
//                 clients.forEach((client) => {
//                     client.write("data: " + JSON.stringify({"TypingTo":typingTo,"Continue":false}) + '\n\n');
//                 });
//                 console.log(clientsStoppedTyping)
//                 clientsStoppedTyping.delete(typingTo);
//                 console.log(clientsStoppedTyping)
//             }
//         });
//         typingClients.clear();
//         // iteration=0;
//     // }
//
//     // console.log(iteration+1)
//     // iteration+=1;
//     setTimeout(() => send(), 250);//iteration/*+1*/
// //} */
//
// //---------------------------------------------------Final Touches----------------------------------------------------//
//
// app.listen(8080)
// console.log("Listening on 8080")