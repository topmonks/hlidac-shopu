import { html } from "lit-html";

export function resultsEmbed(url) {
  const parameters = new URLSearchParams({ url, view: "embed" });
  return html`
    <iframe
      sandbox="allow-same-origin allow-scripts allow-top-navigation allow-popups"
      class="hs-result__embed"
      src="/app/?${parameters}"
    ></iframe>
  `;
}
