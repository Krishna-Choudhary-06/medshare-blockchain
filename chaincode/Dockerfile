FROM node:18-alpine
WORKDIR /usr/local/src
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 9999
CMD node_modules/.bin/fabric-chaincode-node server --chaincode-address=0.0.0.0:9999 --chaincode-id=$CHAINCODE_ID
