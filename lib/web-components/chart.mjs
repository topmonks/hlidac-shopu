import { LitElement } from "lit";
import {
  chartTemplate,
  createChart,
  defineStyles,
  getCanvasContext
} from "../chart.mjs";

export class PriceChart extends LitElement {
  static get properties() {
    return {
      chart: { type: Object },
      data: { type: Object },
      claimedOriginalPriceLabel: { type: String },
      currentPriceLabel: { type: String }
    };
  }

  constructor() {
    super();
    this.originalPriceLabel = "Uváděná původní cena";
    this.currentPriceLabel = "Prodejní cena";
  }

  get canvasContext() {
    return getCanvasContext(this.renderRoot);
  }

  firstUpdated(props) {
    if (!this.data) return;

    const { currentPrice, originalPrice } = this.data;
    this.chart = createChart(
      this.canvasContext,
      currentPrice,
      originalPrice,
      this.originalPriceLabel,
      this.currentPriceLabel
    );
  }

  static get styles() {
    return defineStyles();
  }

  render() {
    // TODO: if (!this.data)
    return chartTemplate(this.originalPriceLabel, this.currentPriceLabel);
  }
}

if (customElements) {
  customElements.define("hs-chart", PriceChart);
}
