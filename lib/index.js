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
    if(!document.metadatas) {
      document.metadatas = {};
    }
    if(!document.datas) {
      document.datas = {};
    }
    document.metadatas.to = mail_object.to;
    document.metadatas.from = mail_object.from;
    document.metadatas.subject = mail_object.subject ? mail_object.subject : '';
    document.metadatas.text = mail_object.text ? mail_object.text : '';
    document.document_type = "email";
    document.datas.html = mail_object.html ? mail_object.html : '';

    cb(null, document);
  });

  fs.createReadStream(path).pipe(mailparser);
};
