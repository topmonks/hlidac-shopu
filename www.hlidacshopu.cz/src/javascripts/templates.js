import { html } from "lit-html";

export function resultsEmbed(url) {
  const parameters = new URLSearchParams({ url, view: "embed" });
  return html`
    <iframe
      allow="web-share"
      sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation allow-popups"
      class="hs-result__embed"
      src="/app/?${parameters}"
    ></iframe>
  `;
}
