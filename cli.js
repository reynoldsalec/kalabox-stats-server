'use strict';

var shared = require('./shared.js');

var Client = require('./client.js');
var Promise = require('bluebird');
var config = require('./config.json');

var client = new Client(null, config.web);

client.create()
.then(function() {
  return client.report({action: 'one'});
})
.then(function() {
  return client.report({action: 'two'});
})
.then(function() {
  return client.report({action: 'three'});
})
.then(function() {
  return client.report({action: 'four'});
})
.then(function() {
  return client.get()
  .then(function(data) {
    console.log(shared.pp(data));
  });
})
.then(function() {
  process.exit(0);
}, function(err) {
  throw err;
});
