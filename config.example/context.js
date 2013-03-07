/**
 * 
 */
var _ = require('underscore');
var Backbone = require('backbone');
var bb_couch = require('../lib/bb_couch.js');
var settings = require('./settings.js');
var Activity = require('../lib/activity.js');



var context = {};

//------------------------------------------------------------------
//What libraries are available to scripts?
context._ = _;
context.Backbone = Backbone;
context.JSV = require('JSV').JSV.createEnvironment();
context.Activity = Activity;

//------------------------------------------------------------------
//Example: Define the 'MyExternal' model and collections
var MyExternal = {};
var myexternalsync = bb_couch(settings.myexternaldb);

MyExternal.Model = Backbone.Model.extend({
	idAttribute: '_id',
	sync: myexternalsync
});

MyExternal.Collection = Backbone.Collection.extend({
	model: MyExternal.Model,
	sync: myexternalsync
});

context.MyExternal = MyExternal;

//------------------------------------------------------------------

function contextBuilder(request) {
	var _context = _.extend({}, context);
	
	//Who is the user?
	//THIS IS A TERRIBLE INSECURE METHOD. DON'T DO THIS IN PRODUCTION, USE HMAC.
	var auth = request.headers.authorization;
	if (auth) {
		debugger;
		console.log(auth);
		console.log(new Buffer(auth, 'base64').toString('ascii'));
	} 
	
	return context;
}



module.exports = contextBuilder;