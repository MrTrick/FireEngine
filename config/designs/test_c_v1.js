/**
 * 
 */
if (typeof exports === "undefined") throw "Unexpected context - expected to be called from node.js";
require("underscore").extend(exports, {
	"id":"test_c_v1",
	"name": "Application: Change Document Name (C; External test)",
	"version": 1,
	"states": ["submitted", "approved", "denied", "closed"],
	//Create is a special kind of action. It must be defined, and no actions can have the id 'create'. 
	"create": {
		"prepare": function() {
			return new (Backbone.Marionette.ItemView.extend({
				template: _.template(
					//See http://twitter.github.com/bootstrap/base-css.html#forms
					'<form>'+
						'<fieldset>'+
						    '<legend>Application: Change Document Name</legend>'+
						    '<label>Name</label>'+
						    '<input type="text" name="name" placeholder="New document name" required >'+
						    '<label>Document ID</label>'+
						    '<input type="text" name="doc_id" placeholder="Document ID" required >'+
						    '<span class="help-block">This is the id of the doc in the <em>fireengine_testexternal</em> database.</span>'+
						    '<button type="submit" class="btn">Submit</button>'+
						    '<button id="cancel" class="btn">Cancel</button>'+
						'</fieldset>'+
					'</form>'
				),
				events: {
					'click #cancel' : function() { cancel("Form cancelled"); },
					'submit' : function(e) {
						e.preventDefault();
						console.log("Form submitted");
						var data = {}; 
						_.each( this.$("form").serializeArray(), function(el) { data[el.name] = el.value; } );
						complete(data);
					}
				}
			}))();
		},
		"fire": function() {
			console.log("inside test_c/create/fire");
			
			//Validate the inputs; should look like {name:"newname",object:"id"}
			var report = JSV.validate(inputs, {
				type: "object", 
				properties: { 
					name: {type: 'string', required: true}, 
					doc_id: {type: 'string', required: true}
				},
				additionalProperties: false
			});
			if (report.errors.length !== 0) return error("Invalid inputs", 403, report.errors);
			
			//Require that the referenced document exists
			var doc = new MyExternal.Model({_id: inputs.doc_id});
			debugger;
			doc.fetch({
				'success': function() { 
					complete({ data:_.extend(inputs, {doc_rev:doc._rev} ) });
				},
				'error' : function(doc,errors) { 
					error({message: "MyExternal document '"+inputs.doc_id+"' not found", code:404, detail: errors});
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
	    	"to": ["approved","closed"],
	    	"allowed" : function() { return true; /* TODO: This should restrict to particular users. */ },
	    	"fire" : function() {
	    		console.log("inside (test_c) "+activity.id+"/approve/fire");
	    		var doc_id = data.doc_id;
	    		var name = data.name;
	    		
	    		//TODO: Check rev somewhere?
	    		doc = new MyExternal.Model({_id: doc_id});
				doc.fetch({
	    			error: function(doc,errors,options) { 
						error({message: "MyExternal document '"+doc_id+"' not found", detail: errors.message, status_code:404}); 
					},
					success: function(doc) {
						doc.save({"name":name},{
							success:function() {complete();}, 
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
	    	"to": ["denied","closed"],
        	"allowed" : function() { return true; /* TODO: This should restrict to particular users. */ }
    	}
	]
});