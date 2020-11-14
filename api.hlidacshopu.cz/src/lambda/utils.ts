import { Response } from "@pulumi/awsx/apigateway";

export function movedPermanently(location: string): Response {
  return {
    statusCode: 301,
    headers: { "Location": location },
    body: ""
  };
}

export function notFound(
  body: Record<string, unknown> = { error: "Data not found" }
): Response {
  return {
    statusCode: 404,
    body: JSON.stringify(body)
  };
}

export function response(
  body: Record<string, unknown> | string,
  headers?: {
    [header: string]: boolean | number | string;
  }
): Response {
  return {
    statusCode: 200,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers
  };
}

export function withCORS(methods: string | string[], origin = "*") {
  const allowMethods = Array.isArray(methods) ? methods.join(",") : methods;
  return (x: any) => ({
    ...x,
    headers: {
      ...x.headers,
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": allowMethods,
      "Access-Control-Allow-Headers":
        "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token"
    }
  });
}
