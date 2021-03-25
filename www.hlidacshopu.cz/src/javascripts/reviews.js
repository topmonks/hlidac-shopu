import { html, render } from "lit-html";
import { formatDate } from "@hlidac-shopu/lib/format.mjs";
import * as rollbar from "./rollbar.js";
import { when } from "@hlidac-shopu/lib/templates.mjs";
import { fetchReviews } from "@hlidac-shopu/lib/remoting.mjs";

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
    () =>
      html`
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
  const oneStarWidth = 25.2;
  const ratingStyle = `font-size:${oneStarWidth}px;line-height:16px`;
  const starsStyle = `width:${reviewRating.ratingValue}em`;
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
        class="review__header ${author.image == null
          ? "review__header--no-avatar"
          : ""}"
      >
        ${avatarTemplate(author)}
        <span property="author" typeof="Person" class="review__author"
          ><span property="name">${author.name}</span></span
        ><br />
        <time
          property="datePublished"
          class="review__date text--light-grey"
          datetime="${date.toISOString()}"
          >${formatDate(date)}</time
        ><br />
        <i
          property="reviewRating"
          typeof="Rating"
          class="review__rating"
          data-rating="${reviewRating.ratingValue}"
          style="${ratingStyle}"
          aria-label="Obdržené hodnocení ${reviewRating.ratingValue} hvězdiček z 5."
          title="Hodnocení ${reviewRating.ratingValue} ⭑"
        >
          <data
            role="meter"
            property="ratingValue"
            value="${reviewRating.ratingValue}"
            aria-valuemin="1"
            aria-valuemax="5"
            class="review__rating-value"
            style="${starsStyle}"
          ></data>
        </i>
      </div>
      <div class="review__content" property="reviewBody">
        <p>${reviewBody}</p>
      </div>
    </div>
  `;
}
