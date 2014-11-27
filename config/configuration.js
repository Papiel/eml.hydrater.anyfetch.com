/**
 * @file Defines the hydrater settings.
 */

// nodeEnv can either be "development" or "production"
var nodeEnv = process.env.NODE_ENV || "development";
var defaultPort = 8000;

// Number of pdf instance to run simultaneously per cluster
var defaultConcurrency = 1;

if(nodeEnv === "production") {
  defaultPort = 80;
}

// Exports configuration
module.exports = {
  env: nodeEnv,
  port: process.env.PORT || defaultPort,
  maxSockets: process.env.MAX_SOCKET || 50,

  concurrency: process.env.HYDRATER_EML_CONCURRENCY || defaultConcurrency
};
