'use strict';

var fs = require('fs');
var MailParser = require("mailparser").MailParser;
var Encoder = require('node-html-encoder').Encoder;
var AnyfetchClient = require('anyfetch');
var async = require('async');

var hydrationError = require('anyfetch-file-hydrater').hydrationError;

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

module.exports = function(path, document, changes, cb) {
  var finalCb=cb;

  var mailparser = new MailParser();
  var encoder = new Encoder('entity');
  mailparser.on("end", function(mail_object) {
    changes.document_type = "email";
    changes.metadatas.to = [];
    (mail_object.to || []).forEach(function(item) {
      changes.metadatas.to.push(item);
    });
    changes.metadatas.cc = [];
    (mail_object.cc || []).forEach(function(item) {
      changes.metadatas.cc.push(item);
    });
    changes.metadatas.bcc = [];
    (mail_object.bcc || []).forEach(function(item) {
      changes.metadatas.bcc.push(item);
    });
    changes.metadatas.from = exists(mail_object.from);
    changes.metadatas.subject = exists(mail_object.subject);

    if (mail_object.html && mail_object.html.trim() !== '') {
      changes.datas.html = encoder.htmlDecode(mail_object.html).trim();
    }

    if (mail_object.headers && mail_object.headers.date) {
      changes.creation_date = new Date(mail_object.headers.date);
      changes.metadatas.date = new Date(mail_object.headers.date);
    }
    else if (mail_object.date){
      changes.creation_date = new Date(mail_object.date);
      changes.metadatas.date = new Date(mail_object.date);
    }
    if (mail_object.text) {
      changes.metadatas.text = mail_object.text;
    }
    else if (changes.datas.html) {
      changes.metadatas.text = changes.datas.html.replace(reg, " ");
      changes.metadatas.text = changes.metadatas.text.replace("  ", " ");
    }
    else {
      // Special case, with empty HTML section.
      changes.metadatas.text = '';
    }

    // Format text
    changes.metadatas.text = changes.metadatas.text.trim();
    changes.metadatas.text = changes.metadatas.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    changes.related = [];

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
      var fn = attachment.fileName;
      var embedded_image = new RegExp('<img[^>]*cid:' + fn + '[^>]*/>', 'g');
      if (!mail_object.html || !embedded_image.test(changes.datas.html)) {
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
        changes.related.push(docAttachment.identifier);
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

        var before = changes.datas.html.match(embedded_image);
        var after = before[0].replace(new RegExp('alt=.*' + fn + '.* />', 'g'), 'alt="' + fn + '" src=data:image/' + extension + ';base64,' + image + ' />');
        changes.datas.html = changes.datas.html.replace(before, after);
        cb();
      }
    }, function(err){
      if(err) {
        return cb(new hydrationError(err), changes);
      }
      cb(null, changes);
    });
  });

  fs.createReadStream(path).pipe(mailparser);
};
