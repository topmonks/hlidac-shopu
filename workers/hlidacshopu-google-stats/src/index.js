import JSON5 from "json5";

export default {
  async fetch(request, env, ctx) {
    if (new URLPattern({ pathname: "/favicon.ico" }).test(request.url)) return new Response(null, { status: 404 });
    const resp = await fetch("https://chrome-stats.com/d/plmlonggbfebcjelncogcnclagkmkikk", {
      "credentials": "include",
      "headers": {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site"
      },
      "method": "GET",
      "mode": "cors"
    });
    return resp;

    const html = await resp.text();
    const { groups } = /data: (?<json>\[.+\]),/gm.exec(html) ?? {};
    if (!groups) {
      console.log(resp.status);
      console.log("no data found");
      console.log({ html });
      return resp;
    }
    const json = JSON5.parse(groups.json);
    const { data } = json?.filter(x => x.data?.extension?.name === "Hlídač Shopů")[0];
    const downloads = data?.extension?.userCount;
    const reviews = data?.extension?.ratingCount;
    return Response.json([
      {
        "@context": "https://schema.org",
        "@type": "InteractionCounter",
        interactionType: "https:/schema.org/InstallAction",
        interactionService: {
          "@type": "WebSite",
          name: "Chrome Web Store",
          url: "https://chrome.google.com/webstore/detail/hl%C3%ADda%C4%8D-shop%C5%AF/plmlonggbfebcjelncogcnclagkmkikk"
        },
        userInteractionCount: downloads,
        subjectOf: {
          "@type": "WebApplication",
          url: "https://www.hlidacshopu.cz/"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "InteractionCounter",
        interactionType: "https:/schema.org/ReviewAction",
        interactionService: {
          "@type": "WebSite",
          name: "Chrome Web Store",
          url: "https://chrome.google.com/webstore/detail/hl%C3%ADda%C4%8D-shop%C5%AF/plmlonggbfebcjelncogcnclagkmkikk"
        },
        userInteractionCount: reviews,
        subjectOf: {
          "@type": "WebApplication",
          url: "https://www.hlidacshopu.cz/"
        }
      }
    ]);
  }
};
