var dateFormat = require('dateformat');

var dataStore = {
  async fetchData(url, itemId) {
    const dataUrl = "https://tok179mvhf.execute-api.eu-central-1.amazonaws.com/default/fetchData?url=" + encodeURIComponent(url) + "&itemId=" + itemId;
    console.log(dataUrl);

    const ary = await fetch(dataUrl).then(response => {
      if (!response.ok) {
        throw new Error("HTTP error, status = " + response.status);
      }
      return response.json();
    });

    var dates = ary.map(row => dateFormat(new Date(row['date']), "yyyy-mm-dd"));
    var currentPrices = ary.map(row => row['currentPrice']);
    var originalPrices = ary.map(row => row['originalPrice']);

    return [dates, originalPrices, currentPrices];
  }
}

export default dataStore;
