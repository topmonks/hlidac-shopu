FROM apify/actor-node:20

COPY package.json ./


# Install default dependencies, print versions of everything
RUN npm --quiet set progress=false \
 && npm install --only=prod --no-optional

COPY . ./
