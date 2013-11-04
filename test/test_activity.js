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
var FireEngine = require("../lib/fireengine.js");
//var Sanitize = require("../lib/sanitizer.js");

/**
 * Test that the activity object validates correctly 
 */
exports.definition = {
	/**
	 * Empty activity not allowed.
	 */
	testEmpty: function(t) {
		t.expect(6);
		var activity = new FireEngine.Activity({});
		
		t.ok( !activity.isValid(), "An empty activity is invalid");
		
		var errors = activity.validate();

		//Check that the errors are as expected;
		t.equal( errors.length, 2 );
		_.each(errors, function(e) { t.equal( e.message, "Property is required" ); });
		
		t.equal( _.filter(errors, function(error) { return error.uri.match(/design$/); } ).length, 1);
		t.equal( _.filter(errors, function(error) { return error.uri.match(/state$/); } ).length, 1);
	
		t.done();
	},
	
    testBadDesignId: function(t) {
    	//Remove any designs from the all collection
    	FireEngine.Design.Collection.all.reset();
    	var activity = new FireEngine.Activity({design: "some_design_v1", state: ['opened']} );
    	
    	var old_write = process.stderr.write;
    	process.stderr.write = function() {};     	
    	try {
    		
    		//Run inside an area that has STDERR suppressed - doesn't print console.error() calls
    		var errors = activity.validate();
    		
    	} finally { process.stderr.write = old_write; }
    	
    	t.equal( errors.length, 1 );
    	t.equal( errors[0], "Design some_design_v1 does not exist.");
    	
    	t.done();
    }
};

/**
 * Test activity functions
 */
exports.functions = {
	/**
	 * Create a test activity 
	 */
	setUp: function(ready) {
		FireEngine.baseUrl = '';
		
		var testdesign_v1 = new FireEngine.Design({
			id: 'testdesign_v1',
			name: 'Test Design',
			version: 1,
			states: ['opened', 'closed'],
			create: { to: "opened" },
			allowed: {
				//Filled later...
			},
			actions: [
			    { id: 'close', from: ['opened'], to: ['closed'] },
			    { id: 'open', from: ['closed'], to: ['open'] },
			    { id: 'nop' }
			]
		});
		FireEngine.Design.Collection.all.reset(testdesign_v1);
		
		this.activity = new FireEngine.Activity({
			id: '8675309867530986753098675309',
			_rev: '1-123456789012345678901234567890',
			design: 'testdesign_v1',
			state: ['opened'],
			data: {},
			roles: {
				'creator': ['tuser'],
				'approver': [],
				'observer': ['otheruser', 'tuser'],
				'not_tuser': ['otheruser', 'ehumperdink']
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
		}, {design: testdesign_v1});
		ready();
	},
	
	/**
	 * Test the url/urlRoot function - expect it to sit under FireEngine.baseUrl
	 */
	urlRoot: function(t) {
		FireEngine.baseUrl = '';
		t.equal( this.activity.urlRoot(), "activities/" );
		FireEngine.baseUrl = 'http://server/';
		t.equal( this.activity.urlRoot(), "http://server/activities/" );
		t.equal( this.activity.url(), "http://server/activities/8675309867530986753098675309" );
		t.expect(3);
		t.done();
	},
	
	/**
	 * activity.actions() should return all the available actions on the activity
	 */
	actions: function(t) {
		var activity = this.activity;
		var actions = activity.actions();
		
		t.ok( actions instanceof FireEngine.Action.Collection, "Expect a collection of actions" );
		t.equal( actions.length, 3);
		_.each(['close','open','nop'], function(id) {
			var action = actions.get(id);
			t.ok( action instanceof FireEngine.Action, "Action is valid" );
			t.strictEqual( action.activity, activity, "Action has a reference to the original activity" );
			var design_action_attrs = _.findWhere(activity.design.attributes.actions, {id:id});
			t.deepEqual( _.pick(action.attributes, _.keys(design_action_attrs)), design_action_attrs, "Action has at least all the same attributes as the design" );
        });
		t.expect(11);
		t.done();	
	},
	
	/**
	 * activity.action(id) should return one action
	 */
	action: function(t) {
		var activity = this.activity;
		_.each(['close','open','nop'], function(id) {
			var action = activity.action(id);
			t.ok( action instanceof FireEngine.Action, "Action is valid" );
			t.equal( action.id, id, "Right action fetched" );
		});
		_.each([null, undefined, 0, '', 'nonexistent'], function(bad_id) {
			var action = activity.action(bad_id);
			t.equal( action, null, "No such action, returns null" );
		});
		t.expect(11);
		t.done();
	},
	
	/**
	 * Test the roles() function
	 * @param t
	 */
	roles: function(t) {
		t.deepEqual( this.activity.roles('tuser'), ['creator', 'observer'] );
		t.deepEqual( this.activity.roles('otheruser'), ['observer', 'not_tuser'] );
		t.deepEqual( this.activity.roles('nobody'), [] );
		t.expect(3);
		t.done();
	},
	
	/**
	 * activity.history() should return a collection of history objects
	 * @param t
	 */
	history: function(t) {
		var history = this.activity.history();
		t.ok( history instanceof FireEngine.Activity.History.Collection, "Expect a collection of history" );
		t.equal( history.length, 1);
		t.expect(2);
		t.done();
	},
	
	/**
	 * activity.allowed(operation, context) should return true/false on whether 
	 * an _operation_ is permitted. eg 'read', 'fire'
	 * __NOT the same as whether something is permitted per-action__ 
	 * @param t
	 */
	allowed: function(t) {
		var activity = this.activity;
		var design = activity.design;
		t.ok( design );
		
		_.each([null, {}, {read:null}, {read: []}, {read: {}}], function(allowed) {
			t.ok( design.set('allowed', allowed) ); 
			t.ok( activity.allowed('read', {user:null}), "No rule? Allow. ("+JSON.stringify(allowed)+")" );
		});
		
		// (THE fire:creator RULE IS TERRIBLE IN PRACTICE - SEE TICKET #96)
		_.each([
            "creator", 
            ["creator"], 
            ["creator", "somethingelse"], 
            {any:["creator","somethingelse"]}, 
            function() { return (this.user && this.user.id==='tuser'); }
        ], function(fire_rule) {
			t.ok( design.set('allowed', {fire: fire_rule}) );
			t.ok( !activity.allowed('fire'), "Simple rule - anon not permitted. ("+JSON.stringify(fire_rule)+")" );
			t.ok( !activity.allowed('fire', {user:null}), "Simple rule - anon not permitted. ("+JSON.stringify(fire_rule)+")");
			t.ok( !activity.allowed('fire', {user:{ roles: [] }}), "Simple rule - anon not permitted. ("+JSON.stringify(fire_rule)+")");
			t.ok( activity.allowed('fire', {user:{ id:'tuser' }}), "Simple rule - creator permitted. ("+JSON.stringify(fire_rule)+")");
		});
		
		t.done();
	}
};



/**
 * Test the Activity utility functions 
 */
exports.utilities = {
	/**
	 * Test the coercion function - especially, check syntax error that occured if handler had //comments on last line  
	 */
	testCoercion: function(t) {
		var handler;
		handler = FireEngine.coerce("");
		t.equal(typeof handler, "function");
		
		handler = FireEngine.coerce("return 'foo';");
		t.equal(typeof handler, "function");
		t.equal(handler(), 'foo');
		
		handler = FireEngine.coerce("return foo;");
		t.equal(typeof handler, "function");
		t.equal(handler.call({foo:"Haggis"}), "Haggis", "Injected scope is visible");
		
		handler = FireEngine.coerce("return \"stuff\";\n//Hey, a comment!");
		t.equal(typeof handler, "function");
		t.equal(handler(), 'stuff');
		
		t.done();
	}
	
};
