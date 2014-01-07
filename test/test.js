'use strict';

require('should');

var eml = require('../lib/');


describe('Test EML results', function() {
  it('returns the correct informations', function(done) {
    var document = {
      datas: {},
      metadatas: {},
    };

    eml(__dirname + "/samples/cci.eml", document, function(err, document) {
      if(err) {
        throw err;
      }

      document.should.have.property('document_type', "email");
      document.should.have.property('metadatas');
      document.metadatas.should.have.property('to');
      document.metadatas.should.have.property('from');
      document.metadatas.should.have.property('subject');
      document.metadatas.should.have.property('text');
      document.should.have.property('datas');
      document.datas.should.have.property('html');

      document.datas.html.should.include('<div dir="ltr">h<br></div>');
      done();
    });
  });
});
