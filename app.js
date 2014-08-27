'use strict';

// Load configuration and initialize server
var anyfetchHydrater = require('anyfetch-hydrater');

var config = require('./config/configuration.js');

var http = require('http');

// See max socket value, default is 5.
// We need to do that as early as possible, before creating any server or connecting to mongoose
// See http://markdawson.tumblr.com/post/17525116003/node
http.globalAgent.maxSockets = config.maxSockets;

var serverConfig = {
  concurrency: config.concurrency,
  hydrater_function: './lib/index.js'
};

var server = anyfetchHydrater.createServer(serverConfig);

// Expose the server
module.exports = server;
