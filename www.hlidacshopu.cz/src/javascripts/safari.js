import { html } from "lit-html";

export function installationGuide() {
  return html`
    <div class="steps mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      <h3>Instalace probíhá v následujících krocích</h3>
    </div>
    <div
      class="step_1 mdc-layout-grid__cell mdc-layout-grid__cell--span-8-tablet"
    >
      <h3>Najděte rozšíření v&nbsp;App Store</h3>
      <p class="grey-text">
        Přejděte do
        <a
          href="https://apps.apple.com/cz/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734"
          class="text--purple"
          >Apple App Store</a
        >
        na stránku Hlídače Shopů.
      </p>
    </div>
    <div
      class="step_2 mdc-layout-grid__cell mdc-layout-grid__cell--span-8-tablet"
    >
      <h3>Přidejte si rozšíření do prohlížeče</h3>
      <p class="grey-text">
        V pravo klikněte na tlačítko Získat, potom Nainstalovat, potom kliknete
        na ikonku stáhnout, potom na tlačítko Otevřít.
      </p>
    </div>
    <div
      class="step_3 mdc-layout-grid__cell mdc-layout-grid__cell--span-8-tablet"
    >
      <h3>Potvrďte instalaci rozšíření</h3>
      <p class="grey-text">
        Poté na vás vyskočí okno, kde potvrdíte přidání do Safari tlačítkem
        Dokončit nastavení. Poté se vám otevře okno Nastavení v Safari, kde
        musíte povolit Hlídače shopů pomocí zaškrtnutí.
      </p>
    </div>
    <div
      class="final-step mdc-layout-grid__cell mdc-layout-grid__cell--span-12"
    >
      <p>
        <b>A&nbsp;máte hotovo! Skvěle.</b><br />
        Teď už jen stačí přejít do vašeho oblíbeného e-shopu a vesele
        kontrolovat jeho cenotvorbu.
      </p>
      <div class="btn">
        <a
          data-browser="safari"
          class="button"
          role="button"
          href="https://apps.apple.com/cz/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734"
          >Nainstalovat do prohlížeče</a
        >
      </div>
    </div>
  `;
}
