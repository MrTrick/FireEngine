/**
 * 
 */
var Backbone = require('backbone');
var bb_couch = require('../lib/bb_couch.js');
var settings = require('./settings.js');

//------------------------------------------------------------------
//What libraries are available to scripts?

exports.console = console; //Allow debugging output
exports._ = _ = require('underscore');
exports.JSV = require('JSV').JSV.createEnvironment();

//------------------------------------------------------------------
//Define the 'MyExternal' model and collections
var MyExternal = exports.MyExternal = {};
var myexternalsync = bb_couch.backboneSync(settings.myexternaldb);

MyExternal.Model = Backbone.Model.extend({
	idAttribute: '_id',
	sync: myexternalsync
});

MyExternal.Collection = Backbone.Collection.extend({
	model: MyExternal.Model,
	sync: myexternalsync
});
