import { html, render } from "lit-html/lit-html.js";
import { fetchReviews } from "@hlidac-shopu/lib/remoting.mjs";
import { formatDate } from "@hlidac-shopu/lib/format.mjs";
import * as rollbar from "./rollbar.js";
import { when } from "@hlidac-shopu/lib/templates.mjs";

rollbar.init();

const reviewsRoot = document.getElementById("reviews");

addEventListener("DOMContentLoaded", async e => {
  const reviews = await fetchReviews();
  reviewsRoot.innerHTML = null;
  render(reviews.map(reviewTemplate), reviewsRoot);
});

function avatarTemplate({ name, imageUrl }) {
  return when(
    imageUrl,
    () =>
      html`
        <img
          class="avatar"
          alt="${name}"
          loading="lazy"
          src="https://${imageUrl}"
          srcset="
            https://${imageUrl} 1x,
            https://${imageUrl.replace("s70", "s105")} 1.5x,
            https://${imageUrl.replace("s70", "s140")} 2x
          "
        />
      `
  );
}

function reviewTemplate({ name, date, text, imageUrl, rating }) {
  const style = text.length > 260 ? "grid-row: span 2;" : "";
  const oneStarWidth = 25.2;
  const ratingStyle = `font-size:${oneStarWidth}px;line-height:16px`;
  const starsStyle = `width:${rating}em`;
  return html`
    <div
      vocab="https://schema.org"
      typeof="UserReview"
      class="review mdc-layout-grid__cell mdc-layout-grid__cell--span-4"
      style="${style}"
    >
      <link property="itemReviewed" href="https://www.hlidacshopu.cz/" />
      <div
        class="review__header ${imageUrl === ""
          ? "review__header--no-avatar"
          : ""}"
      >
        ${avatarTemplate({ name, imageUrl })}
        <span property="author" class="review__author">${name}</span><br />
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
          data-rating="${rating}"
          style="${ratingStyle}"
          aria-label="Obdržené hodnocení ${rating} hvězdiček z 5."
          title="Hodnocení ${rating} ★"
        >
          <data
            role="meter"
            property="ratingValue"
            value="${rating}"
            aria-valuemin="1"
            aria-valuemax="5"
            class="review__rating-value"
            style="${starsStyle}"
          ></data>
        </i>
      </div>
      <div class="review__content" property="reviewBody">
        <p>${text}</p>
      </div>
    </div>
  `;
}
