import * as aws from "@pulumi/aws";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { drop, zipWith, last, head, groupBy } from "ramda";
import {
  isWithinInterval,
  isAfter,
  isBefore,
  subDays,
  eachDayOfInterval
} from "date-fns";
import { createShop, ShopError, ShopParams } from "../shops";
import { notFound, response, withCORS } from "../utils";

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
  return { minPrice, currentPrice, realDiscount, type: "eu-minimum" };
}

function commonPriceDifference(series: [Date, number][]) {
  const today = new Date();
  // go 90 days back
  const startDate = subDays(today, 90);
  // find most frequent price in 90 days interval before sale action
  const byPrice = groupBy(([, price]) => price);
  const frequencies = Object.entries(
    byPrice(
      series.filter(
        ([date, price]) =>
          Boolean(price) &&
          isWithinInterval(date, { start: startDate, end: today })
      )
    )
  ).map(([price, xs]) => [parseFloat(price), xs.length]);
  // @ts-ignore
  const moreFrequent = (a, b) => (a[1] > b[1] ? a : b);
  const [commonPrice] = frequencies.reduce(moreFrequent, [0, 0]);
  const [, currentPrice] = <[Date, number]>last(series);
  const realDiscount = (commonPrice - currentPrice) / commonPrice;
  return { commonPrice, currentPrice, realDiscount, type: "common-price" };
}

/**
 * Returns real sale according to EU legislation - Minimum price in 30 days before sale action.
 * Sale action is simply last drop of price. After sale action end, we will use
 * most common price 90 days before sale.
 * @param data Time series of prices
 */
function getDiscount(data: DataRow[]) {
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
  if (!lastIncreaseDate || isAfter(lastDiscountDate, lastIncreaseDate))
    return euDiscount(lastDiscountDate, series);
  return commonPriceDifference(series);
}

function parseDate(s: string) {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

function createDataset(data: DataRow[]) {
  const dataMap = new Map(data.map(x => [x.date.getTime(), x]));
  const days = eachDayOfInterval({
    start: <Date>head(data)?.date,
    end: <Date>last(data)?.date
  });
  const originalPrice = new Array(days.length);
  const currentPrice = new Array(days.length);
  let prevDay = head(data);

  days.forEach((day, i) => {
    const item = (prevDay = dataMap.get(day.getTime()) ?? prevDay);
    originalPrice[i] = {
      x: day,
      y: item?.originalPrice
    };
    currentPrice[i] = {
      x: day,
      y: item?.currentPrice
    };
  });

  return { originalPrice, currentPrice };
}

function parseData(res: any): DataRow[] {
  return JSON.parse(res.Item.json).map(({ o, c, d }: AllShopsRow) => ({
    currentPrice: c === "" ? null : parseFloat(c),
    originalPrice: o === "" ? null : parseFloat(o),
    date: parseDate(d)
  }));
}

interface AllShopsRow {
  o: string;
  c: string;
  d: string;
}

interface DataRow {
  currentPrice: number | null;
  originalPrice: number | null;
  date: Date;
}

export async function handler(event: Request): Promise<Response> {
  try {
    const params = (<unknown>(event.queryStringParameters || {})) as ShopParams;
    if (!params.url) {
      return withCORS(["GET", "OPTIONS"])({
        statusCode: 400,
        body: JSON.stringify({ error: "Missing url parameter" })
      });
    }

    const db = new aws.sdk.DynamoDB.DocumentClient();
    const shop = createShop(params, db);
    if (!shop) {
      return withCORS(["GET", "OPTIONS"])(notFound());
    }

    const query = {
      Key: { "p_key": await shop.pkey() },
      TableName: "all_shops"
    };
    const res = await db.get(query).promise();
    if (!res.Item) {
      return withCORS(["GET", "OPTIONS"])(notFound());
    }

    const rows = parseData(res);
    const discount = getDiscount(rows);
    // @ts-ignore
    const meta = ({ itemImage, itemName, real_sale, max_price, ...rest }) => ({
      name: itemName,
      imageUrl: itemImage === "null" ? null : itemImage,
      ...discount,
      ...rest
    });
    const metadata = meta(await shop.getMetadata());
    const data = createDataset(rows);
    return withCORS(["GET", "OPTIONS"])(
      response({ data, metadata }, { "Cache-Control": "max-age=3600" })
    );
  } catch (error) {
    if (error instanceof ShopError) {
      const { message } = error;
      return withCORS(["GET", "OPTIONS"])(
        notFound({ data: [], metadata: { "error": message } })
      );
    } else {
      throw error;
    }
  }
}
