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

var _ = require('underscore');
var Activity = require("../lib/activity.js");
//var Sanitize = require("../lib/sanitizer.js");

/**
 * Test that different design definitions validate correctly. 
 */
exports.definition = {
		
	action: {
		/**
		 * Empty actions not allowed.
		 */
		testEmpty: function(t) {
			var action = new Activity.Action({});
			
			t.ok( !action.isValid(), "An empty action is invalid");
			
			var errors = action.validate();
			t.equal(errors.length, 1, "Empty action has 1 problem");
			t.equal(errors[0].message, "Property is required");
			
			t.done();
		},

		/**
		 * Name is set automatically
		 */
		testNameless: function(t) {
			var action = new Activity.Action({
				id: "open"
			});
			
			t.equal( action.get('name'), "Open", "Name is auto-set from id");
			t.ok( action.isValid(), "Minimal action only needs id and name" );
			t.done();
		},
		
		/**
		 * Check which values are/aren't valid
		 */
		testProperties: function(t) {
			var action = new Activity.Action({
				id: "open"
			});

			t.notEqual( action.validate( {"name": null} ), null, "Name; null not ok" );  
			t.notEqual( action.validate( {"name": ""} ), null, "Name; empty string not ok" );
			t.equal( action.validate( {"from": []} ), null, "From; empty array ok" );
			t.notEqual( action.validate( {"from": null} ), null, "From; null not ok" );
			t.equal( action.validate( {"to": ["a","b","c"]} ), null, "To; unique array ok" );
			t.notEqual( action.validate( {"to": ["a","b","b"]} ), null, "To; non-unique array not ok" );
			t.equal( action.validate( {"allowed": "console.log('hi!');"}), null, "Allowed; string ok");

			t.done();
		}
	},
	
	designs: {
		/**
		 * Empty designs not allowed
		 */
		testEmpty: function(t) {
			t.expect(8);
			
			var design = new Activity.Design({});
			t.ok( !design.isValid(), "An empty design is invalid" );
			
			var errors = design.validate();
			t.equal( errors.length, 6);
			_.each(errors, function(e) {
				t.equal( e.message, "Property is required" );
			});
			
			t.done();
		},
		
		/**
		 * Test that a simple design is valid
		 */
		testSimple: function(t) {
			var design = new Activity.Design({
				id: "testsimple_v1", name: "Test Simple", version: 1,
				states: ["open"],
				create: { to: ["open"] },
				actions: [ { id:"nothing" } ]
			});
			t.ok(design.isValid(), "Complete design is valid");
			t.done();
		},
		
		/**
		 * Test that design actions are valid
		 */
		testActions: function(t) {
			var design = new Activity.Design({
				id: "testsimple_v1", name: "Test Simple", version: 1,
				states: ["open"],
				create: { to: ["open"] },
				actions: [ { id:"nothing" } ]
			});

			var create = design.action('create');
			t.ok(create.isValid(), "Create action is valid when read from the design.");
			t.strictEqual(create.design, design, "Create action has reference to original design");
			t.ok(create.activity instanceof Activity.Model, "Create action has reference to blank activity");
			t.ok(create.activity.isNew(), "Create action's activity not saved yet");
			t.done();
		}
	
		/**
		 * TODO: Write more definition tests for design.
		 */
	}
};

/**
 * Validate the example designs
 */
exports.validation = {
	/**
	 * Check common features of the designs
	 */
	testCommon: function(t) { 
		var sync = require('../lib/sync_design.js')(__dirname + "/../config.example/designs");
		Activity.Design.prototype.sync = sync;
		Activity.Design.Collection.prototype.sync = sync;
		
		function checkHandler(handler, msg) {
			if (!handler) return;
			t.doesNotThrow(function() { //doesNotThrow won't unfortunately actually catch any syntax errors 
				//console.log(msg);
				handler = Activity.coerce(handler);
				t.equal(typeof handler, "function");
			}, msg + " failed to instantiate");
		}
		
		var designs = new Activity.Design.Collection();
		designs.on('error', function(designs, error) { t.done(error); });
		designs.fetch({ success: function(designs) {
			t.equal(designs.length, 7, "Expect 7 designs");
			
			designs.each(function(design) {
				//Check built-in validation
				t.ok(design.isValid(), "Expect design to be valid");

				//Check that no handlers were mistakenly called 'prep'
				t.ok( !design.attributes.create.prep, "Should not have 'prep' create handler" );
				_.each(design.attributes.actions, function(action) {
					t.ok( !action.prep, "Should not have 'prep' handler for " + action.id );
				});
				
				//Instantiate each of the design's handlers
				_.each(['allowed', 'prepare', 'fire'], function(type) {
					checkHandler(design.attributes.create[type], design.id + ":create." + type);
					
					_.each(design.attributes.actions, function(action) { 
						checkHandler(action[type], design.id + ":" + action.id + "." + type); 
					});
				});
			});
			
			t.done();
		}});
	}
};