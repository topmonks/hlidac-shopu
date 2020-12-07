import { html, render } from "lit-html/lit-html.js";
import { fetchReviews } from "@hlidac-shopu/lib/remoting.mjs";
import { formatDate } from "@hlidac-shopu/lib/format.mjs";

const reviewsRoot = document.getElementById("reviews");

const longDateFormat = {
  year: "numeric",
  month: "long",
  day: "numeric"
};

addEventListener("DOMContentLoaded", async e => {
  const reviews = await fetchReviews();
  reviewsRoot.innerHTML = null;
  render(reviews.map(reviewTemplate), reviewsRoot);
});

function avatarTemplate({ name, imageUrl }) {
  return (
    imageUrl &&
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
      class="review mdc-layout-grid__cell mdc-layout-grid__cell--span-4"
      style="${style}"
    >
      <div
        class="review__header ${imageUrl === ""
          ? "review__header--no-avatar"
          : ""}"
      >
        ${avatarTemplate({ name, imageUrl })}
        <span class="review__author">${name}</span><br />
        <time
          class="review__date text--light-grey"
          datetime="${date.toISOString()}"
          >${formatDate(date)}</time
        ><br />
        <i
          class="review__rating"
          data-rating="${rating}"
          style="${ratingStyle}"
          title="Hodnocení: ${rating}"
        >
          <b class="review__rating-value" style="${starsStyle}"></b>
        </i>
      </div>
      <div class="review__content">
        <p>${text}</p>
      </div>
    </div>
  `;
}
