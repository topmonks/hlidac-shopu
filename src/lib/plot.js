const Chart = require("chart.js");
const dateFormat = require("dateformat");

Chart.plugins.register({
  afterDraw: function(chart) {
    if (chart.data.datasets.every(set => set.data.length == 0)) {
      // No data is present
      var ctx = chart.chart.ctx;
      var width = chart.chart.width;
      var height = chart.chart.height
      // chart.clear();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "16px normal 'Helvetica Nueue'";
      ctx.fillText('Chybí data', width / 2, height / 2);
      ctx.restore();
    }
  }
});

function plot(elem, prices) {
  const min = Math.min(...prices.map(p => p["currentPrice"]));
  const max = Math.max(...prices.map(p => p["currentPrice"]));

  const ctx = elem.getContext("2d");
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: prices.map(p => (new Date(p.date)).toLocaleDateString()),
      datasets: [
        {
          label: "Uváděná původní cena",
          steppedLine: 'after',
          borderColor: 'rgb(17, 0, 255)',
          fill: false,
          pointRadius: 0,
          spanGaps: false,
          data: prices.map(p => p['originalPrice']).map(v => v > 0 ? v : null),
        },
        {
          label: "Skutečná cena",
          steppedLine: 'after',
          borderColor: 'rgb(255, 0, 4)',
          fill: false,
          pointRadius: 0,
          spanGaps: false,
          data: prices.map(p => p['currentPrice']).map(v => v > 0 ? v : null),
        }
      ]
    },
    options: {
      title: {
        display: true,
        text: 'Vývoj skutečné a uváděné původní ceny',
      },
      tooltips: {
        mode: "index",
        intersect: false,
        callbacks: {
          label(item, data) {
            if (item.datasetIndex === 0) {
              return `Původní: ${item.yLabel.toLocaleString()}`;
            }
            return `Skutečná: ${item.yLabel.toLocaleString()}`;
          },
        }
      },
      scales: {
        yAxes: [{
          ticks: {
            suggestedMax: max,
            suggestedMin: min,
            // max,
            // min
          }
        }]
      }
    },
  });
}

export default plot
