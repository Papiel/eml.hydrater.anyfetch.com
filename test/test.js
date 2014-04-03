'use strict';

require('should');

var eml = require('../lib/');
var AnyfetchClient = require('anyfetch');

process.env.ANYFETCH_API_URL = 'http://localhost:1338';
var countFile = 0;
var cb = function(url){
  if (url.indexOf("/file") !== -1) {
    countFile += 1;
  }
};

// Create a fake HTTP server
var apiServer = AnyfetchClient.debug.createTestApiServer(cb);
apiServer.listen(1338);
after(function(){
  apiServer.close();
});

describe('Test EML', function() {
  it('returns basic datas', function(done) {
    var document = {
      datas: {},
      metadatas: {},
    };

    eml(__dirname + "/samples/sample.eml", document, function(err, document) {
      if(err) {
        throw err;
      }

      document.should.have.property('document_type', "email");
      document.should.have.property('metadatas');
      document.metadatas.should.have.property('to').and.eql([ { address: 'hugoduroux@free.fr', name: '' } ]);
      document.metadatas.should.have.property('cc').and.eql([]);
      document.metadatas.should.have.property('bcc').and.eql([ { address: 'moby69@hotmail.fr', name: '' }, { address: 'hugoduroux@gmail.com', name: 'Hugo DUROUX' } ]);
      document.metadatas.should.have.property('from').and.eql([ { address: 'hugo.duroux@gmail.com', name: 'Hugo DUROUX' } ]);
      document.metadatas.should.have.property('subject', 'sample');
      document.metadatas.should.have.property('text', 'Hello there!');
      document.should.have.property('creation_date');

      done();
    });
  });

  it('returns text and html for multipart text / html', function(done) {
    var document = {
      datas: {},
      metadatas: {},
    };

    eml(__dirname + "/samples/html-text.eml", document, function(err, document) {
      if(err) {
        throw err;
      }

      document.should.have.property('metadatas').with.property('text').and.include('Hello there!');
      document.should.have.property('datas').with.property('html', '<div dir="ltr">Hello there! In html.<br></div>');

      done();
    });
  });

  it('escapes html in text', function(done) {
    var document = {
      datas: {},
      metadatas: {},
    };

    eml(__dirname + "/samples/html-text.eml", document, function(err, document) {
      if(err) {
        throw err;
      }

      document.should.have.property('metadatas').with.property('text', 'Hello there! &lt;3');

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

      document.should.have.property('metadatas').with.property('text', "Vu qu'elles sont supprimées même si elles servent à plusieurs personnes \n Bonjour Ca va ?");
      document.should.have.property('datas').with.property('html', "<p>Vu qu'elles sont supprimées même si elles servent à plusieurs personnes</p>\n<p>Bonjour</p><p>Ca va ?</p>");

      done();
    });
  });


  it('create new documents for each attachment', function(done) {
    var document = {
      datas: {},
      metadatas: {},
      access_token: "123",
      identifier: "azerty",
    };

    eml(__dirname + "/samples/attachment.eml", document, function(err) {
      if(err) {
        throw err;
      }
      countFile.should.eql(1);
      done();
    });
  });

  it('should include cid images into base64 HTML', function(done){
    var document = {
      datas: {},
      metadatas: {},
      access_token: "123",
      identifier: "azerty",
    };
    eml(__dirname + "/samples/image-included.eml", document, function(err, document) {
      if(err) {
        throw err;
      }

      document.should.have.property('datas').with.property('html').and.include("6WuNurkZ3XOx8a5UuO+fDm66FRskS+RmVqwFo9");

      done();
    });
  });

  it('should have a date', function(done){
    var document = {
      datas: {},
      metadatas: {},
      access_token: "123",
      identifier: "azerty",
    };
    eml(__dirname + "/samples/image-included.eml", document, function(err, document) {
      if(err) {
        throw err;
      }

      document.should.have.property('metadatas').with.property('date', new Date('Fri Jan 18 2013 12:09:13 GMT+0100 (CET)'));
      document.should.have.property('creation_date', new Date('Fri Jan 18 2013 12:09:13 GMT+0100 (CET)'));
      done();
    });
  });
});
