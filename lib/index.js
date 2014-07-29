'use strict';

var fs = require('fs');
var MailParser = require("mailparser").MailParser;
var Encoder = require('node-html-encoder').Encoder;
var Anyfetch = require('anyfetch');
var async = require('async');
var cid = require('npm-cid');
var rarity = require("rarity");

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
    if(changes.data.html) {
      changes.data.html = cid(changes.data.html, attachments);
    }

    var filtered_attachments = [];
    attachments.forEach(function(attachment){
      if(!attachment.applied && (attachment.fileName || attachment.generatedFileName.lastIndexOf(".") !== -1)) {
        attachment.fileName = attachment.generatedFileName;
        filtered_attachments.push(attachment);
      }
    });

    async.each(filtered_attachments, function(attachment, cb) {
      var anyfetch = new Anyfetch(document.access_token);
      anyfetch.setApiUrl(finalCb.apiUrl);

      var docAttachment = {};
      docAttachment.metadata = {};
      docAttachment.metadata.subject = exists(mail_object.subject);
      docAttachment.identifier = document.identifier + "/" + attachment.fileName;
      docAttachment.document_type = "file";
      docAttachment.metadata = {};
      docAttachment.metadata.path = "/" + attachment.fileName;
      docAttachment.user_access = document.user_access;
      docAttachment.creation_date = changes.creation_date;
      docAttachment.related = [document.identifier,];
      changes.related.push(docAttachment.identifier);
      // File to send
      var fileConfigAttachment = {
        file: attachment.content,
        filename: attachment.fileName,
        knownLength: attachment.length
      };

      anyfetch.sendDocumentAndFile(docAttachment, fileConfigAttachment, cb);
    },
    rarity.carry([changes], cb));
  });

  fs.createReadStream(path).pipe(mailparser);
};
