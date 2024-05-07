FROM apify/actor-node-playwright-chrome:22

COPY package.json ./

RUN npm --quiet set progress=false \
 && npm install --omit=dev --omit=optional --fund=false --audit=false --save=false

COPY . ./
