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
						var inputs = {}; 
						_.each( this.$("form").serializeArray(), function(el) { inputs[el.name] = el.value; } );
						complete(inputs);
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
			doc.fetch({
				error: function(doc,errors) { 
					error(_.extend(errors, {message: "MyExternal document '"+inputs.doc_id+"' " + errors.description}));
				},
				success: function() { 
					console.log("Old name is:", doc.get('name'));
					data = { new_name: inputs.name, old_name: doc.get('name') };
					links = { external_doc: inputs.doc_id };
					complete();
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
	    		var doc_id = links.external_doc;
	    		var name = data.new_name;
	    		
	    		doc = new MyExternal.Model({_id: doc_id});
				doc.fetch({
					error: function(doc,errors) { 
						error(_.extend(errors, {message: "MyExternal document '"+doc_id+"' " + errors.description}));
					},
					success: function(doc) {
						doc.save({"name":name},{
							error: function(doc, errors) {
								error(_.extend(errors, {message: "MyExternal document '"+doc_id+" failed to save' " + errors.description}));
							},							
							success: function() {complete();} 
						});
					}
	    		});
	    	}
	    },
	    {
	    	"id": "deny",
	    	"name": "Deny name-change",
	    	"from" : ["submitted"],
	    	"to": ["denied","closed"],
        	"allowed" : function() { return true; /* TODO: This should restrict to particular users. */ }
    	}
	]
});