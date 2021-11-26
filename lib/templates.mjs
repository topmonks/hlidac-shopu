import { css } from "@lit/reactive-element/css-tag.js";
import { html, svg } from "lit-html";
import { directive, Directive } from "lit-html/directive.js";
import { classMap } from "lit-html/directives/class-map.js";
import { repeat } from "lit-html/directives/repeat.js";
import { chartTemplate, defineStyles as chartStyles } from "./chart.mjs";
import { formatMoney, formatPercents } from "./format.mjs";
import { shops } from "./shops.mjs";

export const when = directive(
  class extends Directive {
    render(condition, trueContentProvider) {
      if (condition) return trueContentProvider();
    }
  }
);

function widgetStyles() {
  return css`
    #hlidacShopu {
      font-family: "bc-novatica-cyr", sans-serif;
      font-kerning: normal;
      font-variant-numeric: lining-nums;
      -webkit-text-size-adjust: 100%;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
      font-size: 13px;
      text-align: left;
      color: #000;
      background-color: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 14px;
      padding: 8px;
      clear: both;
    }

    #hlidacShopu * {
      font-family: inherit;
    }

    .hs-header {
      background: #fff;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      margin-bottom: 8px;
      position: static;
      width: initial;
    }

    .hs-header > :first-child {
      flex-grow: 3;
      margin-left: 8px;
      margin-bottom: 8px;
    }

    .hs-header .hs-logo {
      margin-top: 8px;
      margin-right: 16px;
    }

    .hs-header .hs-logo svg {
      transform: translateY(4px);
    }

    .hs-footer {
      display: flex;
      justify-content: space-between;
      padding-bottom: initial;
      margin-top: 16px;
      margin-bottom: initial;
      background: initial;
      width: initial;
    }

    .hs-footer div {
      font-size: 12px;
      color: #979797;
    }

    .hs-footer a {
      color: #545fef;
    }

    .hs-original-price {
      margin-top: 1px;
      line-height: 1.6;
    }

    .hs-original-price b {
      color: #ca0505;
      font-size: 16px;
      font-weight: 700;
    }
    .hs-header__discount {
      align-self: flex-start;
      flex-grow: 2;
    }

    .hs-real-discount {
      background-color: #ffe607;
      color: #1d3650;
      border-radius: 4px;
      text-align: center;
      line-height: 1.4;
      padding: 6px 10px 6px;
    }

    .hs-real-discount a {
      color: #1d3650;
      text-decoration: underline;
    }

    .hs-real-discount.hs-real-discount--good {
      background-color: #5dbd2f;
      color: #fff;
    }

    .hs-real-discount.hs-real-discount--neutral {
      background-color: #f7f7ff;
    }

    .hs-real-discount.hs-real-discount--negative {
      background-color: #ca0505;
      color: #fff;
    }
    .hs-real-discount.hs-real-discount--good a:visited,
    .hs-real-discount.hs-real-discount--good a:link,
    .hs-real-discount.hs-real-discount--negative a:visited,
    .hs-real-discount.hs-real-discount--negative a:link {
      color: #fff;
    }

    .hs-real-discount.hs-real-discount--no-data {
      display: none;
    }

    .hs-real-discount b {
      font-size: 2em;
      line-height: 1.2;
      font-weight: 700;
      display: block;
    }

    .hs-claimed-discount {
      line-height: 1.6;
      text-align: center;
    }

    ${chartStyles()}
  `;
}

const logo = svg`
  <svg
    width="184"
    height="29"
    viewBox="0 0 184 29"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Hlídačshopů.cz</title>
    <path
      d="M38.2236 7.38201V20H41.5176V15.158H46.6116V20H49.9056V7.38201H46.6116V12.53H41.5176V7.38201H38.2236Z"
      fill="black"
    />
    <path
      d="M52.4464 6.64401V20H55.6504V6.64401H52.4464Z"
      fill="black"
    />
    <path
      d="M60.1184 6.14001L58.1924 9.23601H60.6224L62.9804 7.14801L60.1184 6.14001ZM58.1924 10.262V20H61.3784V10.262H58.1924Z"
      fill="black"
    />
    <path
      d="M70.459 6.64401V11.54C69.775 10.658 68.767 10.154 67.507 10.154C64.825 10.154 63.043 12.116 63.043 15.086C63.043 18.11 64.843 20.126 67.579 20.126C68.803 20.126 69.793 19.64 70.459 18.74V20H73.663V6.64401H70.459ZM68.371 17.606C67.111 17.606 66.265 16.616 66.265 15.176C66.265 13.736 67.111 12.746 68.371 12.746C69.613 12.746 70.459 13.718 70.459 15.176C70.459 16.616 69.613 17.606 68.371 17.606Z"
      fill="black"
    />
    <path
      d="M80.5844 10.136C78.9824 10.136 77.5784 10.514 76.0484 11.198L76.9304 13.358C77.9744 12.854 79.0364 12.584 79.8464 12.584C81.0704 12.584 81.7004 13.124 81.7004 14.042V14.15H79.1624C76.7504 14.186 75.4364 15.248 75.4364 17.102C75.4364 18.884 76.6784 20.144 78.7664 20.144C80.0804 20.144 81.0704 19.712 81.7004 18.902V20H84.8504V13.664C84.8324 11.432 83.2664 10.136 80.5844 10.136ZM79.7564 17.966C78.9284 17.966 78.4424 17.534 78.4424 16.868C78.4424 16.184 78.8924 15.86 79.7924 15.86H81.7004V16.706C81.5024 17.444 80.7104 17.966 79.7564 17.966Z"
      fill="black"
    />
    <path
      d="M87.3989 6.28401L89.5949 9.27201H92.3669L94.5629 6.28401H92.0789L90.9809 7.92201L89.8829 6.28401H87.3989ZM93.2849 13.808L95.6069 12.458C94.7609 11 93.2129 10.154 91.2509 10.154C88.2269 10.154 86.2109 12.152 86.2109 15.176C86.2109 18.146 88.2089 20.108 91.2149 20.108C93.2849 20.108 94.8689 19.262 95.6429 17.768L93.2849 16.418C92.8889 17.174 92.2229 17.516 91.3769 17.516C90.2249 17.516 89.4329 16.58 89.4329 15.158C89.4329 13.754 90.2249 12.8 91.3769 12.8C92.2049 12.8 92.8529 13.178 93.2849 13.808Z"
      fill="black"
    />
    <path
      d="M103.608 13.34L104.688 11.252C103.464 10.514 102.042 10.118 100.638 10.118C98.3524 10.118 96.6424 11.234 96.6424 13.268C96.6424 16.634 101.664 15.968 101.664 17.3C101.664 17.696 101.232 17.894 100.638 17.894C99.5584 17.894 98.2984 17.462 97.1824 16.688L96.1744 18.758C97.3624 19.676 98.9284 20.144 100.566 20.144C102.942 20.144 104.688 19.01 104.688 17.012C104.706 13.628 99.5944 14.24 99.5944 12.962C99.5944 12.548 99.9724 12.35 100.512 12.35C101.304 12.35 102.402 12.71 103.608 13.34Z"
      fill="black"
    />
    <path
      d="M112.925 10.136C111.503 10.136 110.387 10.73 109.703 11.846V6.64401H106.499V20H109.703V15.194C109.703 13.916 110.423 13.016 111.611 12.998C112.637 12.998 113.267 13.682 113.267 14.78V20H116.471V13.862C116.471 11.576 115.067 10.136 112.925 10.136Z"
      fill="black"
    />
    <path
      d="M123.144 10.154C119.94 10.154 117.834 12.134 117.834 15.122C117.834 18.128 119.94 20.108 123.144 20.108C126.348 20.108 128.472 18.128 128.472 15.122C128.472 12.134 126.348 10.154 123.144 10.154ZM123.144 12.746C124.404 12.746 125.25 13.718 125.25 15.176C125.25 16.616 124.404 17.588 123.144 17.588C121.902 17.588 121.056 16.616 121.056 15.176C121.056 13.718 121.902 12.746 123.144 12.746Z"
      fill="black"
    />
    <path
      d="M136.26 10.154C135.054 10.154 134.082 10.64 133.398 11.522V10.262H130.194V23.492H133.398V18.74C134.082 19.622 135.09 20.108 136.332 20.108C139.032 20.108 140.796 18.146 140.796 15.176C140.796 12.152 138.978 10.154 136.26 10.154ZM135.468 17.516C134.244 17.516 133.398 16.544 133.398 15.104C133.398 13.664 134.244 12.674 135.468 12.674C136.728 12.674 137.574 13.664 137.574 15.104C137.574 16.544 136.728 17.516 135.468 17.516Z"
      fill="black"
    />
    <path
      d="M147.106 9.65001C148.312 9.65001 149.284 8.67801 149.284 7.49001C149.284 6.28401 148.312 5.31201 147.106 5.31201C145.9 5.31201 144.928 6.28401 144.928 7.49001C144.928 8.67801 145.9 9.65001 147.106 9.65001ZM147.106 6.59001C147.61 6.59001 148.024 6.98601 148.024 7.49001C148.024 7.97601 147.61 8.37201 147.106 8.37201C146.602 8.37201 146.188 7.97601 146.188 7.49001C146.188 6.98601 146.602 6.59001 147.106 6.59001ZM148.744 10.262V15.068C148.744 16.346 148.06 17.246 146.926 17.264C145.972 17.264 145.36 16.598 145.36 15.5V10.262H142.156V16.418C142.156 18.686 143.524 20.144 145.63 20.144C147.016 20.126 148.078 19.55 148.744 18.416V20H151.948V10.262H148.744Z"
      fill="black"
    />
    <path
      d="M156.53 16.876C155.63 16.876 155 17.506 155 18.424C155 19.342 155.63 19.99 156.53 19.99C157.43 19.99 158.078 19.342 158.078 18.424C158.078 17.506 157.43 16.876 156.53 16.876Z"
      fill="#545FEF"
    />
    <path
      d="M166.252 13.654L168.574 12.304C167.728 10.846 166.18 10 164.218 10C161.194 10 159.178 11.998 159.178 15.022C159.178 17.992 161.176 19.954 164.182 19.954C166.252 19.954 167.836 19.108 168.61 17.614L166.252 16.264C165.856 17.02 165.19 17.362 164.344 17.362C163.192 17.362 162.4 16.426 162.4 15.004C162.4 13.6 163.192 12.646 164.344 12.646C165.172 12.646 165.82 13.024 166.252 13.654Z"
      fill="#545FEF"
    />
    <path
      d="M169.628 10.108V12.574H174.146L169.466 17.902V19.846H178.34V17.398H173.48L178.16 12.07V10.126L169.628 10.108Z"
      fill="#545FEF"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M2.03844 8.18182H27.9616C29.0874 8.18182 30 9.10711 30 10.2284V11.5898C30 12.6987 29.12 13.6016 28.0251 13.6354L25.8605 23.376C25.5456 24.7934 24.1637 25.9091 22.7147 25.9091H21.1435H9H7.42889C5.97984 25.9091 4.59798 24.7934 4.28302 23.376L2.11865 13.6364H2.03844C0.912639 13.6364 0 12.7111 0 11.5898V10.2284C0 9.09811 0.914221 8.18182 2.03844 8.18182ZM9.97322 24.5455H20.1703H22.7147C23.5228 24.5455 24.3527 23.8754 24.5294 23.0802L26.628 13.6364H3.51555L5.61418 23.0802C5.79088 23.8754 6.62079 24.5455 7.42889 24.5455H9.97322ZM1.36364 11.5898C1.36364 11.9632 1.67099 12.2727 2.03844 12.2727H27.9616C28.3322 12.2727 28.6364 11.9675 28.6364 11.5898V10.2284C28.6364 9.85498 28.329 9.54545 27.9616 9.54545H2.03844C1.66785 9.54545 1.36364 9.85072 1.36364 10.2284V11.5898Z"
      fill="#545FEF"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M14.0987 1.18282C14.3754 0.927412 14.3927 0.496054 14.1373 0.219358C13.8819 -0.0573381 13.4505 -0.0745924 13.1738 0.180819L4.31018 8.36264C4.03348 8.61805 4.01623 9.04941 4.27164 9.3261C4.52705 9.6028 4.95841 9.62005 5.23511 9.36464L14.0987 1.18282Z"
      fill="#545FEF"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M16.8259 0.180819C16.5492 -0.0745924 16.1179 -0.0573381 15.8625 0.219358C15.607 0.496054 15.6243 0.927412 15.901 1.18282L24.7646 9.36464C25.0413 9.62005 25.4727 9.6028 25.7281 9.3261C25.9835 9.04941 25.9663 8.61805 25.6896 8.36264L16.8259 0.180819Z"
      fill="#545FEF"
    />
    <path
      d="M14.6354 16.9718C14.6354 17.2583 14.5851 17.5198 14.4844 17.7562C14.3837 17.9926 14.25 18.1968 14.0833 18.3687C13.9167 18.537 13.7222 18.6678 13.5 18.7609C13.2812 18.854 13.0521 18.9006 12.8125 18.9006C12.5486 18.9006 12.3056 18.854 12.0833 18.7609C11.8646 18.6678 11.6736 18.537 11.5104 18.3687C11.3507 18.1968 11.2257 17.9926 11.1354 17.7562C11.0451 17.5198 11 17.2583 11 16.9718C11 16.6745 11.0451 16.4059 11.1354 16.1659C11.2257 15.9223 11.3507 15.7146 11.5104 15.5426C11.6736 15.3707 11.8646 15.2382 12.0833 15.1451C12.3056 15.0484 12.5486 15 12.8125 15C13.0764 15 13.3194 15.0484 13.5417 15.1451C13.7674 15.2382 13.9601 15.3707 14.1198 15.5426C14.283 15.7146 14.4097 15.9223 14.5 16.1659C14.5903 16.4059 14.6354 16.6745 14.6354 16.9718ZM13.3958 16.9718C13.3958 16.7891 13.3802 16.6387 13.349 16.5205C13.3212 16.3987 13.2812 16.302 13.2292 16.2304C13.1771 16.1587 13.1146 16.1086 13.0417 16.0799C12.9722 16.0513 12.8958 16.0369 12.8125 16.0369C12.7292 16.0369 12.6528 16.0513 12.5833 16.0799C12.5139 16.1086 12.4549 16.1587 12.4063 16.2304C12.3576 16.302 12.3194 16.3987 12.2917 16.5205C12.2639 16.6387 12.25 16.7891 12.25 16.9718C12.25 17.1437 12.2639 17.287 12.2917 17.4016C12.3194 17.5162 12.3576 17.6076 12.4063 17.6756C12.4549 17.7437 12.5139 17.792 12.5833 17.8207C12.6528 17.8493 12.7292 17.8637 12.8125 17.8637C12.8958 17.8637 12.9722 17.8493 13.0417 17.8207C13.1146 17.792 13.1771 17.7437 13.2292 17.6756C13.2812 17.6076 13.3212 17.5162 13.349 17.4016C13.3802 17.287 13.3958 17.1437 13.3958 16.9718ZM17.0208 15.3224C17.0729 15.2615 17.1372 15.206 17.2135 15.1558C17.2899 15.1021 17.3958 15.0752 17.5312 15.0752H18.7083L12.9896 22.6669C12.9375 22.7349 12.8715 22.7923 12.7917 22.8388C12.7153 22.8818 12.6215 22.9033 12.5104 22.9033H11.3021L17.0208 15.3224ZM19 21.0658C19 21.3524 18.9497 21.6156 18.849 21.8556C18.7483 22.092 18.6146 22.2962 18.4479 22.4681C18.2812 22.6364 18.0868 22.7672 17.8646 22.8603C17.6458 22.9534 17.4167 23 17.1771 23C16.9132 23 16.6701 22.9534 16.4479 22.8603C16.2292 22.7672 16.0382 22.6364 15.875 22.4681C15.7153 22.2962 15.5903 22.092 15.5 21.8556C15.4097 21.6156 15.3646 21.3524 15.3646 21.0658C15.3646 20.7685 15.4097 20.4999 15.5 20.2599C15.5903 20.0163 15.7153 19.8086 15.875 19.6367C16.0382 19.4647 16.2292 19.3322 16.4479 19.2391C16.6701 19.1424 16.9132 19.094 17.1771 19.094C17.441 19.094 17.684 19.1424 17.9062 19.2391C18.1319 19.3322 18.3247 19.4647 18.4844 19.6367C18.6476 19.8086 18.7743 20.0163 18.8646 20.2599C18.9549 20.4999 19 20.7685 19 21.0658ZM17.7604 21.0658C17.7604 20.8867 17.7448 20.7381 17.7135 20.6199C17.6858 20.4981 17.6458 20.4014 17.5938 20.3298C17.5417 20.2581 17.4792 20.208 17.4063 20.1793C17.3368 20.1507 17.2604 20.1363 17.1771 20.1363C17.0938 20.1363 17.0174 20.1507 16.9479 20.1793C16.8785 20.208 16.8194 20.2581 16.7708 20.3298C16.7222 20.4014 16.684 20.4981 16.6562 20.6199C16.6285 20.7381 16.6146 20.8867 16.6146 21.0658C16.6146 21.2377 16.6285 21.381 16.6562 21.4956C16.684 21.6103 16.7222 21.7016 16.7708 21.7696C16.8194 21.8377 16.8785 21.8861 16.9479 21.9147C17.0174 21.9434 17.0938 21.9577 17.1771 21.9577C17.2604 21.9577 17.3368 21.9434 17.4063 21.9147C17.4792 21.8861 17.5417 21.8377 17.5938 21.7696C17.6458 21.7016 17.6858 21.6103 17.7135 21.4956C17.7448 21.381 17.7604 21.2377 17.7604 21.0658Z"
      fill="#FF8787"
    />
  </svg>
`;

export function discountTemplate(
  { realDiscount: discount, type, claimedDiscount },
  showClaimedDiscount
) {
  if (discount === null || isNaN(discount)) return null;

  discount = Math.trunc(discount * 100) / 100;
  claimedDiscount = Math.trunc(claimedDiscount * 100) / 100;

  const titles = new Map([
    [
      "eu-minimum",
      "Reálná sleva se počítá podle EU směrnice jako aktuální cena po slevě ku minimální ceně, za kterou se zboží prodávalo v období 30 dní před slevovou akcí."
    ],
    [
      "common-price",
      "Počítá se jako aktuální cena ku nejčastější ceně, za kterou se zboží prodávalo za posledních 90 dnů."
    ]
  ]);

  const discountLabel = x => {
    if (x === claimedDiscount) {
      return "Na slevě se shodneme";
    } else if (x > 0) {
      return "Podle nás sleva";
    } else if (x === 0) {
      return "Podle nás bez slevy";
    } else {
      return "Podle nás zdraženo";
    }
  };
  const discountClass = x => ({
    "hs-real-discount": true,
    "hs-real-discount--neutral": x === 0,
    "hs-real-discount--negative": x < 0,
    "hs-real-discount--good": x === claimedDiscount
  });

  const title = titles.get(type);
  return html`
    <div class="hs-header__discount">
      <div class="${classMap(discountClass(discount))}">
        <b>
          <span>
            ${discount < 0 ? "↑" : discount > 0 ? "↓" : "="}
            ${formatPercents(Math.abs(discount))}
          </span>
        </b>
        <a
          href="https://www.hlidacshopu.cz/metodika/#nova"
          target="_blank"
          rel="noopener"
          title="${title}"
        >
          ${discountLabel(discount)}
        </a>
      </div>
      ${when(
        showClaimedDiscount && discount !== claimedDiscount && claimedDiscount,
        () => claimedDiscountTemplate(claimedDiscount)
      )}
    </div>
  `;
}

export function originalPriceTemplate({ commonPrice, minPrice, type }) {
  return html`
    <div class="hs-original-price">
      ${type === "eu-minimum" ? "Minimální cena před akcí" : "Běžná cena"}
      <b
        >${type === "eu-minimum"
          ? formatMoney(minPrice)
          : formatMoney(commonPrice)}</b
      >
    </div>
  `;
}

function actualPriceTemplate({ currentPrice }, showCurrentPrice) {
  if (!showCurrentPrice) return;
  return html`
    <div class="hs-actual-price">
      Prodejní cena
      <b>${formatMoney(currentPrice)}</b>
    </div>
  `;
}

function imageTemplate({ imageUrl, currentPrice, name }, showImage) {
  if (!showImage) return;
  return html`
    <div class="hs-product-detail">
      <figure>
        <img src="${imageUrl || "/assets/img/no-image.png"}" alt="${name}" />
        <figcaption class="hs-actual-price">
          Prodejní cena
          <b>${formatMoney(currentPrice)}</b>
        </figcaption>
      </figure>
    </div>
  `;
}

function footerTemplate() {
  return html`
    <div class="hs-footer">
      <div>
        Více informací na
        <a href="https://www.hlidacshopu.cz/">HlídačShopů.cz</a>
      </div>
      <div>
        Vytvořili <a href="https://www.apify.com/">Apify</a>,
        <a href="https://www.keboola.com/">Keboola</a>
        &amp; <a href="https://www.topmonks.com/">TopMonks</a>
      </div>
    </div>
  `;
}

export function widgetTemplate(
  data,
  metadata,
  { showFooter, showLegend, showClaimedDiscount, showImage } = {
    showFooter: true,
    showLegend: true,
    showCurrentPrice: false,
    showClaimedDiscount: false,
    showImage: false
  }
) {
  const params = new URLSearchParams({ url: location.href });
  const permalink = `https://www.hlidacshopu.cz/app/?${params}`;
  return html`
    <style>
      ${widgetStyles()}
    </style>
    <div id="hlidacShopu">
      <div class="hs-header">
        <div>
          <a
            class="hs-logo"
            href="${permalink}"
            title="trvalý odkaz na vývoj ceny"
          >
            ${logo}
          </a>
          ${originalPriceTemplate(metadata)}
        </div>
        ${discountTemplate(metadata, showClaimedDiscount)}
      </div>
      <div class="hs-body">
        ${imageTemplate(metadata, showImage)}
        ${chartTemplate("Uváděná původní cena", "Prodejní cena", showLegend)}
      </div>
      ${when(showFooter, () => footerTemplate())}
    </div>
  `;
}

export function notFoundTemplate() {
  return html`
    <style>
      .box {
        margin: 16px;
      }
      ${shopsListStyles()}
    </style>
    <div id="hlidac-shopu-modal__not-found" class="hs-result">
      <h2>Nenalezeno</h2>
      <div class="box box--purple">
        <p>
          Je nám líto, ale hledaný produkt nebo e-shop nemáme v naší databázi.
        </p>
      </div>
      <section>
        <h3>Podporované e-shopy</h3>
        ${shopsListTemplate(shops.values())}
      </section>
    </div>
  `;
}

export function shopsListStyles() {
  return css`
    .hs-shops-list {
      display: grid;
      grid-column-gap: 16px;
      grid-template-columns: 33% 33% 33%;
      text-align: left;
      margin: 16px;
      padding: 0;
      line-height: 32px;
      list-style-type: none;
    }
    @media screen and (max-width: 480px) {
      .hs-shops-list {
        grid-template-columns: 50% 50%;
        margin: 16px 24px;
      }
    }
  `;
}

export function shopsListTemplate(shops) {
  return html`
    <ul class="hs-shops-list">
      ${repeat(
        shops,
        ({ name, url }) => html`
          <li class="hs-shops-list__item">
            <a href="${url}">${name}</a>
          </li>
        `
      )}
    </ul>
  `;
}

export function loaderTemplate() {
  return html`
    <div
      id="hlidac-shopu-modal__loader"
      class="hs-result mdc-layout-grid__inner"
    >
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <h2>Ověřuji&hellip;</h2>
      </div>
      <div
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12 box box--purple"
      >
        <div class="loading-container">
          <div class="loader" aria-label="Načítám data…">
            Váš požadavek se zpracovává&hellip;
          </div>
        </div>
      </div>
    </div>
  `;
}

export function claimedDiscountTemplate(claimedDiscount) {
  return html`
    <div class="hs-claimed-discount">
      Sleva udávaná e-shopem <b>${formatPercents(claimedDiscount)}</b>
    </div>
  `;
}

export function logoTemplate(shop) {
  if (!shop) return null;
  const { logo, name, url, viewBox } = shop;
  const image = svg`
    <svg viewBox="${viewBox}">
      <title>${name}</title>
      <use href="#${logo}"></use>
    </svg>
  `;
  return html`
    <a
      href="${url}"
      class="sprite sprite--${logo}"
      title="${name}"
      target="_blank"
      rel="noopener noreferrer"
      >${image}</a
    >
  `;
}

export function rating(ratingValue, {maxValue} = {maxValue: 5}) {
  if (!ratingValue) return null;
  const oneStarWidth = 25.2;
  const ratingStyle = `font-size:${oneStarWidth}px;line-height:16px;width:${maxValue}em`;
  const starsStyle = `width:${ratingValue}em`;
  return html`
    <i
      property="reviewRating"
      typeof="Rating"
      class="review__rating"
      data-rating="${ratingValue}"
      style="${ratingStyle}"
      aria-label="Obdržené hodnocení ${ratingValue} hvězdiček z ${maxValue}."
      title="Hodnocení ${ratingValue} ⭑"
    >
      <data
        role="meter"
        property="ratingValue"
        value="${ratingValue}"
        aria-valuemin="1"
        aria-valuemax="${maxValue}"
        class="review__rating-value"
        style="${starsStyle}"
      ></data>
    </i>
  `;
}
