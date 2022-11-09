FROM apify/actor-node:18

COPY package.json ./

RUN npm --quiet set progress=false \
 && npm install --omit=dev --omit=optional

COPY . ./
