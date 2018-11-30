var dateFormat = require('dateformat');

var dataStore = {
  async fetchData(url) {
    const dataUrl = "https://vf1kcli7jg.execute-api.eu-central-1.amazonaws.com/default/fetchData?data=" + encodeURIComponent(url);
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
