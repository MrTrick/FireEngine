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
 * Test aspects of the server application 
 */
var _ = require("underscore");
var Activity = require("../lib/activity.js");
var AppActivity = require("../app/activity.js");
var User = require("../lib/user.js");
var Errors = require("../lib/errors.js");

var activity_skeleton = {
	design: {
		id: 'testdesign_v1',
		name: 'Test Design',
		version: 1,
		states: ['opened'],
		create: { to: "opened" },
		actions: [ { id: 'nop' } ]
	},
	state: ['opened'],
	data: {foo:'foo'},
	roles: {
		'creator': ['tuser']
	},
	links: {},
	history: [
        {
        	when: "2001-01-01T00:00:00+11:00",
        	message: "Created activity",
        	who: "tuser",
        	action: "create"
        }
	]
};

exports.activity = {
	setUp: function(ready) {
		var activity_data = [];
		activity_data[1] = _.extend({}, activity_skeleton, {_id:'1'});
		activity_data[1].design = _.clone(activity_skeleton.design);
		
		activity_data[2] = _.extend({}, activity_skeleton, {_id:'2'});
		activity_data[2].design = _.clone(activity_skeleton.design);
		activity_data[2].design.allowed = {read: ['admin']};
		
		activity_data[3] = _.extend({}, activity_skeleton, {_id:'3'});
		activity_data[3].design = _.clone(activity_skeleton.design);
		activity_data[3].design.allowed = {read: ['admin', 'creator']};
		
		Activity.Model.prototype.sync = Activity.Collection.prototype.sync = function(action, model, options) {
			if (action != 'read' && !(model instanceof Activity.Model)) throw new Error("Not implemented");
			process.nextTick(function() {
				data = activity_data[parseInt(model.id)]; 
				if (data) options.success(data);
				else options.error(new Errors.NotFound());
			});
		};
		ready();
	},
	

	/**
	 * Check that the loadActivity parameter loader behaves as it should
	 */
	loadActivity: {
		/**
		 * Loading an activity with no read restriction
		 */
		simple: function(t) {
			var req = {}; //No user defined
			var next = function(error) {
				t.ok(!error, "Loads successfully");
				t.ok(req.activity, "Injects activity into request");
				t.equal(req.activity && req.activity.id, 1, "Loads correct activity");
				t.done();
			};
			AppActivity.loadActivity(req, null, next, "1");
		},
		/**
		 * Loading an activity requiring the 'admin' role
		 */
		readControl: {
			//Admin not permitted to read.
			asAnon: function(t) {
				var req = {};
				var next = function(error) {
					t.ok(error, "Read not permitted");
					t.ok(error instanceof Errors.Unauthorized, 'Expect an unauthorized response');
					t.equal(error.message, "Reading this activity not permitted");
					t.done();
				};
				AppActivity.loadActivity(req, null, next, "2");
		    },
		    //Fred doesn't have needed role
		    asUnprivileged: function(t) {
		    	var req = { context: { user: new User.Model({ id: 'fred', roles: ['noob'] }) } };
		    	var next = function(error) {
					t.ok(error, "Read not permitted");
					t.ok(error instanceof Errors.Forbidden, 'Expect a forbidden response');
					t.equal(error.message, "Reading this activity not permitted");
					t.done();
				};
				AppActivity.loadActivity(req, null, next, "2");
		    },
		    //Bill is an admin
		    asAdmin: function(t) {
				var req = { context: { user: new User.Model({ id: 'bill', roles: ['admin', 'alpha', 'omega'] }) } };
				var next = function(error) {
					t.ok(!error, "Loads successfully");
					t.ok(req.activity, "Injects activity into request");					
					t.equal(req.activity && req.activity.id, 2, "Loads correct activity");
					t.done();
				};
				AppActivity.loadActivity(req, null, next, "2");
			}
		},
		
		/**
		 * Read uses contextual roles
		 */
		readControlWithContext: { 
			//Bill can read - has one of the ingrained roles
		    asAdmin: function(t) {
				var req = { context: { user: new User.Model({ id: 'bill', roles: ['admin', 'alpha', 'omega'] }) } };
				var next = function(error) {
					t.ok(!error, "Loads successfully");
					t.ok(req.activity, "Injects activity into request");					
					t.equal(req.activity && req.activity.id, 3, "Loads correct activity");
					t.done();
				};
				AppActivity.loadActivity(req, null, next, "3");
			},
			//tuser can read - has a contextual role 'creator' on the activity  
			asCreator: function(t) {
				var req = { context: { user: new User.Model({ id: 'tuser', roles: ['just', 'some', 'user'] }) } };
				var next = function(error) {
					t.ok(!error, "Loads successfully");
					t.ok(req.activity, "Injects activity into request");					
					t.equal(req.activity && req.activity.id, 3, "Loads correct activity");
					t.done();
				};
				AppActivity.loadActivity(req, null, next, "3");
			}
		}
	},
	
	/**
	 * Check that 'read' works correctly
	 */
	read: function(t) {
		var req = {};
		AppActivity.loadActivity(req, null, function(error) {
			t.ok(!error, "Loads successfully");
			
			AppActivity.read(req, {
				send: function(data) {
					t.ok(data);
					t.equal(data._id, "1");
					t.done();
				}
			}, null);
		}, "1");
	}
	
	/**
	 * Check that 'index' works correctly: TODO
	 */
	
	/**
	 * Check that 'fire' works correctly: TODO
	 */
	
};

exports.auth = {
		
};

exports.design = {
		
};