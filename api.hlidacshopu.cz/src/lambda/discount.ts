import { eachDayOfInterval, isAfter, isWithinInterval, subDays } from "date-fns";
import { drop, groupBy, head, last, zipWith } from "ramda";

function euDiscount(lastDiscountDate: Date, series: [Date, number][]) {
  // go 30 days back
  const startDate = subDays(lastDiscountDate, 30);
  // find lowest price in 30 days interval before sale action
  const minPrice = series
    .filter(
      ([date, price]) =>
        Boolean(price) &&
        isWithinInterval(date, { start: startDate, end: lastDiscountDate })
    )
    .map(([, price]) => price)
    .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);
  const [, currentPrice] = <[Date, number]>last(series);
  const realDiscount = (minPrice - currentPrice) / minPrice;
  return {
    minPrice,
    currentPrice,
    realDiscount,
    lastDiscountDate,
    type: "eu-minimum"
  };
}

function commonPriceDifference(
  series: [Date, number][],
  isInInterval: (x: Date) => Boolean
) {
  // find most frequent price in 90 days interval before sale action
  const byPrice = groupBy(([, price]) => price);
  const frequencies = Object.entries(
    byPrice(
      series.filter(([date, price]) => Boolean(price) && isInInterval(date))
    )
  ).map(([price, xs]) => [parseFloat(price), xs.length]);
  // @ts-ignore
  const moreFrequent = (a, b) => (a[1] > b[1] ? a : b);
  const [commonPrice] = frequencies.reduce(moreFrequent, [0, 0]);
  const [, currentPrice] = <[Date, number]>last(series);
  const realDiscount = (commonPrice - currentPrice) / commonPrice;
  return { commonPrice, currentPrice, realDiscount, type: "common-price" };
}

function isEuDiscountApplicable(
  lastIncreaseDate: Date,
  lastDiscountDate: Date,
  isInInterval: (date: Date) => boolean
) {
  if (isInInterval(lastDiscountDate)) {
    return !lastIncreaseDate || isAfter(lastDiscountDate, lastIncreaseDate);
  }
  return false;
}

/**
 * Searches for Sale Action in last 90 days. When there is any, it returns
 * real sale according to EU legislation - Minimum price in 30 days before
 * sale action. Sale action is simply last drop of price without any increase.
 * In other cases it counts discount against common price - most used price
 * in 90 days interval.
 * @param data Time series of prices
 */
export function getRealDiscount(data: DataRow[]) {
  const series: [Date, number][] = data
    .filter(({ currentPrice }) => currentPrice)
    .map(({ currentPrice, date }) => [date, <number>currentPrice]);
  // walk thru price series and find changes
  const changes = zipWith(
    ([, a], [date, b]) => [a - b, date],
    drop(1, series),
    series
  ).filter(([δ]) => Boolean(δ));
  const lastDiscountDate = <Date>(
    last(changes.filter(([δ]) => δ < 0).map(([_, date]) => date))
  );
  const lastIncreaseDate = <Date>(
    last(changes.filter(([δ]) => δ > 0).map(([_, date]) => date))
  );
  function isInLast90Days(date: Date) {
    const end = new Date();
    const start = subDays(end, 90);
    return isWithinInterval(date, { start, end });
  }
  if (
    isEuDiscountApplicable(lastIncreaseDate, lastDiscountDate, isInLast90Days)
  )
    return euDiscount(lastDiscountDate, series);
  return commonPriceDifference(series, isInLast90Days);
}

function parseDate(s: string) {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseData({ json }: any): DataRow[] {
  const data: DataRow[] = JSON.parse(json).map(({ o, c, d }: AllShopsRow) => ({
    currentPrice: c === "" ? null : parseFloat(c),
    originalPrice: o === "" ? null : parseFloat(o),
    date: parseDate(d)
  }));
  const dataMap = new Map(data.map(x => [x.date.getTime(), x]));
  const days = eachDayOfInterval({
    start: <Date>head(data)?.date,
    end: <Date>last(data)?.date
  });
  let prevDay = <DataRow>head(data);
  return days.map(date =>
    Object.assign({}, (prevDay = dataMap.get(date.getTime()) ?? prevDay), {
      date
    })
  );
}

interface AllShopsRow {
  o: string;
  c: string;
  d: string;
}

export interface DataRow {
  currentPrice: number | null;
  originalPrice: number | null;
  date: Date;
}
