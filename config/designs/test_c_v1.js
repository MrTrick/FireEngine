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
			console.log("inside test_c/create/fire");
			
			//Validate the data ; should look like {name:"newname",object:"id"}
			var report = JSV.validate(data, {
				type: "object", 
				properties: { 
					name: {type: 'string', required: true}, 
					doc_id: {type: 'string', required: true}
				},
				additionalProperties: false
			});
			if (report.errors.length !== 0) return error( report.errors, 403);
			
			//Load the referenced document
			var doc = new MyExternal.Model({_id: data.doc_id});
			doc.fetch({
				error: function(doc,errors,options) { 
					error({message: "MyExternal document '"+data.doc_id+"' not found", detail: errors.message, status_code:404}); 
				},
				success: function() {
					//If the doc exists, great! Save the revision, and customise the saved data    
					success(_.extend(data, {doc_rev:doc._rev})); 
				}
			});
		},
		"to": ["submitted"]
	},
	"actions": [
	    {
	    	"id": "approve",
	    	"name": "Approve name-change",
	    	"from" : ["submitted"],
	    	"to": ["approved"],
	    	"allowed" : function() { return true; /* TODO: This should restrict to particular users. */ },
	    	"fire" : function() {
	    		console.log("inside (test_c) "+activity.id+"/approve/fire");
	    		var doc_id = activity.get('doc_id');
	    		var name = activity.get('name');
	    		
	    		//TODO: Check rev somewhere?
	    		(new MyExternal.Model({_id: doc_id})).fetch({
	    			error: function(doc,errors,options) { 
						error({message: "MyExternal document '"+doc_id+"' not found", detail: errors.message, status_code:404}); 
					},
					success: function(doc) {
						doc.save({"name":name},{
							success:function() {success();}, 
							error:function(doc, errors, options) {
								error({message:"MyExternal document '"+doc_id+"' failed to save", detail: errors.message, status_code:404});
							}
						});
					}
	    		});
	    	}
	    },
	    {
	    	"id": "deny",
	    	"name": "Approve name-change",
	    	"from" : ["submitted"],
	    	"to": ["denied"],
        	"allowed" : function() { return true; /* TODO: This should restrict to particular users. */ }
    	}
	]
});