const path = require('path');
const dotenv = require('dotenv');

let loaded = false;

function loadEnv() {
  if (loaded) {
    return;
  }

  dotenv.config({
    path: [
      path.resolve(__dirname, '../.env'),
      path.resolve(__dirname, '../../.env')
    ],
    quiet: true
  });

  loaded = true;
}

module.exports = loadEnv;
