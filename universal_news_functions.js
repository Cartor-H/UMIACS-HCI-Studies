// Bind a function to the loading of the element with id = historyNav
// This function will call callUniversalFunction("get_nav_state", {userID : userID}, function(data) { ... })
// If data.state == 0 then remove the parent of the element with id = historyNav
// If data.state == 1 then do nothing
function checkReflectionNav() {
    var historyNav = document.getElementById("historyNav");
    let attempts = 0;
    const maxAttempts = 20;

    function attemptCheck() {
        if (historyNav && userID != null && userID != "-1") {
            callUniversalFunction("get_nav_state", {userID: userID}, function (data) {
                data = JSON.parse(data)[0];
                console.log("get_nav_state: ");
                console.log(data);
                console.log("data.Enabled: " + data["Enabled"]);
                if (data["Enabled"] != 1) {
                    historyNav.parentNode.remove();
                }
            });
        } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(attemptCheck, 100); // Retry after 100ms
        }
    }

    attemptCheck();
}

// Bind a function to the loading of the element with id = historyNav
document.addEventListener("DOMContentLoaded", function () {
    var historyNav = document.getElementById("historyNav");
    if (historyNav) {
        checkReflectionNav();
    }
}
);






/**
 * Calls the provided function from the backend with the given data.
 * Then calls callBack(responseData), where responseData is the data returned from the backend.
 * @param {*} functionName 
 * @param {*} data 
 * @param {*} callBack 
 */
function callUniversalFunction(functionName, data, callBack) {
    $.ajax({
        url: `../functions/${functionName}.py`,
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