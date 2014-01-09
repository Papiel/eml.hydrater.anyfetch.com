'use strict';

require('should');

var eml = require('../lib/');


describe('Test EML', function() {
  it('returns datas for multipart text / html', function(done) {
    var document = {
      datas: {},
      metadatas: {},
    };

    eml(__dirname + "/samples/html-text.eml", document, function(err, document) {
      if(err) {
        throw err;
      }

      document.should.have.property('document_type', "email");
      document.should.have.property('metadatas');
      document.metadatas.should.have.property('to');
      document.metadatas.should.have.property('cc');
      document.metadatas.should.have.property('bcc');
      document.metadatas.should.have.property('from');
      document.metadatas.should.have.property('subject');
      document.metadatas.should.have.property('text', 'Coucou, ca biche ?\n');
      document.should.have.property('datas');
      document.datas.should.have.property('html', '<div dir="ltr">Coucou, ca biche ?<br></div>\n');

      done();
    });
  });
  it('returns datas for html only version', function(done) {
    var document = {
      datas: {},
      metadatas: {},
    };
    eml(__dirname + "/samples/html-only.eml", document, function(err, document) {
      if(err) {
        throw err;
      }

      document.should.have.property('document_type', "email");
      document.should.have.property('metadatas');
      document.metadatas.should.have.property('to');
      document.metadatas.should.have.property('cc');
      document.metadatas.should.have.property('bcc');
      document.metadatas.should.have.property('from');
      document.metadatas.should.have.property('subject');
      document.metadatas.should.have.property('text', " Vu qu'elles sont supprimées même si elles servent à plusieurs personnes \n Bonjour Ca va ? \n");
      document.should.have.property('datas');
      document.datas.should.have.property('html', "<p>Vu qu'elles sont supprimées même si elles servent à plusieurs personnes</p>\n<p>Bonjour</p><p>Ca va ?</p>\n");

      document.metadatas.text.should.include('Bonjour Ca va ?');
      done();
    });
  });
});
