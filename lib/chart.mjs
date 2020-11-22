import { html } from "lit-html/lit-html.js";
import { css, unsafeCSS } from "lit-element/lib/css-tag.js";
import {
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip
} from "chart.js/dist/chart.esm.js";
import "chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.esm.js";
import cs from "date-fns/locale/cs/index.js";
import { formatDate, formatMoney } from "./format.mjs";

Chart.register(
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip
);

Chart.defaults.font.size = 12;
Chart.defaults.font.family = "'Montserrat', sans-serif";

const CANVAS_ID = "hlidac-shopu-chart";
const red = "#ff8787";
const blue = "#5c62cd";

const createChartData = (
  currentPrice,
  originalPrice,
  originalPriceLabel,
  currentPriceLabel
) => ({
  labels: currentPrice.map(p => p.x),
  datasets: [
    {
      data: originalPrice,
      label: originalPriceLabel,
      stepped: "after",
      backgroundColor: "#ffffff00",
      borderColor: blue,
      borderWidth: 2,
      borderCapStyle: "round",
      fill: false,
      pointRadius: 0,
      spanGaps: false
    },
    {
      data: currentPrice,
      label: "Doplněná prodejní cena",
      stepped: "after",
      backgroundColor: "#ffffff00",
      borderColor: red,
      borderWidth: 1,
      borderDash: [5, 10],
      borderCapStyle: "round",
      fill: false,
      pointRadius: 0,
      spanGaps: true
    },
    {
      data: currentPrice,
      label: currentPriceLabel,
      stepped: "after",
      backgroundColor: "#ffffff00",
      borderColor: red,
      borderWidth: 2,
      borderCapStyle: "round",
      fill: false,
      pointRadius: 0,
      spanGaps: false
    }
  ]
});

const tooltipStyles = {
  titleFont: { color: "#1d3650" },
  bodyFont: { color: "#1d3650" },
  bodySpacing: 4,
  backgroundColor: "#fcf4a7",
  borderColor: "#fbea61",
  borderWidth: 2,
  xPadding: 12,
  yPadding: 8,
  caretSize: 12
};

const tooltipFormatter = (originalPriceLabel, currentPriceLabel) => ({
  title(items) {
    const date = new Date(items[0].dataPoint.x);
    return formatDate(date);
  },
  label(item) {
    if (item.datasetIndex === 0) {
      return `${originalPriceLabel}: ${formatMoney(item.dataPoint.y)}`;
    } else if (item.datasetIndex === 1) {
      return `${currentPriceLabel}: ${formatMoney(item.dataPoint.y)}`;
    }
  },
  labelColor(item) {
    const color = item.datasetIndex > 0 ? red : blue;
    return { backgroundColor: color };
  }
});

function configureScales(currentPrice) {
  const values = currentPrice.filter(p => p.y !== null).map(p => p.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const count = currentPrice.length;
  const stepSize = Math.floor(count / 12) || 1;
  return {
    x: {
      type: "time",
      time: {
        unit: "day",
        stepSize,
        displayFormats: { day: "d. MMM ’yy" }
      },
      adapters: { date: { locale: cs } }
    },
    y: {
      type: "linear",
      suggestedMax: max + 0.1 * max,
      suggestedMin: min - 0.1 * min,
      ticks: { callback: formatMoney }
    }
  };
}

export const createChart = (
  ctx,
  currentPrice,
  originalPrice,
  originalPriceLabel,
  currentPriceLabel,
  maintainAspectRatio = true
) =>
  new Chart(ctx, {
    type: "line",
    data: createChartData(
      currentPrice,
      originalPrice,
      originalPriceLabel,
      currentPriceLabel
    ),
    options: {
      maintainAspectRatio,
      scales: configureScales(currentPrice),
      hover: {
        mode: "nearest",
        intersect: true
      },
      tooltips: {
        mode: "index",
        intersect: false,
        position: "nearest",
        callbacks: tooltipFormatter(originalPriceLabel, currentPriceLabel),
        ...tooltipStyles
      }
    }
  });

export const defineStyles = () => css`
  .hs-legend {
    display: flex;
    justify-content: flex-end;
    font-size: 12px;
  }
  .hs-legend__point {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    margin-right: 5px;
    margin-top: 2px;
  }
  .hs-legend__point--original-price {
    background-color: ${unsafeCSS(blue)};
  }
  .hs-legend__point--current-price {
    background-color: ${unsafeCSS(red)};
    margin-left: 8px;
  }
`;

export const chartTemplate = (
  originalPriceLabel,
  currentPriceLabel,
  showLegend = true
) => html`
  <div class="hs-chart-wrapper">
    ${showLegend
      ? html`
          <div class="hs-legend">
            <div
              class="hs-legend__point hs-legend__point--original-price"
            ></div>
            <span>${originalPriceLabel}</span>
            <div class="hs-legend__point hs-legend__point--current-price"></div>
            <span>${currentPriceLabel}</span>
          </div>
        `
      : null}
    <canvas id="${CANVAS_ID}" width="100%"></canvas>
  </div>
`;

export const getCanvasContext = element => {
  const canvas = element.querySelector(`#${CANVAS_ID}`);
  return canvas.getContext("2d");
};
