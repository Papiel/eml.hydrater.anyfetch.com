'use strict';

var fs = require('fs');
var shellExec = require('child_process').exec;
var MailParser = require("mailparser").MailParser;
var Encoder = require('node-html-encoder').Encoder;

/**
 * HYDRATING FUNCTION
 *
 * @param {string} path Path of the specified file
 * @param {string} document to hydrate
 * @param {function} cb Callback, first parameter, is the error if any, then the processed data
 */
function exists(item){
  return item ? item : '';
}

module.exports = function(path, document, cb) {
  var mailparser = new MailParser();
  var encoder = new Encoder('entity');
  mailparser.on("end", function(mail_object){
    if(!document.metadatas) {
      document.metadatas = {};
    }
    if(!document.datas) {
      document.datas = {};
    }
    document.metadatas.to = [];
    (mail_object.to || []).forEach(function(item){
      document.metadatas.to.push(item);
    });
    document.metadatas.cc = [];
    (mail_object.cc || []).forEach(function(item){
      document.metadatas.cc.push(item);
    });
    document.metadatas.bcc = [];
    (mail_object.bcc || []).forEach(function(item){
      document.metadatas.bcc.push(item);
    });
    document.metadatas.from = exists(mail_object.from);
    document.metadatas.subject = exists(mail_object.subject);
    document.metadatas.text = exists(mail_object.text);
    document.document_type = "email";
    document.datas.html = encoder.htmlDecode(exists(mail_object.html));

    cb(null, document);
  });

  fs.createReadStream(path).pipe(mailparser);
};
