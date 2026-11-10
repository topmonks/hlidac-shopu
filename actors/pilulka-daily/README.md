# Pilulka actor
Apify Actor for pilulka.cz website
## Actors INPUT
for fetching EAN and SUKL codes set input to parseDetails=true

for faster passage set input to parseDetails=false (results are without EAN and SUKL)

## Black Friday

`type: "BF"` goes through the same product pages as the full run and keeps only the products that show the
"Black Friday" badge on their page, whether they are discounted or not. The result goes to the `pilulka_<country>_bf`
table. The `/black-friday` listing is not used: it also lists products without the badge and its pagination repeats
products, so some badged products are missing from it.
