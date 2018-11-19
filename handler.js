'use strict';
const kijiji = require('./fn/kijiji')
const zolo = require('./fn/zolo')
const condosca = require('./fn/condosca')
const getListings = require('./fn/getListings')

module.exports.kijiji = (event, context, callback) => {
  kijiji(event, context, callback)
};

module.exports.zolo = (event, context, callback) => {
  zolo(event, context, callback)
};

module.exports.condosca = (event, context, callback) => {
  condosca(event, context, callback)
};

module.exports.getListings = (event, context, callback) => {
  getListings(event, context, callback)
};
