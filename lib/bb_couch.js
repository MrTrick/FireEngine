/*
 * FireEngine - Javascript Activity Engine 
 * 
 * @license Simplified BSD
 * Copyright (c) 2013, Patrick Barnes
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *    
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * Define a Backbone sync function to 'glue' between Backbone and the couchdb backend database
 * 
 * To override the global backbone sync;
 * Backbone.sync = require('./lib/bb_couch.js').backboneSync('http://localhost:5984/dbname');
 * 
 */

var nano = require("nano");

/**
 * Configure and return a sync function for interacting with the given database
 * @param dsn The connection string, eg 'http://localhost:5984/dbname'
 * @return A backbone sync function for that couchdb database 
 */
exports.backboneSync = function(dsn) {
	//Connect to the database and save the nano reference to it
	var db = nano(dsn);

	return function(method, model, options) {
		function handler(err, body, header) {
			//Sync success expects: function(model, resp, options)
			if (!err && options.success) options.success(model, body, options);
			//Sync error expects: function(model, err, options);
			else if (err && options.error) options.error(model, err, options);
		}
		switch(method) {
			case 'read': 
				if (model instanceof Backbone.Model) {
					if (model.isNew()) throw new Error("Can't load new model");
					console.log("Sync: Reading model ", model.id);
					return db.get(model.id, {}, handler);
				} else {
					console.log("Sync: Reading collection");
					var params = _.extend({include_docs:true, reduce:false}, options.params);
					if (options.view) {
						return db.view(
							options.view.design, 
							options.view.name, 
							params, 
							function(err, body, header) {
								handler(err, !err && _.pluck(body.rows, 'doc'), header); 
							}
						); 
					} else {
						return db.list(
							params, 
							function(err, body, header) { 
								handler(err, !err && _.pluck(body.rows, 'doc'), header); 
							}
						);
					}
				}
			case 'create':
			case 'update':
				console.log("Sync: ", method);
				return db.insert(model.toJSON(), {}, function(err, body, header) { handler(err, {_rev:body.rev, _id:body.id}, header); });
			default: 
				throw "Action "+method+" not supported yet";
		}
	};
};