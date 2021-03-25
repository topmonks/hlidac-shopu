import { html } from "lit-html";

export function installationGuide() {
  return html`
    <div class="steps mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      <h3 property="name">Instalace probíhá ve třech jednoduchých krocích</h3>
    </div>
    <div
      property="itemListElement"
      typeof="HowToStep"
      class="step_1 mdc-layout-grid__cell mdc-layout-grid__cell--span-8-tablet"
    >
      <meta property="position" content="1" />
      <div property="itemListElement" typeof="HowToDirection">
        <picture>
          <source
            media="screen and (max-width: 479px)"
            srcset="
              https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_380/v1607433490/www.hlidacshopu.cz/search-2.png   1x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_380/v1607433490/www.hlidacshopu.cz/search-2.png 1.5x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_380/v1607433490/www.hlidacshopu.cz/search-2.png   2x
            "
          />
          <source
            media="screen and (min-width: 480px) and (max-width: 839px)"
            srcset="
              https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_740/v1607433490/www.hlidacshopu.cz/search-2.png   1x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_740/v1607433490/www.hlidacshopu.cz/search-2.png 1.5x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_740/v1607433490/www.hlidacshopu.cz/search-2.png   2x
            "
          />
          <source
            media="screen and (min-width: 840px)"
            srcset="
              https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_340/v1607433490/www.hlidacshopu.cz/search-2.png   1x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_340/v1607433490/www.hlidacshopu.cz/search-2.png 1.5x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_340/v1607433490/www.hlidacshopu.cz/search-2.png   2x
            "
          />
          <img
            property="duringMedia"
            loading="lazy"
            src="https://res.cloudinary.com/topmonks/image/upload/dpr_auto,q_auto,f_auto,w_auto/v1607433490/www.hlidacshopu.cz/search-2.png"
            alt="Najít Rozšíření - Obrázkový Průvodce"
            width="100%"
          />
        </picture>
        <h3 property="text">Najděte rozšíření v&nbsp;obchodě</h3>
        <p class="grey-text">
          Přejděte do
          <a
            href="https://chrome.google.com/webstore/detail/hl%C3%ADda%C4%8D-shop%C5%AF/plmlonggbfebcjelncogcnclagkmkikk"
            class="text--purple"
            >obchodu Chrome</a
          >
          na stránku Hlídače Shopů.
        </p>
      </div>
    </div>
    <div
      property="itemListElement"
      typeof="HowToStep"
      class="step_2 mdc-layout-grid__cell mdc-layout-grid__cell--span-8-tablet"
    >
      <meta property="position" content="2" />
      <div property="itemListElement" typeof="HowToDirection">
        <picture>
          <source
            media="screen and (max-width: 479px)"
            srcset="
              https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_380/v1572515567/www.hlidacshopu.cz/install.png   1x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_380/v1572515567/www.hlidacshopu.cz/install.png 1.5x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_380/v1572515567/www.hlidacshopu.cz/install.png   2x
            "
          />
          <source
            media="screen and (min-width: 480px) and (max-width: 839px)"
            srcset="
              https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_740/v1572515567/www.hlidacshopu.cz/install.png   1x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_740/v1572515567/www.hlidacshopu.cz/install.png 1.5x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_740/v1572515567/www.hlidacshopu.cz/install.png   2x
            "
          />
          <source
            media="screen and (min-width: 840px)"
            srcset="
              https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_340/v1572515567/www.hlidacshopu.cz/install.png   1x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_340/v1572515567/www.hlidacshopu.cz/install.png 1.5x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_340/v1572515567/www.hlidacshopu.cz/install.png   2x
            "
          />
          <img
            loading="lazy"
            property="duringMedia"
            src="https://res.cloudinary.com/topmonks/image/upload/dpr_auto,q_auto,f_auto,w_auto/v1572515567/www.hlidacshopu.cz/install.png"
            alt="Instalovat Rozšíření - Obrázkový Průvodce"
            width="100%"
          />
        </picture>
        <h3 property="text">Přidejte si rozšíření do prohlížeče</h3>
        <p class="grey-text">
          Vpravo nahoře klikněte na tlačítko Přidat do Chromu
        </p>
      </div>
    </div>
    <div
      property="itemListElement"
      typeof="HowToStep"
      class="step_3 mdc-layout-grid__cell mdc-layout-grid__cell--span-8-tablet"
    >
      <meta property="position" content="3" />
      <div property="itemListElement" typeof="HowToDirection">
        <picture>
          <source
            media="screen and (max-width: 479px)"
            srcset="
              https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_380/v1607433494/www.hlidacshopu.cz/usage-2.png   1x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_380/v1607433494/www.hlidacshopu.cz/usage-2.png 1.5x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_380/v1607433494/www.hlidacshopu.cz/usage-2.png   2x
            "
          />
          <source
            media="screen and (min-width: 480px) and (max-width: 839px)"
            srcset="
              https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_740/v1607433494/www.hlidacshopu.cz/usage-2.png   1x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_740/v1607433494/www.hlidacshopu.cz/usage-2.png 1.5x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_740/v1607433494/www.hlidacshopu.cz/usage-2.png   2x
            "
          />
          <source
            media="screen and (min-width: 840px)"
            srcset="
              https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_340/v1607433494/www.hlidacshopu.cz/usage-2.png   1x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_340/v1607433494/www.hlidacshopu.cz/usage-2.png 1.5x,
              https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_340/v1607433494/www.hlidacshopu.cz/usage-2.png   2x
            "
          />
          <img
            loading="lazy"
            property="duringMedia"
            src="https://res.cloudinary.com/topmonks/image/upload/dpr_auto,q_auto,f_auto,w_auto/v1607433494/www.hlidacshopu.cz/usage-2.png"
            alt="Použití Rozšíření - Obrázkový Průvodce"
            width="100%"
          />
        </picture>
        <h3 property="text">Potvrďte instalaci rozšíření</h3>
        <p class="grey-text">
          Poté na vás vyskočí okno, kde potvrdíte přidání do Chromu tlačítkem
          Přidat rozšíření.
        </p>
      </div>
    </div>
    <div
      class="final-step mdc-layout-grid__cell mdc-layout-grid__cell--span-12"
    >
      <div>
        <p>
          <b>A&nbsp;máte hotovo! Skvěle.</b><br />
          Teď už jen stačí přejít do vašeho oblíbeného e-shopu a vesele
          kontrolovat jeho cenotvorbu.
        </p>
        <div class="btn">
          <a
            property="downloadUrl"
            data-browser="chrome"
            class="button"
            role="button"
            href="https://chrome.google.com/webstore/detail/hl%C3%ADda%C4%8D-shop%C5%AF/plmlonggbfebcjelncogcnclagkmkikk"
            >Nainstalovat do prohlížeče</a
          >
        </div>
      </div>
    </div>
  `;
}
