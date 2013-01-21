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
			var context=this;
			this.bootbox.prompt('Create! But first... Tell me something.', function(result) { 
    			if (!result) context.error('cancelled'); 
    			else context.success({created_with_data:result}); 
    		});
		}
	},
	"actions": [
	    {
	    	"id": "nop",
	    	"name": "Do The Nop",
	    	"prep": function() { 
	    		this.success({some_field:{contains:'data',even:'objects'}}); 
	    	}
	    },
	    {
	    	"id": "prompt",
	    	"name": "Add some data",
	    	"prep": function() {
	    		var context=this; 
	    		this.bootbox.prompt('What do you have to say?', function(result) { 
	    			if (!result) context.error('cancelled'); 
	    			else context.success({some_text:result}); 
	    		});
	    	},
	    	"fire": function() {
	    		var prompted_data = this.activity.get('prompted_data')||[]; 
	    		prompted_data.push(this.data.some_text); 
	    		this.activity.set('prompted_data', prompted_data ); 
	    		this.success();
	    	}
	    }
	]
});