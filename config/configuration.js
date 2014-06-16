/**
 * @file Defines the hydrater settings.
 */

// node_env can either be "development" or "production"
var node_env = process.env.NODE_ENV || "development";
var default_port = 8000;

// Number of pdf instance to run simultaneously per cluster
var default_concurrency = 1;

if(node_env === "production") {
  default_port = 80;
}

// Exports configuration
module.exports = {
  env: node_env,
  port: process.env.PORT || default_port,
  maxSockets: process.env.MAX_SOCKET || 30,
  concurrency: process.env.HYDRATER_EML_CONCURRENCY || default_concurrency
};
