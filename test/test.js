'use strict';

require('should');

var eml = require('../lib/');
var AnyfetchClient = require('anyfetch');
var anyfetchHydrater = require('anyfetch-hydrater');

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
  it('returns basic data', function(done) {
    var document = {
      data: {},
      metadata: {},
    };

    var changes = anyfetchHydrater.defaultChanges();

    eml(__dirname + "/samples/sample.eml", document, changes, function(err, changes) {
      if(err) {
        throw err;
      }

      changes.should.have.property('document_type', "email");
      changes.should.have.property('metadata');
      changes.metadata.should.have.property('to').and.eql([ { address: 'hugoduroux@free.fr', name: '' } ]);
      changes.metadata.should.have.property('cc').and.eql([]);
      changes.metadata.should.have.property('bcc').and.eql([ { address: 'moby69@hotmail.fr', name: '' }, { address: 'hugoduroux@gmail.com', name: 'Hugo DUROUX' } ]);
      changes.metadata.should.have.property('from').and.eql([ { address: 'hugo.duroux@gmail.com', name: 'Hugo DUROUX' } ]);
      changes.metadata.should.have.property('subject', 'sample');
      changes.metadata.should.have.property('text', 'Hello there!');
      changes.should.have.property('creation_date');

      done();
    });
  });

  it('returns text and html for multipart text / html', function(done) {
    var document = {
      data: {},
      metadata: {},
    };

    var changes = anyfetchHydrater.defaultChanges();

    eml(__dirname + "/samples/html-text.eml", document, changes, function(err, changes) {
      if(err) {
        throw err;
      }

      changes.should.have.property('metadata').with.property('text').and.include('Hello there!');
      changes.should.have.property('data').with.property('html', '<div dir="ltr">Hello there! In html.<br></div>');

      done();
    });
  });

  it('escapes html in text', function(done) {
    var document = {
      data: {},
      metadata: {},
    };

    var changes = anyfetchHydrater.defaultChanges();

    eml(__dirname + "/samples/html-text.eml", document, changes, function(err, changes) {
      if(err) {
        throw err;
      }

      changes.should.have.property('metadata').with.property('text', 'Hello there! &lt;3');

      done();
    });
  });

  it('returns data for html only version', function(done) {
    var document = {
      data: {},
      metadata: {},
    };

    var changes = anyfetchHydrater.defaultChanges();

    eml(__dirname + "/samples/html-only.eml", document, changes, function(err, changes) {
      if(err) {
        throw err;
      }

      changes.should.have.property('metadata').with.property('text', "Vu qu'elles sont supprimées même si elles servent à plusieurs personnes \n Bonjour Ca va ?");
      changes.should.have.property('data').with.property('html', "<p>Vu qu'elles sont supprimées même si elles servent à plusieurs personnes</p>\n<p>Bonjour</p><p>Ca va ?</p>");

      done();
    });
  });


  it('create new documents for each attachment', function(done) {
    var document = {
      data: {},
      metadata: {},
      access_token: "123",
      identifier: "azerty",
    };

    var changes = anyfetchHydrater.defaultChanges();

    eml(__dirname + "/samples/attachment.eml", document, changes, function(err) {
      if(err) {
        throw err;
      }
      countFile.should.eql(1);
      done();
    });
  });

  it('should include cid images into base64 HTML', function(done) {
    var document = {
      data: {},
      metadata: {},
      access_token: "123",
      identifier: "azerty",
    };

    var changes = anyfetchHydrater.defaultChanges();

    eml(__dirname + "/samples/image-included.eml", document, changes, function(err, changes) {
      if(err) {
        throw err;
      }

      changes.should.have.property('data').with.property('html').and.include("6WuNurkZ3XOx8a5UuO+fDm66FRskS+RmVqwFo9");

      done();
    });
  });

  it('should remove bad cid images into base64 HTML', function(done) {
    var document = {
      data: {},
      metadata: {},
      access_token: "123",
      identifier: "azerty",
    };

    var changes = anyfetchHydrater.defaultChanges();

    eml(__dirname + "/samples/ninja-cid.eml", document, changes, function(err, changes) {
      if(err) {
        throw err;
      }

      changes.should.have.property('data').with.property('html').and.not.include("cid:");

      done();
    });
  });

  it('should have a date', function(done){
    var document = {
      data: {},
      metadata: {},
      access_token: "123",
      identifier: "azerty",
    };

    var changes = anyfetchHydrater.defaultChanges();

    eml(__dirname + "/samples/image-included.eml", document, changes, function(err, changes) {
      if(err) {
        throw err;
      }

      changes.should.have.property('metadata').with.property('date', new Date('Fri Jan 18 2013 12:09:13 GMT+0100 (CET)'));
      changes.should.have.property('creation_date', new Date('Fri Jan 18 2013 12:09:13 GMT+0100 (CET)'));
      done();
    });
  });

});
