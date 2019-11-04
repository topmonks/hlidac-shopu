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
  const ctx = canvas.getContext("2d");
  
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
          backgroundColor: "#ffffff00",
          pointRadius: 0,
          spanGaps: true,
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
          backgroundColor: "#ffffff00",
          pointRadius: 0,
          spanGaps: true,
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
        backgroundColor: "#FCF4A7",
        borderColor: "#FBEA61",
        borderWidth: 2,
        bodyFontColor: "#1D3650",
        bodySpacing: 4,
        titleFontColor: "#1D3650",
        xPadding: 12,
        yPadding: 8,
        caretSize: 12,
        callbacks: {
          title(item, data) {
            const date = data.labels[item[0].index];
            return date.toLocaleDateString("cs", { day: "numeric", month: "long", year: "numeric" });
          },
          label(item, _data) {
            if (item.datasetIndex === 0) {
              return `Uváděná původní cena: ${item.yLabel.toLocaleString("cs")},- Kč`;
            }
            return `Prodejní cena: ${item.yLabel.toLocaleString("cs")},- Kč`;
          },
          labelColor(item, _chart) {
            const red = "#FF8787";
            const blue = "#5C62CD";
            const color = item.datasetIndex === 1 ? red : blue;

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
            stepSize: 14,
            displayFormats: {
              day: "D. M. YYYY"
            }
          },
        }],
        yAxes: [{
          ticks: {
              suggestedMax: max + 0.1 * max,
              suggestedMin: min - 0.1 * min,
          }
        }]
      }
    },
  });
}
