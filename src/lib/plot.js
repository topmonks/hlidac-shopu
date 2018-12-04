var Plotly = require('plotly.js-dist');

function plot(elem, dates, originalPrices, currentPrices) {
  var trace1 = {
    x: dates,
    y: originalPrices,
    error_x: {
      color: '#1f77b4',
      symmetric: true,
      thickness: 2,
      type: 'percent',
      value: 10,
      visible: false,
      width: 4
    },
    fill: 'none',
    line: {width: 1},
    marker: {color: 'rgb(17, 0, 255)'},
    mode: 'markers+lines',
    name: 'Uváděná původní cena',
    type: 'scatter',
    xsrc: 'masa331:0:987919',
    ysrc: 'masa331:0:bdffc8'
  };

  var trace2 = {
    x: dates,
    y: currentPrices,
    marker: {color: 'rgb(255, 0, 4)'},
    mode: 'markers+lines',
    name: 'Skutečná cena',
    type: 'scatter',
    xsrc: 'masa331:0:987919',
    ysrc: 'masa331:0:8f76fa'
  };

  var data = [trace1, trace2];

  var layout = {
    autosize: true,
    legend: {
      x: 0,
      y: 1.14,
      orientation: 'h',
      xanchor: 'left',
      yanchor: 'auto'
    },
    title: 'Vývoj skutečné a uváděné původní ceny',
    xaxis: {
      automargin: true,
      autorange: true,
      domain: [0, 1],
      rangeselector: {visible: false},
      showgrid: false,
      showline: false,
      showspikes: false,
      showticklabels: true,
      side: 'bottom',
      tickangle: 45,
      tickfont: {family: 'Arial'},
      tickformat: '%-d.%-m.%Y',
      tickmode: 'auto',
      type: 'date',
      zeroline: true
    },
    yaxis: {
      autorange: true,
      domain: [0, 1],
      separatethousands: true,
      showgrid: false,
      type: 'linear'
    }
  };

  Plotly.newPlot(elem, {
    data: data,
    layout: layout
  });
}

export default plot
