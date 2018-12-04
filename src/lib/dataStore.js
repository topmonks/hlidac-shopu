const dateFormat = require("dateformat");

const URL_BASE = "https://tok179mvhf.execute-api.eu-central-1.amazonaws.com/default/fetchData";

const dataStore = {
  async fetchData(url, itemId, title) {
    const dataUrl = `${URL_BASE}?url=` + encodeURIComponent(url) + "&itemId=" + itemId + "&title=" + encodeURIComponent(title);
    console.log(dataUrl);

    const ary = await fetch(dataUrl).then(response => {
      if (!response.ok) {
        throw new Error("HTTP error, status = " + response.status);
      }
      return response.json();
    });

    const dates = ary.map(row => dateFormat(new Date(row['date']), "yyyy-mm-dd"));
    const currentPrices = ary.map(row => row['currentPrice']);
    const originalPrices = ary.map(row => row['originalPrice']);

    return [dates, originalPrices, currentPrices];
  }
}

export default dataStore;
