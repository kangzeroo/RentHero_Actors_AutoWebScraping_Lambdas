'use strict';
const kijiji = require('./fn/kijiji')
const zolo = require('./fn/zolo')
const condosca = require('./fn/condosca')
const getListings = require('./fn/getListings')
const getListingsByRef = require('./fn/getListingsByRef')

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

module.exports.getListingsByRef = (event, context, callback) => {
  getListingsByRef(event, context, callback)
};
