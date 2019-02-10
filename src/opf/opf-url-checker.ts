export function getStatusCode(url: string): Promise<string> {
  let query = `{"url": "${url}"}`

  let req = new XMLHttpRequest();
  req.open("POST", "https://2p2ju5ncid.execute-api.eu-west-1.amazonaws.com/prod");
  req.setRequestHeader("Content-Type", "application/json");

  return new Promise<string>((resolve, reject) => {
    req.addEventListener("load", e => {
      resolve(req.responseText);
    });
    req.send(query);
  })
}