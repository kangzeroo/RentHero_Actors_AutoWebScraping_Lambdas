'use strict';
const kijiji = require('./fn/kijiji')

module.exports.kijiji = (event, context, callback) => {
  kijiji(event, context, callback)
};
