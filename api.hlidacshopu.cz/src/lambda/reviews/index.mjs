import { S3Client } from "@aws-sdk/client-s3/dist/es/S3Client.js";
import { GetObjectCommand } from "@aws-sdk/client-s3/dist/es/commands/GetObjectCommand.js";
import { response, withCORS } from "../http.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type {S3Client} */
const s3 = new S3Client({ region: process.env.AWS_REGION });

/**
 * @param {APIGatewayProxyEvent} _event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(_event) {
  const res = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.HS_DATA_BUCKET,
      Key: "app/reviews.jsonld",
      ResponseContentType: "application/jsonld"
    })
  );

  const reviews = JSON.parse(res.Body.toString());

  return withCORS(["GET", "OPTIONS"])(
    response(reviews, {
      "Cache-Control": "max-age=14400",
      "Content-Type": "application/jsonld"
    })
  );
}
