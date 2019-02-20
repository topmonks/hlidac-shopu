(async function() {
  const $ = document.querySelector.bind(document);

  const elem = $("#pricec");
  if (!elem) return;
  const styles = 'border: 1px solid lightgray; margin: 5px; padding: 5px; margin-bottom: 50px;';
  const markup = chartWrapper(styles);
  elem.insertAdjacentHTML("afterend", markup);

  const chartElem = $('#hlidacShopu-chart');
  const itemId = ($('#deepLinkUrl').getAttribute('content').match(/\d+$/) || [])[0];
  const title = $('h1[itemprop="name"]').innerText.trim();

  const data = await fetchData(window.location.href, itemId, title)
  plot(chartElem, data);
})();
