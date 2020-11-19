export const formatMoney = x =>
  x != null &&
  x
    .toLocaleString("cs", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    .replace(/,00/g, ",-");

export const formatNumber = x => x != null && x.toLocaleString("cs");

export const formatPercents = x =>
  x != null && `${Math.round(100 * x).toLocaleString("cs")} %`;

export const formatDate = x =>
  x != null &&
  x.toLocaleString("cs", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
