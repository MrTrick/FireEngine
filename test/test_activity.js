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
 * Test that the activity object validates correctly 
 */
exports.definition = {
	/**
	 * Empty activity not allowed.
	 */
	testEmpty: function(t) {
		t.expect(6);
		var activity = new Activity.Model({});
		
		t.ok( !activity.isValid(), "An empty activity is invalid");
		
		var errors = activity.validate();
		
		t.equal( errors.length, 2 );
		_.each(errors, function(e) {
			t.equal( e.message, "Property is required" );
		});
		
		//Check that the 'design' validation is done by the design schema (eg a $ref)
		//It follows that the contents of that property will be tested by the design schema for any value. 
		var err_design = _.find(errors, function(e) { return /design$/.test(e.uri); });
		t.ok(err_design, "Design was an error");
		t.equal(err_design.schemaUri, 'urn:design#', "Validation by design schema");
	
		t.done();
	}
	
	// TODO: Write more tests. (As required?)
};

/**
 * Test activity functions
 */
exports.functions = {
	/**
	 * Create a test activity 
	 */
	setUp: function(ready) {
		this.activity = new Activity.Model({
			_id: 'testactivity',
			_rev: '1-123456789012345678901234567890',
			design: {
				id: 'testdesign_v1',
				name: 'Test Design',
				version: 1,
				states: ['opened', 'closed'],
				create: { to: "opened" },
				actions: [
				    { id: 'close', from: ['opened'], to: ['closed'] },
				    { id: 'open', from: ['closed'], to: ['open'] },
				    { id: 'nop' }
				]
			},
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
		});
		ready();
	},
		
	/**
	 * Test the roles() function
	 * @param t
	 */
	roles: function(t) {
		t.expect(3);
		t.deepEqual( this.activity.roles('tuser'), ['creator', 'observer'] );
		t.deepEqual( this.activity.roles('otheruser'), ['observer', 'not_tuser'] );
		t.deepEqual( this.activity.roles('nobody'), [] );
		t.done();
	}
	
	//TODO: Test all other functions in Activity

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
		handler = Activity.coerce("");
		t.equal(typeof handler, "function");
		
		handler = Activity.coerce("return 'foo';");
		t.equal(typeof handler, "function");
		t.equal(handler(), 'foo');
		
		handler = Activity.coerce("return foo;");
		t.equal(typeof handler, "function");
		t.equal(handler.call({foo:"Haggis"}), "Haggis", "Injected scope is visible");
		
		handler = Activity.coerce("return \"stuff\";\n//Hey, a comment!");
		t.equal(typeof handler, "function");
		t.equal(handler(), 'stuff');
		
		t.done();
	}
	
};
