const moongoose = require('mongoose');
require('dotenv').config();
const MONGO_URL = process.env.MONGO_URL;

moongoose.connection.once('open', () => {
  console.log('Mongoose connection ready');
});
moongoose.connection.on('error', (err) => {
  throw new Error(err);
});

async function mongoConnect() {
  moongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
}

async function mongoDisconnect() {
  await moongoose.disconnect()
}
module.exports = {
  mongoConnect,
  mongoDisconnect
}
