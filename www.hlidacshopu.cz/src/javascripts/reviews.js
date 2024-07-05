import { formatDate } from "@hlidac-shopu/lib/format.mjs";
import { fetchReviews } from "@hlidac-shopu/lib/remoting.mjs";
import { rating, when } from "@hlidac-shopu/lib/templates.mjs";
import { html, render } from "lit-html";
import * as rollbar from "./rollbar.js";

rollbar.init();

const reviewsRoot = document.getElementById("reviews");

addEventListener("DOMContentLoaded", async e => {
  const reviews = await fetchReviews();
  reviewsRoot.innerHTML = null;
  render(reviews.map(reviewTemplate), reviewsRoot);
});

function avatarTemplate({ name, image }) {
  return when(
    image,
    () => html`
      <img
        class="avatar"
        alt="${name}"
        loading="lazy"
        src="${image}"
        srcset="
          ${image.replace("s40", "s70")} 1x,
          ${image.replace("s40", "s105")} 1.5x,
          ${image.replace("s40", "s140")} 2x
        "
      />
    `
  );
}

function reviewTemplate({ author, datePublished, reviewBody, reviewRating }) {
  const style = reviewBody.length > 260 ? "grid-row: span 2;" : "";
  const date = new Date(datePublished);
  return html`
    <div
      vocab="https://schema.org"
      typeof="UserReview"
      class="review mdc-layout-grid__cell mdc-layout-grid__cell--span-4"
      style="${style}"
    >
      <link property="itemReviewed" href="https://www.hlidacshopu.cz/" />
      <div
        class="review__header ${author.image == null ? "review__header--no-avatar" : ""}"
      >
        ${avatarTemplate(author)}
        <span property="author" typeof="Person" class="review__author"
          ><span property="name">${author.name}</span></span
        ><br />
        <time
          property="datePublished"
          class="review__date text--light-grey"
          datetime="${date.toISOString()}"
          >${formatDate(date)}
        </time>
        <br />
        ${rating(reviewRating.ratingValue, {
          maxValue: reviewRating.bestRating
        })}
      </div>
      <div class="review__content" property="reviewBody">
        <p>${reviewBody}</p>
      </div>
    </div>
  `;
}
