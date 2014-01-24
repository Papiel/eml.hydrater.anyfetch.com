'use strict';

var fs = require('fs');
var shellExec = require('child_process').exec;
var MailParser = require("mailparser").MailParser;
var Encoder = require('node-html-encoder').Encoder;
var AnyfetchClient = require('cluestr');
var async = require('async');

/**
 * HYDRATING FUNCTION
 *
 * @param {string} path Path of the specified file
 * @param {string} document to hydrate
 * @param {function} cb Callback, first parameter, is the error if any, then the processed data
 */

var fileName = "";
var reg = new RegExp("(<([^>]+)>)", "g");

function exists(item){
  return item ? item : '';
}

module.exports = function(path, document, cb) {
  if(!document.metadatas) {
    document.metadatas = {};
  }
  if(!document.datas) {
    document.datas = {};
  }
  fileName = path.substr(path.lastIndexOf('/') + 1);
  if(fileName.lastIndexOf('.') !== -1) {
    fileName = fileName.substr(0, fileName.lastIndexOf('.'));
  }

  var mailparser = new MailParser();
  var encoder = new Encoder('entity');
  mailparser.on("end", function(mail_object){
    if (mail_object.attachments) {

      var anyfetchClient = new AnyfetchClient();
      anyfetchClient.setAccessToken(document.access_token);

      async.series([
        function(){
          anyfetchClient.deleteDocument(document.identifier, function(err) {
            if(err) {
              throw err;
            }
          });
        },
        function(){
          // Remove attachments and send a new mail
          mail_object.attachments = null;
          var docMail = {};
          docMail.identifier = document.identifier;
          var fileConfigMail = function(){
            return {
              file: mail_object,
              filename: fileName + ".eml",
            };
          };
          anyfetchClient.sendDocumentAndFile(docMail, fileConfigMail, function(err) {
            if(err) {
              throw err;
            }
          });
        }
      ], function(err){
        cb(err);
      });

      async.each(mail_object.attachments, function(attachment, cb){
        var docAttachment = {};
        docAttachment.identifier = document.identifier + "/" + attachment.fileName;
        // File to send
        var fileConfigAttachment = function(){
          return {
            file: attachment.content,
            filename: attachment.fileName,
            knownLength: attachment.length
          };
        };
        anyfetchClient.sendDocumentAndFile(docAttachment, fileConfigAttachment, function(err) {
          cb(err);
        });
      }, function(err){
        cb(err);
      });
      
    }
    else{
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

      if (mail_object.headers && mail_object.headers.date) {
        document.creation_date = new Date(mail_object.headers.date);
      }

      if (mail_object.text) {
        document.metadatas.text = mail_object.text;
      }
      else if (document.datas.html) {
        document.metadatas.text = document.datas.html.replace(reg, " ");
        document.metadatas.text = document.metadatas.text.replace("  ", " ");
      }
      document.metadatas.text = document.metadatas.text.trim();
      cb(null, document);
    }
  });

  fs.createReadStream(path).pipe(mailparser);
};