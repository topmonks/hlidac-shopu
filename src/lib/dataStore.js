const dateFormat = require("dateformat");

const URL_BASE = "https://tok179mvhf.execute-api.eu-central-1.amazonaws.com/default/fetchData";

export async function fetchData(url, itemId, title) {
  const dataUrl = `${URL_BASE}?url=` + encodeURIComponent(url) + "&itemId=" + itemId + "&title=" + encodeURIComponent(title);
  console.log(dataUrl);

  return fetch(dataUrl).then(response => {
    if (!response.ok) {
      throw new Error("HTTP error, status = " + response.status);
    }
    return response.json();
  });
}
