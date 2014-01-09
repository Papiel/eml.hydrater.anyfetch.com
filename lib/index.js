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
var reg = new RegExp("(<([^>]+)>)", "g");
var reg_space = new RegExp("  ", "g");
module.exports = function(path, document, cb) {
  if(!document.metadatas) {
    document.metadatas = {};
  }
  if(!document.datas) {
    document.datas = {};
  }

  var mailparser = new MailParser();
  var encoder = new Encoder('entity');
  mailparser.on("end", function(mail_object){
    document.document_type = "email";
    
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

    if (mail_object.html) {
      document.datas.html = encoder.htmlDecode(mail_object.html).trim();
    }

    if (mail_object.text) {
      document.metadatas.text = mail_object.text;
    }
    else if (document.datas.html) {
      document.metadatas.text = document.datas.html.replace(reg, " ");
      document.metadatas.text = document.metadatas.text.replace(reg_space, " ");
    }

    document.metadatas.text = document.metadatas.text.trim();
    
    cb(null, document);
  });

  fs.createReadStream(path).pipe(mailparser);
};
