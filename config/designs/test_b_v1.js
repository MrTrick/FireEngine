/**
 * 
 */
if (typeof exports === "undefined") throw "Unexpected context - expected to be called from node.js";
require("underscore").extend(exports, {
	"id":"test_b_v1",
	"name": "Prep Test (B)",
	"version": 1,
	"states": ["foo"],
	//Create is a special kind of action. It must be defined, and no actions can have the id 'create'. 
	"create": {
		"to": "foo",
		"prep": function() {
			bootbox.prompt('Create! But first... Tell me something.', function(result) { 
    			if (!result) cancel('User cancelled');
    			else complete({created_with_data:result}); 
    		});
		}
	},
	"actions": [
	    {
	    	"id": "nop",
	    	"name": "Do The Nop",
	    	"prep": function() {
	    		complete({some_field:{contains:'data',even:'objects'}}); 
	    	}
	    },
	    {
	    	"id": "prompt",
	    	"name": "Add some data",
	    	"prep": function() {
	    		bootbox.prompt('What do you have to say?', function(result) {
	    			if (!result) cancel('User cancelled');
	    			else complete({some_text:result}); 
	    		});
	    	},
	    	"fire": function() {
	    		if (!inputs.some_text) error("Input must specify 'some_text'");
	    		
	    		//Add the given text to the data
	    		if (!data.prompted) data.prompted = [];
	    		data.prompted.push(data.some_text);
	    		complete();
	    	}
	    }
	]
});