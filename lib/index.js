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

function exists(item) {
  return item ? item : '';
}

module.exports = function(path, document, changes, cb) {
  var finalCb = cb;

  var mailparser = new MailParser();
  var encoder = new Encoder('entity');

  mailparser.on("end", function(mail_object) {
    changes.document_type = "email";
    changes.metadata.to = [];
    (mail_object.to || []).forEach(function(item) {
      changes.metadata.to.push(item);
    });
    changes.metadata.cc = [];
    (mail_object.cc || []).forEach(function(item) {
      changes.metadata.cc.push(item);
    });
    changes.metadata.bcc = [];
    (mail_object.bcc || []).forEach(function(item) {
      changes.metadata.bcc.push(item);
    });
    changes.metadata.from = exists(mail_object.from);
    changes.metadata.subject = exists(mail_object.subject);

    if(mail_object.html && mail_object.html.trim() !== '') {
      changes.data.html = encoder.htmlDecode(mail_object.html).trim();
    }

    if(mail_object.headers && mail_object.headers.date) {
      changes.creation_date = new Date(mail_object.headers.date);
      changes.metadata.date = new Date(mail_object.headers.date);
    }
    else if(mail_object.date) {
      changes.creation_date = new Date(mail_object.date);
      changes.metadata.date = new Date(mail_object.date);
    }
    if(mail_object.text) {
      changes.metadata.text = mail_object.text;
    }
    else if(changes.data.html) {
      changes.metadata.text = changes.data.html.replace(reg, " ");
      changes.metadata.text = changes.metadata.text.replace("  ", " ");
    }
    else {
      // Special case, with empty HTML section.
      changes.metadata.text = '';
    }

    // Format text
    changes.metadata.text = changes.metadata.text.trim();
    changes.metadata.text = changes.metadata.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    changes.related = [];

    // Delete doc without name and extension
    var attachments = mail_object.attachments || [];
    var filtered_attachments = [];
    attachments.forEach(function(attachment){
      if(attachment.fileName || attachment.generatedFileName.lastIndexOf(".") !== -1){
        attachment.fileName = attachment.generatedFileName;
        filtered_attachments.push(attachment);
      }
    });

    async.each(filtered_attachments, function(attachment, cb) {
      var fn = attachment.fileName;
      var embeddedImage = new RegExp('<img[^>]*cid:' + fn + '[^>]*>', 'ig');
      if(!mail_object.html || !embeddedImage.test(changes.data.html)) {
        var anyfetchClient = new AnyfetchClient(null, null, finalCb.apiUrl);
        anyfetchClient.setAccessToken(document.access_token);
        var docAttachment = {};
        docAttachment.metadata = {};
        docAttachment.metadata.subject = exists(mail_object.subject);
        docAttachment.identifier = document.identifier + "/" + fn;
        docAttachment.document_type = "file";
        docAttachment.metadata = {};
        docAttachment.metadata.path = "/" + fn;
        docAttachment.user_access = document.user_access;
        docAttachment.creation_date = changes.creation_date;
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
        if(extension === 'jpeg') {
          extension = 'jpg';
        }

        var image = new Buffer(attachment.content).toString('base64');

        var before = changes.data.html.match(embeddedImage);
        var after = before[0].replace(new RegExp('alt=.*' + fn + '.* />', 'ig'), 'alt="' + fn + '" src=data:image/' + extension + ';base64,' + image + ' />');
        changes.data.html = changes.data.html.replace(before, after);
        cb();
      }
    }, function(err){
      if(changes.data.html) {
        changes.data.html = changes.data.html.replace(/<img[^>]*cid:[^>]*>/ig, '');
      }
      cb(err, changes);
    });
  });

  fs.createReadStream(path).pipe(mailparser);
};
