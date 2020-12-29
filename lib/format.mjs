/**
 * @param {number | null} x Number to be formatted
 * @return {string | null}
 */
export const formatMoney = x =>
  x != null
    ? x
        .toLocaleString("cs", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
        .replace(/,00/g, ",-")
    : null;

/**
 * @param {number | null} x Number to be formatted
 * @return {string | null}
 */
export const formatNumber = x => (x != null ? x.toLocaleString("cs") : null);

/**
 * @param {number | null} x Number to be formatted
 * @returns {string | null}
 */
export const formatPercents = x =>
  x != null ? `${Math.round(100 * x).toLocaleString("cs")} %` : null;

/**
 * @param {Date | null} x Date to be formatted
 * @returns {string | null}
 */
export const formatDate = x =>
  x != null
    ? x.toLocaleString("cs", {
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    : null;

/**
 * @param {Date | null} x Date to be formatted
 * @return {string | null}
 */
export const formatShortDate = x =>
  x != null
    ? x.toLocaleDateString("cs", {
        day: "numeric",
        month: "numeric"
      })
    : null;
