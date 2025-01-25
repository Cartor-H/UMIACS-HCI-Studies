// import XLSXStyle from '../node/node_modules/xlsx-style';

let language = "English"
let ling = "none"
let agency = false

let originalTranslation = ""
let timeOfTranslation = ""
let reTranslated = false
let watchingMode = false;

let numParas = 3;

let paraBool = false
let SelfBeforeParaBool = false
let SelfAfterParaBool = false
let paraSrc = ""
let paraSrcSel = ""

let promptSelected =  JSON.stringify([
            {"role": "system", "content": "Generate three paraphrases for this message by following the instructions."+
                    "Focus on the selected text, but still respond with the full sentence."},
            {"role": "user", "content": "_msg_"},
            {"role": "system", "content": "Highlighted Text:"},
            {"role": "system", "content": "_msg__[__selStart__:__selEnd__]_"},
            {"role": "system", "content": `
            
            Paraphrase instructions:
            1. The speaker of the message is discussing two house purchase options with another person.
            2. Use natural English expressions and sentence structure in your paraphrases.
            3. If a paraphrase adds, removes, or alters any details in the message, attach variable "content" equal to 1. Otherwise, attach variable "content" equal to 0.
            4. Independent of step 3, if a paraphrase alters the formality of the message by 2 or more points between 1 (most conversational) and 5 (most formal), attach variable "tone" equal to 1. Otherwise, attach variable "tone" equal to 0.
            5. Respond JSON format following the example below.
            {
                paraphrases : [
                    {msg : "", content:0|1, tone:0|1},
                    {msg : "", content:0|1, tone:0|1},
                    {msg : "", content:0|1, tone:0|1}]
            }
            `}
        ])

let promptUnselected = JSON.stringify([
            {"role": "system", "content": "Generate three paraphrases for this message by following the instructions."},
            {"role": "user", "content": "_msg_"},
            {"role": "system", "content": `
        
            Paraphrase instructions:
            1. The speaker of the message is discussing two house purchase options with another person.
            2. Use natural English expressions and sentence structure in your paraphrases.
            3. If a paraphrase adds, removes, or alters any details in the message, attach variable "content" equal to 1. Otherwise, attach variable "content" equal to 0.
            4. Independent of step 3, if a paraphrase alters the formality of the message by 2 or more points between 1 (most conversational) and 5 (most formal), attach variable "tone" equal to 1. Otherwise, attach variable "tone" equal to 0.
            5. Respond JSON format following the example below.
            {
                paraphrases : [
                    {msg : "", content:0|1, tone:0|1},
                    {msg : "", content:0|1, tone:0|1},
                    {msg : "", content:0|1, tone:0|1}]
            }
            `}
        ])


let parasArray = [{msg : "", content:-1, tone:-1},
                  {msg : "", content:-1, tone:-1},
                  {msg : "", content:-1, tone:-1}]

// parasArray = [{msg: "" , tone: true|false, content: true|false}]
function showParas(parasArray=null) {
    let paras = `
        <li class="list-group-item d-flex">
            <span class="d-flex flex-grow-1 border-0 m-0">
                <b class="flex-grow-1">改写参考</b>
                <b class="ms-3">语气</b>
                <b class="ms-3">语义</b>
            </span>
        </li>
        <div class="dropdown-divider m-0"></div>
        `
    for (let i = 1; i <= numParas; i++) {
        paras += `\n` + `
        <div class="d-flex">
            <span class="flex-grow-1 textarea-small dropdown-item btn-primary m-0 p-3"
                onclick="//useParaphrase(${i})" id="optionMessage${i}">
            ${(parasArray != null) ? parasArray[i-1].msg : ""}
            </span>
            <div class="d-flex flex-grow-1 justify-content-evenly align-items-center" style="width=80px !important;">
                <img class="ms-3" src="${parasArray[i-1].tone?   "refresh_circle_icon":"horizontal_line_icon"}.png" height="30" width="30"/>
                <img class="ms-3 me-3" src="${parasArray[i-1].content?"refresh_circle_icon":"horizontal_line_icon"}.png" height="30" width="30"/>
            </div>
            <!-- <div class="circle ${parasArray[i-1].tone?"green-border":"grey-border"} ms-3 m-0 p-0"></div> -->
            <!-- <div class="circle ${parasArray[i-1].content?"green-border":"grey-border"} ms-3 m-0 p-0"></div> -->
        </div>
        ${i==numParas?``:`<hr class="m-0"></hr>`}
        `
    }
    document.getElementById("parasGroup").innerHTML = `
        <div class="row">
  <div class="col-lg-12 mb-3">
    <div class="card">
      <ul class="list-group list-group-flush">
        <li class="list-group-item">
          <b>初始翻译</b>
        </li>
          <div class="d-flex">
            <span class="flex-grow-1 textarea-small btn-primary m-0 p-3" onclick="//switchMessageMain(0)" id="optionMessage0">
              ${originalTranslation}
            </span>
          </div>
      </ul>
    </div>
  </div>
  <div class="col-lg-12">
    <div class="card">
      <ul class="list-group list-group-flush">
        ${paras}
      </ul>
    </div>
  </div>
</div>
        `
}

function hideParas() {
    document.getElementById("parasGroup").innerHTML = ""
}

function clearParas() {
    // let paras = await getPraphrases(originalTranslation)
    // let paras = getPraphrases(originalTranslation)

    // for(let i = paras.length; i>0; i--){
    //     let indexRemoved = Math.floor(Math.random() * i)
    //     document.getElementById("optionMessage"+(5-i)).innerText = paras[indexRemoved];
    //     paras.splice(indexRemoved,1)
    // }


    paraBool = false
    SelfBeforeParaBool = false
    SelfAfterParaBool = false
    paraSrc = ""
    paraSrcSel = ""
    parasArray = [{msg : "", content:-1, tone:-1},
        {msg : "", content:-1, tone:-1},
        {msg : "", content:-1, tone:-1}]
}

function useParaphrase(number) {
    addSnapShot(document.getElementById("translatedMessage").innerText)
    // let replace = document.getElementById("optionMessage" + number).innerText
    document.getElementById("translatedMessage").innerText = parasArray[number-1].msg
    addSnapShot(parasArray[number-1].msg)
}

function switchMessage(number) {
    let temp = document.getElementById("translatedMessage").innerText
    addSnapShot(temp)
    let replace = document.getElementById("optionMessage"+number).innerText
    document.getElementById("translatedMessage").innerText = replace
    document.getElementById("optionMessage"+number).innerText = temp
    addSnapShot(replace)
}

function switchMessageMain(number) {
    let temp = document.getElementById("translatedMessage").innerText
    addSnapShot(temp)
    let main = document.getElementById("optionMessage"+number).innerText
    // Search for the main message in the options and switch it with the current message
    for (let i = 1; i <= numParas; i++) {
        if (document.getElementById("optionMessage"+i).innerText == main) {
            document.getElementById("optionMessage"+i).innerText = temp
            break
        }
    }
    document.getElementById("translatedMessage").innerText = main
    addSnapShot(main)
}

function dissablePara() {
    document.getElementById("paraBtn").classList.add("disabled")
}

function enablePara() {
    document.getElementById("paraBtn").classList.remove("disabled")
}

function paraphrase() {
    let message = document.getElementById("translatedMessage").innerText
    if (message!="") {
        dissablePara()
        // originalTranslation = message
        getParaphrases(message)
    }
}

function getParaphrases(message) {
    if (selectStart == -1) {
        prompt = promptUnselected
    } else {
        prompt = promptSelected
        paraSrcSel = message.substring(selectStart, selectEnd)
    }

    paraBool = true
    paraSrc = message

    $.ajax({
        url: 'getParaphrases.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: {message: message, selectStart: selectStart , selectEnd: selectEnd, prompt: prompt},
        success: function (data) {
            parasArray = JSON.parse(data["Data"])["paraphrases"]
            console.log(parasArray)
            showParas(parasArray)
            // if (data["Status"] == "Success"){
            //     messageID = data["Data"]
            //     addToEdits(messageID,from,message,translatedMessage)
            // } else {
            //     console.log("Something Went Wrong On Data Retrieval");
            //     console.log(data);
            // }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
        }
    });
}

// async function getPraphrases(message) {
//     const url = 'https://rewriter-paraphraser-text-changer-multi-language.p.rapidapi.com/rewrite';
//     const options = {
//         method: 'POST',
//         headers: {
//             'content-type': 'application/json',
//             'X-RapidAPI-Key': '535beaecb1mshecafc8660263b1ep196787jsn8c85904a3032',
//             'X-RapidAPI-Host': 'rewriter-paraphraser-text-changer-multi-language.p.rapidapi.com'
//         },
//         body: JSON.stringify({
//             language: 'en',
//             strength: 3,
//             text: message
//         })
//     };
//
//     try {
//         const response = await fetch(url, options);
//         const result = await response.text();
//
//         const data = JSON.parse(result);
//
//         // Extract the relevant properties from the API response
//         const rewrite = data.rewrite;
//         const synonyms = data.synonyms;
//
//         // Replace each synonym in the rewrite with its first synonym
//         let list = [rewrite,rewrite,rewrite,rewrite]
//         for (const word in synonyms) {
//             synonyms[word].push(word)
//             list[1] = list[1].replace(new RegExp(`\\b${word}\\b`, 'gi'), synonyms[word][0%synonyms[word].length]);
//             list[2] = list[2].replace(new RegExp(`\\b${word}\\b`, 'gi'), synonyms[word][1%synonyms[word].length]);
//             list[3] = list[3].replace(new RegExp(`\\b${word}\\b`, 'gi'), synonyms[word][2%synonyms[word].length]);
//         }
//         console.log(list);
//
//         console.log(result);
//         return list
//     } catch (error) {
//         console.error(error);
//     }
// }



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
        document.getElementById("message").focus();
    // }
    document.getElementById("translatedMessage").innerText = ""
    document.getElementById("translateBtn").innerText = "翻译"

    stopSnapshot()
    englishMessages = []
    snapshotTimes = []

    hideParas()
    dissablePara()
}

function translateMessage() {
    if (originalTranslation != "") {
        reTranslated = true
    }

    let message = document.getElementById("message").innerText;

    if (message!="") {
        originalTranslation = getTranslation(message);

        document.getElementById("translatedMessage").innerText = originalTranslation;
        document.getElementById("message").removeAttribute("contenteditable")
        // document.getElementById("sendGroup").hidden = false;
        document.getElementById("translatedMessage").focus();
        document.getElementById("translateBtn").innerText = "清空"

        // Iterate through the radio buttons
        const radioButtons = document.querySelectorAll('.btn-check');
        radioButtons.forEach((radioButton) => {
            radioButton.disabled = false
        })

        startSnapshot(document.getElementById("translatedMessage"))
        enablePara()
    }
}


function submit() {
    console.log("'" + document.getElementById("message").innerText
        + "' From: " + document.getElementById("senderID").value
        + " To: " + document.getElementById("receiverID").value);


    let message = agency? document.getElementById("message").innerText :
        document.getElementById("translatedMessage").innerText;
    let from = document.getElementById("senderID").value;
    let to = document.getElementById("receiverID").value;
    let trial = document.getElementById("trialNumber").value;


    if (message!="" && to!="" && from!=""){

        addSnapShot(document.getElementById("translatedMessage"))
        stopSnapshot()

        let translatedMessage = agency ?
            document.getElementById("translatedMessage").innerText : getTranslation(message);

        if (translatedMessage==""){
            return;
        }

        let bothMessages
        if(language=="English"){
            bothMessages = {engMessage: message, manMessage: translatedMessage}
        } else {
            bothMessages = {engMessage: translatedMessage, manMessage: message}
        }
        bothMessages["updateType"] = "message"

        //Show Message Locally
        addMessageRight(message,translatedMessage);
        //Send Message to Receiver
        sendMessage(to,JSON.stringify(bothMessages));


        //-------------------------------------------------------------------------------------Add Message To SQL Server
        console.log(language)
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
                    hideParas()
                    dissablePara()
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
            document.getElementById("message").focus();
            document.getElementById("translateBtn").innerText = "翻译"

            // Iterate through the radio buttons
            const radioButtons = document.querySelectorAll('.btn-check');
            radioButtons.forEach((radioButton) => {
                console.log(radioButton.id)
                radioButton.checked = false
                radioButton.disabled = true
            })
        }
        document.getElementById("translatedMessage").innerText = ""
        scrollBottom();
    }
}


function sendMessage(to, message) {
    fetch(`http://52.15.204.7:8080/send-data?to=${to}&data=${message}&section=${document.title}`)
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
                translation: originalTranslation, editedTranslation: translatedMessage, reTranslated: reTranslated,
                Paraphrased                :  paraBool,
                ParaphraseSource           :  paraSrc,
                ParaphraseSourceSel        :  paraSrcSel,
                ParaphraseOutput1_Text     :  parasArray[0].msg,
                ParaphraseOutput1_Tone     :  parasArray[0].tone,
                ParaphraseOutput1_Content  :  parasArray[0].content,
                ParaphraseOutput2_Text     :  parasArray[1].msg,
                ParaphraseOutput2_Tone     :  parasArray[1].tone,
                ParaphraseOutput2_Content  :  parasArray[1].content,
                ParaphraseOutput3_Text     :  parasArray[2].msg,
                ParaphraseOutput3_Tone     :  parasArray[2].tone,
                ParaphraseOutput3_Content  :  parasArray[2].content,
                SelfBeforePara             :  SelfBeforeParaBool,
                SelfAfterPara              :  SelfAfterParaBool
            },
            success: function (data) {
                console.log(data)
                originalTranslation = ""
                keyList = " "
                reTranslated = false
                clearParas()
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
        // document.getElementById("translatedMessage").removeAttribute("contenteditable");
        document.getElementById("translatedMessage").setAttribute("placeholder", "翻译的消息");
        document.getElementById("translateBtn").innerText = "翻译";
        document.getElementById("trialNumber").placeholder = "试用号";
        document.getElementById("trialNumberLbl").innerText = "试用号：";
        document.getElementById("typingAlert").innerText = receiver+" 在打字"
        document.getElementById("WaitingAlertText").innerText = "对方还未进入聊天室"
        document.getElementById("clockLbl").innerText = "聊天时长："
        document.querySelectorAll('.short-button').forEach(element => {element.style.width = "58px"})

        document.getElementById("nextStepBtn").innerText = "Continue in Mandarin"
        document.getElementById("nextStepBtn").setAttribute("href","")

        document.getElementById("nav1").innerText = "对话环节"
        document.getElementById("nav2").innerText = "问卷及报酬发放"

        document.getElementById("engSendBtn").remove()

        dissablePara()

        // document.getElementById("sendBtn").remove()
        // document.getElementById("optionsMenu").hidden=false
    } else {
        document.getElementById("optionsMenu").remove()
    }
    document.querySelectorAll('.input-group-text').forEach(element => {
        language=="Mandarin"?element.style.width = "106px":element.style.width = "143px";
    })
    //Bilingual
    ling = params.get('bi-ling') ? params.get('bi-ling').toLowerCase() : ling ;
    //Agency Effects
    document.getElementById("message").focus();
    if(!agency){
        // document.getElementById("sendGroup").hidden=false;
        document.getElementById("translatedMessage").setAttribute("placeholder",
            document.getElementById("message").getAttribute("placeholder"));
        document.getElementById("sendGroup").classList.remove('mb-2');
        document.getElementById("translateGroup").hidden=true;
        document.getElementById("translatedMessage").focus();
    }
    //watchingMode
    if(params.get('watchingMode')!=null){
        document.getElementById("translateGroup").hidden=true;
        document.getElementById("sendGroup").hidden=true;
        document.getElementById("fileDownloadButton").hidden=false;
        watchingMode = true;

        document.getElementById("sendGroup").remove()
    }

    //---------------------------------------------------------------------Connect to Server and Listen For New Messages
    // let sse = new EventSource(`http://52.15.204.7:8080/stream?sender=${sender}&to=${receiver}&section=${document.title}`+
    // `&${(watchingMode?"&watchingMode":"")}`);
    let flags
    if (watchingMode) {
        flags = JSON.stringify(["watcherSubscribe", "getRoomTimeAndStatus"]) //, "getRoomTime", "getRoomStatus"
    } else {
        flags = JSON.stringify(["subscribe", "createRoom"])
    }
    // flags = encodeURIComponent(flags)
    let sendData = {
        flags   : flags          ,
        section : document.title ,
        sender  : sender         ,
        to      : receiver       ,
        trialID : trial
    }
    console.log(sendData)
    let sse = new EventSource(`http://52.15.204.7:8080/connect?${new URLSearchParams(sendData).toString()}`);
    sse.onmessage = console.log;
    sse.onmessage = (event) => {
        if(event.data!=null){
            const data = event.data
            let dataJSON = JSON.parse(data);
            console.log(dataJSON)

            if(dataJSON["updateType"]=="disconnect"){
                document.getElementById("alerts").innerHTML =
                    '<div class="alert alert-danger alert-dismissible fade show p-2 mt-0 mb-2 ms-2 me-2 flex-shrink-1 d-flex align-items-center" id="WaitingAlert" role="alert">\n' +
                    '        <svg class="bi bi-check-circle-fill flex-shrink-0 me-2" viewBox="0 0 16 16" fill="currentColor" width="24" height="24" role="img" xmlns="http://www.w3.org/2000/svg">\n' +
                    '        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>\n' +
                    '    </svg>\n' +
                    '    <div id="WaitingAlertText">You are the only person in the room right now.</div>\n' +
                    '</div>\n'

                document.getElementById("nav1").parentElement.classList.add("bg-light-red");
                document.getElementById("nav1").parentElement.classList.remove("bg-light-green");

                clockActive = false
            }

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

                document.getElementById("nav1").parentElement.classList.add("bg-light-green");
                document.getElementById("nav1").parentElement.classList.remove("bg-light-red");

                clockActive = true

                updateClock();
            }


            //------------------------------------------------------------------------Local Response To Notice Of Typing
            if(dataJSON["updateType"]=="typing"){
                if(dataJSON["status"]=="Start"){
                    document.getElementById("typingAlert").hidden = false
                } else {
                    document.getElementById("typingAlert").hidden = true
                }
            }

            //-----------------------------------------------------------------------------Local Response To New Message
            if(dataJSON["updateType"]=="message"){
                // const {message} = dataJSON;
                // if (to == document.getElementById("senderID").value) {
                let parsed = dataJSON//JSON.parse(message);
                if(language=="Mandarin"){
                    addMessageLeft(parsed["manMessage"], parsed["engMessage"], parsed["firstOpt"], parsed["secondOpt"])
                } else {
                    addMessageLeft(parsed["engMessage"], parsed["manMessage"], parsed["firstOpt"], parsed["secondOpt"])
                }
                // }
                scrollBottom();
            }

        }
    }


    // Use language to determine left or right
    if (watchingMode) {
        // let sse = new EventSource(`http://52.15.204.7:8080/connect?sender=${receiver}&to=${sender}&section=${document.title}`+
        // `&${(watchingMode?"&watchingMode":"")}`);
        // flags = encodeURIComponent(flags)
        let sendData = {
            flags   : flags          ,
            section : document.title ,
            sender  : receiver       ,
            to      : sender         ,
            trialID : trial
        }
        console.log(sendData)
        let sse = new EventSource(`http://52.15.204.7:8080/connect?${new URLSearchParams(sendData).toString()}`);
        sse.onmessage = console.log;
        sse.onmessage = (event) => {
            if(event.data!=null){
                const data = event.data
                let dataJSON = JSON.parse(data);

                //-----------------------------------------------------------------------------Local Response To New Message
                if(dataJSON["updateType"]=="message"){
                    // const {message} = dataJSON;
                    // if (to == document.getElementById("senderID").value) {
                    let parsed =  dataJSON//JSON.parse(message);
                    console.log(parsed)
                    console.log(parsed["FirstButtonChoice"])
                    console.log(parsed["SecondButtonChoice"])
                    if(language=="Mandarin"){
                        addMessageRight(parsed["manMessage"],parsed["engMessage"], parsed["firstOpt"], parsed["secondOpt"])
                    } else {
                        addMessageRight(parsed["engMessage"],parsed["manMessage"], parsed["FirstButtonChoice"], parsed["SecondButtonChoice"])
                    }
                    // }
                }

                scrollBottom();
            }
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
                    for(let i = 0; i<messages.length; i++){                        //Add Messages
                        if(messages[i]["SenderID"]==sender){
                            addMessageRight(messages[i][messageType[0]], messages[i][messageType[1]]);
                        } else {
                            addMessageLeft(messages[i][messageType[0]], messages[i][messageType[1]]);
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


    // Attach the function to the input event
    document.getElementById("message").addEventListener("input", limitTextContentAndPreserveCursor);
}

//----------------------------------------------------Clock Update----------------------------------------------------//

let startTime = null;

let clockActive = false

function updateClock() {
    const clockElement = document.getElementById("clock");
    // console.log("Update Clock")
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

        // console.log(`${formattedMinutes}:${formattedSeconds}`)

        if (minutes>=30){
            // document.getElementById("nextStepBtn").removeAttribute("hidden");

            // Add the target attribute to open the link in a new tab
            document.getElementById("nav2").setAttribute("target", "_blank");

            if(language=="Mandarin"){
                document.getElementById("nav2").setAttribute("href","https://umdsurvey.umd.edu/jfe/form/SV_9TDppupyglrSHu6")
            } else {
                document.getElementById("nav2").setAttribute("href","https://umdsurvey.umd.edu/jfe/form/SV_0CEG1TAOKcUgsIK")
            }
            // document.getElementById("nav2").classList.add("bg-primary")
            // document.getElementById("nav2").classList.add("text-white")
            document.getElementById("nav2").parentElement.classList.add("bg-light-green");

            // if (seconds%10==5) {
            //     document.getElementById("nav2").parentElement.classList.add("pulsing-div");
            //     setTimeout(() => {
            //         document.getElementById("nav2").parentElement.classList.remove("pulsing-div");
            //     },2000*3)
            // } else if (seconds>29) {
            //     document.getElementById("nav2").parentElement.classList.add("pulsing-div");
            // }

            document.getElementById("nav2").classList.remove("disabled")
        }

        // Schedule the next update in 1 second
        if (clockActive){
            setTimeout(updateClock, 1000);
        } else {
            clockElement.value = "00:00"
        }
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
    status = JSON.stringify({updateType: "typing", status: status})
    fetch(`http://52.15.204.7:8080/send-data?to=${to}&data=${status}&section=${document.title}`)
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

function addMessageRight(topText, bottomText) {

    document.getElementById("chatWindow").innerHTML +=
        '<div class="card right-color offset-6 mb-3">' +
        '<div class="card-body pt-2 pb-2">' +
        topText +
        (ling=="both"||ling=="right"?'<p class="secondary-color m-0">'+bottomText+'</p>':"") +
        '</div>' +
        '</div>';
}

function addMessageLeft(topText, bottomText) {

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

let selectStart = -1;
let selectEnd = -1;


function checkCursor() {
    // Log Clicks
    if (agency) {
    // if (agency && originalTranslation !== "") {
        let spanElement = document.getElementById("translatedMessage");

        document.addEventListener("click", function(event) {
            if (event.target === spanElement) {
                let clickPosition = window.getSelection().getRangeAt(0);
                let clickStart = clickPosition.startOffset;
                let clickEnd = clickPosition.endOffset;
                let clickText = "Click " + clickStart + (clickStart === clickEnd ? "" : "->" + clickEnd);

                if (clickStart !== selectStart || clickEnd !== selectEnd) {
                    selectStart = clickStart;
                    selectEnd = clickEnd;
                } else {
                    selectStart = -1;
                    selectEnd = -1;
                }

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

const maxLength = 35;

// Function to update character count label
function updateCharCountLabel() {
    const messageElement = document.getElementById("message");
    const charCountLabel = document.getElementById("charCountLabel");
    const textLength = messageElement.innerText.length;
    charCountLabel.textContent = `${textLength}/${maxLength}`;
}

// Function to limit the text content length and preserve cursor position
function limitTextContentAndPreserveCursor() {
    const messageElement = document.getElementById("message");
    const text = messageElement.innerText;
    if (text.length > maxLength) {
        const currentPosition = window.getSelection().getRangeAt(0).startOffset;
        messageElement.innerText = text.substring(0, maxLength);
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(messageElement.firstChild, Math.min(currentPosition, maxLength));
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
    updateCharCountLabel(); // Update character count label
}


function keyDown(e, func, element) {
    // if (document.getElementById("message").innerText.length>35){
    //     document.getElementById("message").innerText =
    //         document.getElementById("message").innerText.substring(0,35);
    // }
    // Log Keys
    if (agency && originalTranslation !== "") {

        if(e.key != "Enter"){
            if (paraBool) {
                SelfAfterParaBool = true;
            } else {
                SelfBeforeParaBool = true;
            }
        }

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
        if (!shift && originalTranslation == "") {
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


//--------------------------------------------Translation Snapshot History--------------------------------------------//

// const inputElement = document.getElementById('myInput');
let englishMessages = [];
let snapshotTimes = [];

let intervalId;

function addSnapShot(inputElement){
    const inputValue = inputElement.innerText;
    englishMessages.push(inputValue);

    let currentTime = new Date();
    currentTime.setHours(currentTime.getHours() - 4);
    snapshotTimes.push(currentTime.toISOString().slice(0, 19).replace('T', ' '));
    console.log('Snapshots:', englishMessages);
}

// inputElement.addEventListener('focus', () =>
function startSnapshot(inputElement) {
    // Start the interval when the input box is focused
    if (document.activeElement === inputElement) {
        addSnapShot(inputElement)
    }
    intervalId = setInterval(() => {
        if (document.activeElement === inputElement) {
            addSnapShot(inputElement)
        }
    }, 5000); // Every 5 seconds
}

// inputElement.addEventListener('blur', () =>
function stopSnapshot() {
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
            data: {mID: messageID,
                englishMessages: JSON.stringify(englishMessages),
                snapshotTimes: JSON.stringify(snapshotTimes)},
            success: function (data) {
                console.log(data)
                englishMessages = []
                snapshotTimes = [];
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                alert("Status: " + textStatus);
                alert("Error: " + errorThrown);
            }
        });
    }
}

//-------------------------------------------------Download SQL Data--------------------------------------------------//


function downloadConvoData() {
    let sender = document.getElementById("senderID").value
    let to = document.getElementById("receiverID").value
    let trialID = document.getElementById("trialNumber").value
    $.ajax({
        url: 'getConversationLogs.py',
        type: 'POST',
        loading: false,
        dataType: 'json',
        data: {from : sender, to : to, trial: trialID},
        success: function (data) {
            console.log(data)
            const jsonData = JSON.parse(data.Data);
            // Create a worksheet
            const ws = XLSX.utils.json_to_sheet(jsonData);

            // Create a workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "ChatLogs");

            // Generate the Excel file
            XLSX.writeFile(wb, "chat_logs.xlsx");
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus);
            alert("Error: " + errorThrown);
        }
    });
}

//------------------------------------------------Toggle Submit Buttons-----------------------------------------------//

let FIRST_BUTTON_CLICKED = "", FIRST_BUTTON_TIME = "", SECOND_BUTTON_TIME = "";
let FIRST_BUTTON_CHOICE = "", SECOND_BUTTON_CHOICE = "";


function checkSubmitButtons(id){
    const radioButton = document.getElementById(id)

    // ####################
    // Disable other button
    // ####################
    const groupName = radioButton.getAttribute('name');
    const groupRadioButtons = document.querySelectorAll(`input[name="${groupName}"]`);

    groupRadioButtons.forEach((groupRadioButton) => {
        if (groupRadioButton !== radioButton) {
            groupRadioButton.disabled = true;
        }
    });

    // #################
    // Log Time Of Click
    // #################
    let currentTime = new Date();
    currentTime.setHours(currentTime.getHours() - 4);
    let time = currentTime.toISOString().slice(0, 19).replace('T', ' ');

    // ##########################################
    // Check If Both Content and Tone are Clicked
    // ##########################################
    if (FIRST_BUTTON_TIME == "") {
        FIRST_BUTTON_TIME = time
        FIRST_BUTTON_CLICKED = groupName
        FIRST_BUTTON_CHOICE = radioButton.value
    } else if (FIRST_BUTTON_CLICKED != groupName) {
        SECOND_BUTTON_TIME = time
        SECOND_BUTTON_CHOICE = radioButton.value

        submit()
    }

    console.log("FIRST_BUTTON_CLICKED: "+FIRST_BUTTON_CLICKED)
    console.log("FIRST_BUTTON_TIME: "+FIRST_BUTTON_TIME)
    console.log("SECOND_BUTTON_TIME: "+SECOND_BUTTON_TIME)

}