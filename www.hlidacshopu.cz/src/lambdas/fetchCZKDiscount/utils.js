function getFormattedPreviousDate(n) {
  const now = new Date();
  const previousDay = now.setDate(now.getDate() - n);

  const date_ob = new Date(previousDay);
  let day = date_ob.getDate().toString();
  if (day.length === 1) {
    day = "0" + day;
  }
  let month = (date_ob.getMonth() + 1).toString();
  if (month.length === 1) {
    month = "0" + month;
  }
  const year = date_ob.getFullYear();

  return year + "-" + month + "-" + day;
}

module.exports.getFormattedPreviousDate = getFormattedPreviousDate;
