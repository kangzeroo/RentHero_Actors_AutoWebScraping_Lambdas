'use strict';
const kijiji = require('./fn/kijiji')
const zolo = require('./fn/zolo')
const condosca = require('./fn/condosca')
const getListings = require('./fn/getListings')
const getListingsByRef = require('./fn/getListingsByRef')
const getListingsByRefs = require('./fn/getListingsByRefs')
const getHeatMap = require('./fn/getHeatMap')

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

module.exports.getListingsByRefs = (event, context, callback) => {
  getListingsByRefs(event, context, callback)
};

module.exports.getHeatMap = (event, context, callback) => {
  getHeatMap(event, context, callback)
};
