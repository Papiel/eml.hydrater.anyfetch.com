'use strict';

var fs = require('fs');
var MailParser = require("mailparser").MailParser;
var Encoder = require('node-html-encoder').Encoder;
var AnyfetchClient = require('anyfetch');
var async = require('async');

/**
 * HYDRATING FUNCTION
 *
 * @param {string} path Path of the specified file
 * @param {string} document to hydrate
 * @param {function} cb Callback, first parameter, is the error if any, then the processed data
 */

var reg = new RegExp("(<([^>]+)>)", "g");

function exists(item){
  return item ? item : '';
}

module.exports = function(path, document, cb) {
  var finalCb=cb;
  if(!document.metadatas) {
    document.metadatas = {};
  }
  if(!document.datas) {
    document.datas = {};
  }

  var mailparser = new MailParser();
  var encoder = new Encoder('entity');
  mailparser.on("end", function(mail_object) {
    document.document_type = "email";
    document.metadatas.to = [];
    (mail_object.to || []).forEach(function(item) {
      document.metadatas.to.push(item);
    });
    document.metadatas.cc = [];
    (mail_object.cc || []).forEach(function(item) {
      document.metadatas.cc.push(item);
    });
    document.metadatas.bcc = [];
    (mail_object.bcc || []).forEach(function(item) {
      document.metadatas.bcc.push(item);
    });
    document.metadatas.from = exists(mail_object.from);
    document.metadatas.subject = exists(mail_object.subject);

    if (mail_object.html && mail_object.html.trim() !== '') {
      document.datas.html = encoder.htmlDecode(mail_object.html).trim();
    }

    if (mail_object.headers && mail_object.headers.date) {
      document.creation_date = new Date(mail_object.headers.date);
      document.metadatas.date = new Date(mail_object.headers.date);
    }
    else if (mail_object.date){
      document.creation_date = new Date(mail_object.date);
      document.metadatas.date = new Date(mail_object.date);
    }
    if (mail_object.text) {
      document.metadatas.text = mail_object.text;
    }
    else if (document.datas.html) {
      document.metadatas.text = document.datas.html.replace(reg, " ");
      document.metadatas.text = document.metadatas.text.replace("  ", " ");
    }
    else {
      // Special case, with empty HTML section.
      document.metadatas.text = '';
    }

    // Format text
    document.metadatas.text = document.metadatas.text.trim();
    document.metadatas.text = document.metadatas.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    document.related = [];

    // Delete doc without name and extension
    var attachments = mail_object.attachments || [];
    var filtered_attachments = [];
    attachments.forEach(function(attachment){
      if (attachment.fileName || attachment.generatedFileName.lastIndexOf(".") !== -1){
        attachment.fileName = attachment.generatedFileName;
        filtered_attachments.push(attachment);
      }
    });

    async.each(filtered_attachments, function(attachment, cb) {
      var fn = encodeURIComponent(attachment.fileName);
      var embedded_image = new RegExp('<img[^>]*' + fn + '[^>]*/>', 'g');
      if (!mail_object.html || !embedded_image.test(document.datas.html)) {
        var anyfetchClient = new AnyfetchClient(null, null, finalCb.apiUrl);
        anyfetchClient.setAccessToken(document.access_token);
        var docAttachment = {};
        docAttachment.metadatas = {};
        docAttachment.metadatas.subject = exists(mail_object.subject);
        docAttachment.identifier = document.identifier + "/" + fn;
        docAttachment.document_type = "file";
        docAttachment.metadatas = {};
        docAttachment.metadatas.path = "/" + fn;
        docAttachment.user_access = document.user_access;
        docAttachment.creation_date = document.creation_date;
        docAttachment.related = [document.identifier,];
        document.related.push(docAttachment.identifier);
        // File to send
        var fileConfigAttachment = function(){
          return {
            file: attachment.content,
            filename: attachment.fileName,
            knownLength: attachment.length
          };
        };

        anyfetchClient.sendDocumentAndFile(docAttachment, fileConfigAttachment, cb);
      }
      else {
        var extension = fn.substr(fn.lastIndexOf('.') + 1);
        if (extension === 'jpeg') {
          extension = 'jpg';
        }

        var image = new Buffer(attachment.content).toString('base64');

        var before = document.datas.html.match(embedded_image);
        var after = before[0].replace(new RegExp('alt=.*' + fn + '.* />', 'g'), 'alt="' + fn + '" src=data:image/' + extension + ';base64,' + image + ' />');
        document.datas.html = document.datas.html.replace(before, after);
        cb();
      }
    }, function(err){
      cb(err, document);
    });
  });

  fs.createReadStream(path).pipe(mailparser);
};
