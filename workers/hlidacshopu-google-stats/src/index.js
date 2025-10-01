import JSON5 from "json5";

export default {
  async fetch(request, env, ctx) {
    const resp = await fetch("https://chrome-stats.com/d/plmlonggbfebcjelncogcnclagkmkikk");
    const html = await resp.text();
    const json = JSON5.parse(/data: (?<json>\[.+]),/gm.exec(html).groups.json);
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
