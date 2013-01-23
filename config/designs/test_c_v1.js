/**
 * 
 */
if (typeof exports === "undefined") throw "Unexpected context - expected to be called from node.js";
require("underscore").extend(exports, {
	"id":"test_c_v1",
	"name": "Rename Object (C; External test)",
	"version": 1,
	"states": ["submitted", "approved", "denied"],
	//Create is a special kind of action. It must be defined, and no actions can have the id 'create'. 
	"create": {
		"prep": function() {
			throw "Not implemented yet - need a GUI first.";
			/* TODO: Needs to get two things - the object id and the name. 
			bootbox.prompt('', function(result) { 
    			if (!result) error('cancelled'); 
    			else success( { new_namec:result}); 
    		});*/
		},
		"fire": function() {
			console.log("inside test_c create fire");
			console.log(this);
			throw "Not implemented";
		},
		"to": "submitted"
	},
	"actions": [
	    {
	    	"id": "approve",
	    	"name": "Approve name-change",
	    	"from" : "submitted",
	    	"fire" : function() {
	    		throw "Not implemented";
	    	},	    	
	    	"to": "approved"
	    },
	    {
	    	"id": "deny",
	    	"name": "Approve name-change",
	    	"from" : "submitted",
	    	"to": "denied"
	    }
	]
});