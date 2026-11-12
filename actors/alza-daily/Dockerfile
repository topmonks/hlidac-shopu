FROM apify/actor-node:24

COPY package.json ./

# The base image ships its own node_modules with the newest crawlee. Installing on top of
# it keeps that @crawlee/core next to the one @crawlee/basic pins, and Actor.init refuses
# the mix ("Detected incompatible Crawlee version"). Install from a clean tree.
RUN rm -rf node_modules \
 && npm --quiet set progress=false \
 && npm install --omit=dev --omit=optional

COPY . ./
