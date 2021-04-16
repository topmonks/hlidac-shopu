export async function tableRowsOrListItemsIntoArray({
    $,
    fieldsetSelector,
    fieldsetLegendSelector,
}) {
    const allFieldsetEls = $(fieldsetSelector).toArray();
        return allFieldsetEls.map((fieldsetEl) => {
        let title;
        let fieldData;

        if (fieldsetLegendSelector) {
            const legendEl = $(fieldsetLegendSelector, fieldsetEl);

            if (!legendEl.length) return;

            title = legendEl?.text()?.trim();
        } else {
            title = $(fieldsetEl)?.text()?.trim();
        }

        fieldData = $('li', fieldsetEl).toArray()
            .map((el) => $(el).text()?.trim()).join(', ');
        return { title, data: fieldData };
    });
}
