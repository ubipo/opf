export function getStatusCode(url) {
    var query = "{\"url\": \"" + url + "\"}";
    var req = new XMLHttpRequest();
    req.open("POST", "https://2p2ju5ncid.execute-api.eu-west-1.amazonaws.com/prod");
    req.setRequestHeader("Content-Type", "application/json");
    return new Promise(function (resolve, reject) {
        req.addEventListener("load", function (e) {
            resolve(req.responseText);
        });
        req.send(query);
    });
}
//# sourceMappingURL=opf-url-checker.js.map