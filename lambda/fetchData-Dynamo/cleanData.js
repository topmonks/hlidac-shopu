
function getDateFormat(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${date.getFullYear()}-${`${month}`.length == 1 ? '0' + month : month}-${`${day}`.length == 1 ? '0' + day : day}`
}

module.exports = function cleanData(data) {
  const newData = [];
  const lastDate = new Date(data[0].date);
  var lastDateFormat = getDateFormat(lastDate);
  data.forEach(function (element, index) {
    const actualDate = new Date(element.date);
    const actualDateFormat = getDateFormat(actualDate);
    if (actualDateFormat !== lastDateFormat) {
      element.vypadek = element.currentPrice;
      element.originalVypadek = element.originalPrice;
      newData.push(element);
      if(data[index + 1] !== undefined) {
        var nextPotencialDate = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate() + 1);
        var nextPotencialDateFormat = getDateFormat(nextPotencialDate);

        const nextDate = new Date(data[index + 1].date);
        const nextDateFormat = getDateFormat(nextDate);
        if (nextPotencialDate < nextDate) {
          while (nextPotencialDateFormat !== nextDateFormat) {
            const newElement = {date: nextPotencialDateFormat, currentPrice: null, originalPrice: null };
            newData.push(newElement);
            nextPotencialDate = new Date(nextPotencialDate.getFullYear(), nextPotencialDate.getMonth(), nextPotencialDate.getDate() + 1);
            nextPotencialDateFormat = getDateFormat(nextPotencialDate);
          }
        }
        lastDateFormat = actualDateFormat;
      }
    }
  });
  return newData;
}
