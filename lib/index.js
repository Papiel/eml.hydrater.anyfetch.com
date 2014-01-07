'use strict';

var fs = require('fs');
var shellExec = require('child_process').exec;
var MailParser = require("mailparser").MailParser;

/**
 * HYDRATING FUNCTION
 *
 * @param {string} path Path of the specified file
 * @param {string} document to hydrate
 * @param {function} cb Callback, first parameter, is the error if any, then the processed data
 */
module.exports = function(path, document, cb) {
  var mailparser = new MailParser();

  mailparser.on("end", function(mail_object){
    console.log("Subject:", mail_object);

    document.document_type = "email";
    cb(null, document);
  });

  fs.createReadStream(path).pipe(mailparser);
};
