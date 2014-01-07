'use strict';

var async = require('async');
var shellExec = require('child_process').exec;

/**
 * HYDRATING FUNCTION
 *
 * @param {string} path Path of the specified file
 * @param {string} document to hydrate
 * @param {function} cb Callback, first parameter, is the error if any, then the processed data
 */
module.exports = function(path, document, cb) {

  async.waterfall([
    function(cb) {
    },
  ], function(err) {
    cb(err, document);
  });
};
