export const formatMoney = x =>
  x
    .toLocaleString("cs", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    .replace(/,00/g, ",-");
export const formatPercents = x =>
  `${Math.round(100 * x).toLocaleString("cs")} %`;
