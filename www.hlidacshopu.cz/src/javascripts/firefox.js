import { html } from "lit-html";

export function installationGuide() {
  return html`
    <div class="steps mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      <h3>Instalace probíhá ve třech jednoduchých krocích</h3>
    </div>
    <div
      class="step_1 mdc-layout-grid__cell mdc-layout-grid__cell--span-8-tablet"
    >
      <picture>
        <source
          media="screen and (max-width: 479px)"
          srcset="
            https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_380/v1607433114/www.hlidacshopu.cz/search-ff-2.png   1x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_380/v1607433114/www.hlidacshopu.cz/search-ff-2.png 1.5x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_380/v1607433114/www.hlidacshopu.cz/search-ff-2.png   2x
          "
        />
        <source
          media="screen and (min-width: 480px) and (max-width: 839px)"
          srcset="
            https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_740/v1607433114/www.hlidacshopu.cz/search-ff-2.png   1x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_740/v1607433114/www.hlidacshopu.cz/search-ff-2.png 1.5x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_740/v1607433114/www.hlidacshopu.cz/search-ff-2.png   2x
          "
        />
        <source
          media="screen and (min-width: 840px)"
          srcset="
            https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_340/v1607433114/www.hlidacshopu.cz/search-ff-2.png   1x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_340/v1607433114/www.hlidacshopu.cz/search-ff-2.png 1.5x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_340/v1607433114/www.hlidacshopu.cz/search-ff-2.png   2x
          "
        />
        <img
          loading="lazy"
          src="https://res.cloudinary.com/topmonks/image/upload/dpr_auto,q_auto,f_auto,w_auto/v1607433114/www.hlidacshopu.cz/search-ff-2.png"
          alt="Najít Rozšíření - Obrázkový Průvodce"
          width="100%"
        />
      </picture>
      <h3>Najděte rozšíření v&nbsp;obchodě</h3>
      <p class="grey-text">
        Přejděte do
        <a
          href="https://addons.mozilla.org/cs-CZ/firefox/addon/hl%C3%ADda%C4%8D-shop%C5%AF/"
          class="text--purple"
          >obchodu Firefox</a
        >
        na stránku Hlídače Shopů.
      </p>
    </div>
    <div
      class="step_2 mdc-layout-grid__cell mdc-layout-grid__cell--span-8-tablet"
    >
      <picture>
        <source
          media="screen and (max-width: 479px)"
          srcset="
            https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_380/v1607433488/www.hlidacshopu.cz/install-ff-2.png   1x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_380/v1607433488/www.hlidacshopu.cz/install-ff-2.png 1.5x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_380/v1607433488/www.hlidacshopu.cz/install-ff-2.png   2x
          "
        />
        <source
          media="screen and (min-width: 480px) and (max-width: 839px)"
          srcset="
            https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_740/v1607433488/www.hlidacshopu.cz/install-ff-2.png   1x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_740/v1607433488/www.hlidacshopu.cz/install-ff-2.png 1.5x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_740/v1607433488/www.hlidacshopu.cz/install-ff-2.png   2x
          "
        />
        <source
          media="screen and (min-width: 840px)"
          srcset="
            https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_340/v1607433488/www.hlidacshopu.cz/install-ff-2.png   1x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_340/v1607433488/www.hlidacshopu.cz/install-ff-2.png 1.5x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_340/v1607433488/www.hlidacshopu.cz/install-ff-2.png   2x
          "
        />
        <img
          loading="lazy"
          src="https://res.cloudinary.com/topmonks/image/upload/dpr_auto,q_auto,f_auto,w_auto/v1607433488/www.hlidacshopu.cz/install-ff-2.png"
          alt="Instalovat Rozšíření - Obrázkový Průvodce"
          width="100%"
        />
      </picture>
      <h3>Přidejte si rozšíření do prohlížeče</h3>
      <p class="grey-text">Uprostřed klikněte na tlačítko Přidat do Firefoxu</p>
    </div>
    <div
      class="step_3 mdc-layout-grid__cell mdc-layout-grid__cell--span-8-tablet"
    >
      <picture>
        <source
          media="screen and (max-width: 479px)"
          srcset="
            https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_380/v1607433494/www.hlidacshopu.cz/usage-ff-2.png   1x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_380/v1607433494/www.hlidacshopu.cz/usage-ff-2.png 1.5x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_380/v1607433494/www.hlidacshopu.cz/usage-ff-2.png   2x
          "
        />
        <source
          media="screen and (min-width: 480px) and (max-width: 839px)"
          srcset="
            https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_740/v1607433494/www.hlidacshopu.cz/usage-ff-2.png   1x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_740/v1607433494/www.hlidacshopu.cz/usage-ff-2.png 1.5x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_740/v1607433494/www.hlidacshopu.cz/usage-ff-2.png   2x
          "
        />
        <source
          media="screen and (min-width: 840px)"
          srcset="
            https://res.cloudinary.com/topmonks/image/upload/dpr_1,q_auto,f_auto,w_340/v1607433494/www.hlidacshopu.cz/usage-ff-2.png   1x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_1.5,q_auto,f_auto,w_340/v1607433494/www.hlidacshopu.cz/usage-ff-2.png 1.5x,
            https://res.cloudinary.com/topmonks/image/upload/dpr_2,q_auto,f_auto,w_340/v1607433494/www.hlidacshopu.cz/usage-ff-2.png   2x
          "
        />
        <img
          loading="lazy"
          src="https://res.cloudinary.com/topmonks/image/upload/dpr_auto,q_auto,f_auto,w_auto/v1607433494/www.hlidacshopu.cz/usage-ff-2.png"
          alt="Potvrzení instalace - Obrázkový Průvodce"
          width="100%"
        />
      </picture>
      <h3>Potvrďte instalaci rozšíření</h3>
      <p class="grey-text">
        Poté na vás vyskočí okno, kde potvrdíte přidání do Firefoxu tlačítkem
        Přidat.
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
          data-browser="firefox"
          class="button"
          role="button"
          href="https://addons.mozilla.org/cs-CZ/firefox/addon/hl%C3%ADda%C4%8D-shop%C5%AF/"
          >Nainstalovat do prohlížeče</a
        >
      </div>
    </div>
  `;
}
