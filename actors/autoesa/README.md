## AutoEsa Scraper

`"type": "FULL"` scrapes all cars from `/vsechna-auta/` into the `autoesa_cz` table. `"type": "BF"` scrapes the discounted cars
from `/zlevnene-vozy/` (the Black Friday category) into the `autoesa_cz_bf` table. Both read the listing pages and then
each car detail page the same way.
