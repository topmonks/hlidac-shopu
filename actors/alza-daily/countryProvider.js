export default function getCountry(input) {
  const proxies = [
    "HUNGARY",
    "CZECH_LUMINATI",
    "GERMANY",
    "FRANCE",
    "ITALY",
    "SPAIN"
  ];
  switch (input) {
    case "DE":
      return {
        baseUrl: "https://www.alza.de",
        regex: /(https?:\/\/www\.alza\.de[^.]*\.htm)/gm,
        currency: "EUR",
        proxies
      };
    case "HU":
      return {
        baseUrl: "https://www.alza.hu",
        regex: /(https?:\/\/www\.alza\.hu[^.]*\.htm)/gm,
        currency: "HUF",
        proxies
      };
    case "AT":
      return {
        baseUrl: "https://www.alza.at",
        regex: /(https?:\/\/www\.alza\.at[^.]*\.htm)/gm,
        currency: "EUR",
        proxies
      };
    case "UK":
      return {
        baseUrl: "https://www.alza.co.uk",
        regex: /(https?:\/\/www\.alza\.co\.uk[^.]*\.htm)/gm,
        currency: "GBP",
        proxies
      };
    case "SK":
      return {
        baseUrl: "https://www.alza.sk",
        regex: /(https?:\/\/www\.alza\.sk[^.]*\.htm)/gm,
        currency: "EUR",
        proxies
      };
    case "CZ":
      return {
        baseUrl: "https://www.alza.cz",
        regex: /(https?:\/\/www\.alza\.cz[^.]*\.htm)/gm,
        currency: "CZK",
        proxies
      };
    default:
      throw new Error(`Country code "${input}" is invalid`);
  }
}
