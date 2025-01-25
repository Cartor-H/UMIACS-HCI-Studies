function changeLanguage() {
    let mandarin = document.getElementById("nav2").classList.contains("active") ?
        false : document.getElementById("mandarin3").checked;
    document.getElementById("agency3").checked = mandarin;
    document.getElementById("left3").checked = mandarin;
    document.getElementById("right3").checked = mandarin;
}

let NAV_SECTION = 0

function changeLink() {
    let senderID = document.getElementById("senderID3").value
    let receiverID = document.getElementById("receiverID3").value
    let trialNum = document.getElementById("trialNumber3").value
    let editable = document.getElementById("editableSwitch3").checked
    let watching = document.getElementById("watchBtn").checked

    if(senderID!=""&&receiverID!=""&&trialNum!="") {
        console.log("None Empty")
        if(document.getElementById("nav1").classList.contains("active")){
            NAV_SECTION = 1
            document.getElementById("link").value =
                `1/?to=${receiverID}&from=${senderID}&trial=${trialNum}${(editable?"&editable":"")}&${(watching?"&watchingMode":"")}`;
            document.getElementById("go").href =
                document.getElementById("link").value;
            return;
        }

        let language = document.querySelector('input[name="language3"]:checked').value;

        let left = document.getElementById("left3").checked
        let right = document.getElementById("right3").checked

        let biLing = "none"
        if(left && right){
            biLing = "both"
        } else if (left) {
            biLing = "left"
        } else if (right) {
            biLing = "right"
        }

        if(document.getElementById("nav2").classList.contains("active")){
            NAV_SECTION = 2
            document.getElementById("link").value =
                `2/?to=${receiverID}&from=${senderID}&trial=${trialNum}${(editable?"&editable":"")}&lang=${language}&bi-ling=${biLing}&${(watching?"&watchingMode":"")}`;
            document.getElementById("go").href =
                document.getElementById("link").value;
            return;
        }

        let agency = document.getElementById("agency3").checked

        if(document.getElementById("nav3").classList.contains("active")){
            NAV_SECTION = 3
            document.getElementById("link").value =
                `3/?to=${receiverID}&from=${senderID}&trial=${trialNum}${(editable?"&editable":"")}&lang=${language}`+
                `&bi-ling=${biLing}&${(watching?"&watchingMode":"")}`+(agency?"&agency":"");
            document.getElementById("go").href =
                document.getElementById("link").value;
        }

        if(document.getElementById("nav4").classList.contains("active")){
            NAV_SECTION = 4
            document.getElementById("link").value =
                `4/?to=${receiverID}&from=${senderID}&trial=${trialNum}${(editable?"&editable":"")}&lang=${language}`+
                `&bi-ling=${biLing}&${(watching?"&watchingMode":"")}`+(agency?"&agency":"");
            document.getElementById("go").href =
                document.getElementById("link").value;
        }

        if(document.getElementById("nav5").classList.contains("active")){
            document.getElementById("link").value =
                `5/?to=${receiverID}&from=${senderID}&trial=${trialNum}${(editable?"&editable":"")}&lang=${language}`+
                `&bi-ling=${biLing}&${(watching?"&watchingMode":"")}`+(agency?"&agency":"");
            document.getElementById("go").href =
                document.getElementById("link").value;
        }

        if(document.getElementById("nav6").classList.contains("active")){
            document.getElementById("link").value =
                `6/?to=${receiverID}&from=${senderID}&trial=${trialNum}${(editable?"&editable":"")}&lang=${language}`+
                `&bi-ling=${biLing}&${(watching?"&watchingMode":"")}`+(agency?"&agency":"");
            document.getElementById("go").href =
                document.getElementById("link").value;
        }

        if(document.getElementById("nav7").classList.contains("active")){
            document.getElementById("link").value =
                `7/?to=${receiverID}&from=${senderID}&trial=${trialNum}${(editable?"&editable":"")}&lang=${language}`+
                `&bi-ling=${biLing}&${(watching?"&watchingMode":"")}`+(agency?"&agency":"");
            document.getElementById("go").href =
                document.getElementById("link").value;
        }
    }
}

// document.getElementsByTagName("input").

function show1() {
    NAV_SECTION = 1
    $('.nav-link').removeClass("active");
    $('#nav1').addClass("active");

    $('#language').collapse('hide');
    $('#language').collapse('hide');
    $('#bilingual').collapse('hide');
    $('#agencyBox').collapse('hide');
    changeLanguage()
    changeLink()
}

function show2() {
    NAV_SECTION = 2
    $('.nav-link').removeClass("active");
    $('#nav2').addClass("active");

    $('#language').collapse('show');
    $('#bilingual').collapse('show');
    $('#agencyBox').collapse('hide');
    changeLanguage()
    changeLink()
}

function show3() {
    NAV_SECTION = 3
    $('.nav-link').removeClass("active");
    $('#nav3').addClass("active");

    $('#language').collapse('show')
    $('#bilingual').collapse('show');
    $('#agencyBox').collapse('show');
    changeLanguage()
    changeLink()
}

function show4() {
    NAV_SECTION = 4
    $('.nav-link').removeClass("active");
    $('#nav4').addClass("active");

    $('#language').collapse('show')
    $('#bilingual').collapse('show');
    $('#agencyBox').collapse('show');
    changeLanguage()
    changeLink()
}

function show5() {
    NAV_SECTION = 5
    $('.nav-link').removeClass("active");
    $('#nav5').addClass("active");

    $('#language').collapse('show')
    $('#bilingual').collapse('show');
    $('#agencyBox').collapse('show');
    changeLanguage()
    changeLink()
}

function show6() {
    NAV_SECTION = 6
    $('.nav-link').removeClass("active");
    $('#nav6').addClass("active");

    $('#language').collapse('show')
    $('#bilingual').collapse('show');
    $('#agencyBox').collapse('show');
    changeLanguage()
    changeLink()
}

function show7() {
    NAV_SECTION = 7
    $('.nav-link').removeClass("active");
    $('#nav7').addClass("active");

    $('#language').collapse('show')
    $('#bilingual').collapse('show');
    $('#agencyBox').collapse('show');
    changeLanguage()
    changeLink()
}

function load() {
    $(':input').on('change', changeLink())

    let sse = new EventSource(`https://system-fai-im.info:8080/watch`);
    sse.onmessage = console.log;
    sse.onmessage = (event) => {
        if(event.data!=null){
            let data = JSON.parse(event.data);
            console.log(data);
            if(data){
                if((data.action === "remove" || data.action === "change") && document.getElementById(data.name)!=null){
                    console.log("")
                    document.getElementById(data.name).remove()
                }

                if((data.action === "add" || data.action === "change") && document.getElementById(data.name)==null){
                    let alert =
                        `<div id="${data.name}" class="alert ${(data.connected)? "alert-success" : "alert-danger"} alert-dismissible fade show p-2 mt-0 mb-2 ms-2 me-2 flex-shrink-1 d-flex align-items-center" id="WaitingAlert" role="alert">
                        <svg class="bi bi-check-circle-fill flex-shrink-0 me-2" viewBox="0 0 16 16" fill="currentColor" width="24" height="24" role="img" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        ${data.name} is ${(data.connected)? "connected to" : "wating for"} ${data.partnerName} in condition ${data.condition}
                    </div>`
                    document.getElementById((data.connected)? "alertConnected" : "alertNotConnected").innerHTML += alert;
                }
            }

            // if(dataJSON["connected"] && dataJSON["startTime"]){
            //     console.log("Start Clock")
            //     startTime = dataJSON["startTime"];
            //     document.getElementById("alerts").innerHTML =
            //         '<div class="alert alert-success alert-dismissible fade show p-2 mt-0 mb-2 ms-2 me-2 flex-shrink-1 d-flex align-items-center" id="ConnectedAlert" role="alert">\n' +
            //         '  <svg class="bi bi-check-circle-fill flex-shrink-0 me-2" viewBox="0 0 16 16" fill="currentColor" width="24" height="24" role="img" xmlns="http://www.w3.org/2000/svg">\n' +
            //         '     <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>\n' +
            //         '  </svg>\n' +
            //         '  Both people have joined the room.\n' +
            //         '  <!-- <button type="button" class="btn-close flex-shrink-0" style="padding: 12px" data-bs-dismiss="alert" aria-label="Close"></button> -->\n' +
            //         '</div>'
            //     updateClock();
            // }
            //
            // //------------------------------------------------------------------------Local Response To Notice Of Typing
            // if(dataJSON["Status"]!=null){
            //     if(dataJSON["Status"]=="Start"){
            //         document.getElementById("typingAlert").hidden = false
            //     } else {
            //         document.getElementById("typingAlert").hidden = true
            //     }
            // }
            //
            // //-----------------------------------------------------------------------------Local Response To New Message
            // if(dataJSON["message"]!=null){
            //     const {to, message} = dataJSON;
            //     // if (to == document.getElementById("senderID").value) {
            //     addMessageLeft(message);
            //     scrollBottom();
            //     // }
            // }
        }
    }
}


function downloadData(){
    // let sender = document.getElementById("senderID3").value
    // let to = document.getElementById("receiverID3").value
    let trialID = document.getElementById("trialNumber3").value

    if(NAV_SECTION!=0 && trialID!=""){ // && to!="" && sender!=""
        $.ajax({
            url: 'getData.py',
            type: 'POST',
            loading: false,
            dataType: 'json',
            data: {database : NAV_SECTION, trial: trialID},
            success: function (data) {
                console.log(data);
                const jsonData = data // JSON.parse(data);

                // Create a workbook
                const wb = XLSX.utils.book_new();

                // console.log([jsonData["Message_History"]["Headers"]].concat(jsonData["Message_History"]["Data"]))
                // console.log([jsonData["Edit_History"]["Headers"]].concat(jsonData["Edit_History"]["Data"]))
                // console.log([jsonData["Snapshot_History"]["Headers"]].concat(jsonData["Snapshot_History"]["Data"]))
                // Add the first sheet

                for (let tableName in jsonData) {
                    console.log([jsonData[tableName]["Headers"]].concat(jsonData[tableName]["Data"]))

                    let wsTemp = XLSX.utils.json_to_sheet([])
                    XLSX.utils.sheet_add_aoa(wsTemp, [jsonData[tableName]["Headers"]]);
                    XLSX.utils.sheet_add_json(wsTemp, jsonData[tableName]["Data"], { origin: 'A2', skipHeader: true });
                    XLSX.utils.book_append_sheet(wb, wsTemp, tableName);
                }

                // const ws1 = XLSX.utils.json_to_sheet([])
                // XLSX.utils.sheet_add_aoa(ws1, [jsonData["Message_History"]["Headers"]]);
                // XLSX.utils.sheet_add_json(ws1, jsonData["Message_History"]["Data"], { origin: 'A2', skipHeader: true });
                // XLSX.utils.book_append_sheet(wb, ws1, "Message_History");
                //
                // const ws2 = XLSX.utils.json_to_sheet([])
                // XLSX.utils.sheet_add_aoa(ws2, [jsonData["Edit_History"]["Headers"]]);
                // XLSX.utils.sheet_add_json(ws2, jsonData["Edit_History"]["Data"], { origin: 'A2', skipHeader: true });
                // XLSX.utils.book_append_sheet(wb, ws2, "Edit_History");
                //
                // const ws3 = XLSX.utils.json_to_sheet([])
                // XLSX.utils.sheet_add_aoa(ws3, [jsonData["Snapshot_History"]["Headers"]]);
                // XLSX.utils.sheet_add_json(ws3, jsonData["Snapshot_History"]["Data"], { origin: 'A2', skipHeader: true });
                // XLSX.utils.book_append_sheet(wb, ws3, "Snapshot_History");

                // const ws1 = XLSX.utils.json_to_sheet([jsonData["Message_History"]["Headers"]].concat(jsonData["Message_History"]["Data"])); // Assuming the first JSON data corresponds to the first sheet
                // XLSX.utils.book_append_sheet(wb, ws1, "Message_History");
                //
                // // Add the second sheet
                // const ws2 = XLSX.utils.json_to_sheet([jsonData["Edit_History"]["Headers"]].concat(jsonData["Edit_History"]["Data"])); // Assuming the second JSON data corresponds to the second sheet
                // XLSX.utils.book_append_sheet(wb, ws2, "Edit_History");
                //
                // // Add the third sheet
                // const ws3 = XLSX.utils.json_to_sheet([jsonData["Snapshot_History"]["Headers"]].concat(jsonData["Snapshot_History"]["Data"])); // Assuming the third JSON data corresponds to the third sheet
                // XLSX.utils.book_append_sheet(wb, ws3, "Snapshot_History");

                // Generate the Excel file
                XLSX.writeFile(wb, `trial_${trialID}_data.xlsx`);
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                alert("Status: " + textStatus);
                alert("Error: " + errorThrown);
            }
        });
    }
}