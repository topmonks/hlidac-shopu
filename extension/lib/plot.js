/* global Chart */

Chart.plugins.register({
  afterDraw: function(chart) {
    if (chart.data.datasets.every(set => set.data.length == 0)) {
      // No data is present
      var ctx = chart.chart.ctx;
      var width = chart.chart.width;
      var height = chart.chart.height;
      // chart.clear();

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "16px normal 'Helvetica Nueue'";
      ctx.fillText("Chybí data", width / 2, height / 2);
      ctx.restore();
    }
  }
});

/* exported plot */
function plot(canvas, prices) {
  const min = Math.min(...prices.currentPrice.filter(p => p.y !== null).map(p => p.y));
  const max = Math.max(...prices.currentPrice.filter(p => p.y !== null).map(p => p.y));
  console.log(min, max);
  const ctx = canvas.getContext("2d");
  const blueGradient  = ctx.createLinearGradient(canvas.width / 2, 0, canvas.width / 2, canvas.height);
  blueGradient.addColorStop(0, "rgba(92, 98, 205, 0.15)");
  blueGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  const redGradient  = ctx.createLinearGradient(canvas.width / 2, 0, canvas.width / 2, canvas.height);
  redGradient.addColorStop(0, "rgba(235, 111, 85, 0.2)");
  redGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  return new Chart(ctx, {
    type: "line",
    data: {
      labels: prices.currentPrice.map(p => p.x),
      datasets: [
        {
          label: "Uváděná původní cena",
          steppedLine: "after",
          borderColor: "#5C62CD",
          borderWidth: 3,
          borderJoinStyle: "round",
          borderCapStyle: "round",
          fill: "origin",
          backgroundColor: blueGradient,
          pointRadius: 0,
          spanGaps: false,
          data: prices.originalPrice, // prices.map(p => p["originalPrice"]).map(v => v > 0 ? v : null),
        },
        {
          label: "Prodejní cena",
          steppedLine: "after",
          borderColor: "#EB6F55",
          borderWidth: 3,
          borderJoinStyle: "round",
          borderCapStyle: "round",
          fill: "origin",
          backgroundColor: redGradient,
          pointRadius: 0,
          spanGaps: false,
          data: prices.currentPrice, // prices.map(p => p["currentPrice"]).map(v => v > 0 ? v : null),
        }
      ]
    },
    options: {
      legend: {
        display: false,
      },
      tooltips: {
        mode: "index",
        intersect: false,
        callbacks: {
          title(item, data) {
            const date = data.labels[item[0].index];
            return date.toLocaleDateString(undefined, { day: "numeric", month: "numeric", year: "numeric" });
          },
          label(item, _data) {
            if (item.datasetIndex === 0) {
              return `Původní: ${item.yLabel.toLocaleString()}`;
            }
            return `Prodejní: ${item.yLabel.toLocaleString()}`;
          },
          labelColor(item, _chart) {
            const blue = "#FF8787";
            const red = "#5C62CD";
            const color = item.datasetIndex === 1 ? blue : red;

            return {
              borderColor: color,
              backgroundColor: color,
            };
          },
        }
      },
      scales: {
        xAxes: [{
          type: "time",
          time: {
            unit: "day",
            stepSize: "15",
            displayFormats: {
              day: "D. M. YYYY"
            }
          },
        }],
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
