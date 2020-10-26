import * as aws from "@pulumi/aws";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { drop, zipWith, last, head } from "ramda";
import { compareAsc, subDays, eachDayOfInterval } from "date-fns";
import { createShop, ShopError, ShopParams } from "../shops";
import { notFound, response, withCORS } from "../utils";

/**
 * Returns real sale according to EU legislation - Minimum price in 30 days before sale action.
 * Sale action is simply last change in price.
 * @param data Time series of prices
 */
function findPreviousMinPrice(data: DataRow[]) {
  const series: [Date, number][] = data
    .filter(({ currentPrice }) => currentPrice)
    .map(({ currentPrice, date }) => [date, <number>currentPrice]);
  // walk thru price series and find last change in price (we don't care if it is up or down, just change)
  const lastChangeDate = <Date>last(
    zipWith(([_, a], [date, b]) => [a - b, date], drop(1, series), series)
      .filter(([delta]) => Boolean(delta))
      .map(([_, date]) => date)
  );
  // go 30 days back
  let startDate = subDays(lastChangeDate, 30);
  // find lowest price in 30 days interval
  const minPrice = series
    .filter(([date]) => compareAsc(date, startDate) === 1)
    .filter(([date]) => compareAsc(date, lastChangeDate) === -1)
    .filter(([_, price]) => Boolean(price))
    .map(([_, price]) => price)
    .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);
  const currentPrice = series[series.length - 1][1];
  const realDiscount = (minPrice - currentPrice) / minPrice;
  return { minPrice, currentPrice, realDiscount };
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
    const { minPrice, currentPrice, realDiscount } = findPreviousMinPrice(rows);
    // @ts-ignore
    const meta = ({ itemImage, itemName, real_sale, max_price, ...rest }) => ({
      name: itemName,
      imageUrl: itemImage === "null" ? null : itemImage,
      minPrice,
      currentPrice,
      realDiscount,
      ...rest
    });
    const metadata = meta(await shop.getMetadata());
    const data = createDataset(rows);
    return withCORS(["GET", "OPTIONS"])(response({ data, metadata }));
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
