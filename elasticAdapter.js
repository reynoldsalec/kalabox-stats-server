'use strict';
var ElasticClient = require('elasticsearch');
var Promise = require('bluebird');
var retry = require('retry-bluebird');
var shared = require('./shared.js');
var util = require('util');
var uuid = require('uuid');
var VError = require('verror');

/*
 * Log function.
 */
var log = function(msg) {
  console.log('ELASTICSEARCH: ' + msg);
};

/*
 * Constructor.
 */
function Db(url) {
  log('Created DB: ' + url);
  this.url = url;
  this.index = 'kboxindex';
  this.type = 'metric-entry';
}

/*
 * Find documents that match a query.
 */
Db.prototype.find = function(query) {

  // Save for later.
  var self = this;

  // @todo: will need to see how to handle queries
  // correctly.
  return ElasticClient.search({
    index: self.index,
    q: query
  });

};

/*
 * Insert a new document.
 */
Db.prototype.insert = function(doc) {

  // Save for later.
  var self = this;

  return ElasticClient.index({
    index: self.index,
    type: self.type,
    body: doc
  }, function (err, response) {
    throw new VError(err, 'Error with elasticsearch database at %s', self.url);
  });

};

/*
 * Replace a document.
 */
Db.prototype.replace = function(doc) {

  // Save for later.
  var self = this;

  return self.insert(doc);

};

/*
 * Return all documents in DB.
 */
Db.prototype.getAll = function(fn) {

  // Save for later.
  var self = this;

  return ElasticClient.find('*:*');

};

/*
 * Return all documents that have a given id.
 */
Db.prototype.get = function(id) {

  var self = this;

  return ElasticClient.find({_id: id});

};

/*
 * Create a new document, add it to DB, and then return document.
 */
Db.prototype.create = function() {

  // Save for later.
  var self = this;

  // Create new id.
  var id = uuid.v4();

  // Create document.
  var doc = {
    _id: id,
    created: shared.ts()
  };

  // Find docs with the new id.
  return self.get(id)
  // Make sure there no documents with new id already exist.
  .then(function(docs) {
    if (docs.length > 0) {
      throw new Error('Documents with ID already exists: ' + id);
    }
  })
  // Call insert.
  .then(function() {
    return self.insert(doc);
  });

};

/*
 * Load a document and then append meta data to it.
 */
Db.prototype.append = function(id, metaData) {

  // Save for later.
  var self = this;

  // Validate meta data.
  return Promise.try(function() {
    if (!metaData) {
      throw new Error('Invalid metaData: ' + shared.pp(metaData));
    } else if (!metaData.created) {
      throw new Error('Invalid metaData.created: ' + shared.pp(metaData));
    } else if (!metaData.data) {
      throw new Error('Invalid metaData.data: ' + shared.pp(metaData));
    }
  })
  // Get document.
  .then(function() {
    return self.get(id);
  })
  // Make sure one and only one document exists with id.
  .then(function(docs) {
    if (docs.length === 1) {
      return docs[0];
    } else if (docs.length === 0) {
      throw new Error('Document with ID not found: ' + id);
    } else {
      throw new Error('Conflicting documents found: ' + shared.pp(docs));
    }
  })
  //Update document.
  .then(function(doc) {
    // Make sure meta data array exists.
    if (!doc.metaData) {
      doc.metaData = [];
    }
    // Create new meta data record.
    var record = {
      created: metaData.created,
      recorded: shared.ts(),
      data: metaData.data
    };
    // Add new meta data record to document.
    doc.metaData.push(record);
    return doc;
  })
  // Replace document.
  .then(function(doc) {
    return self.replace(doc);
  });

};

// Return constructor as module object.
module.exports = Db;
