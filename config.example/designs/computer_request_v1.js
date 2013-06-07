/**
 * 
 */
var fs = require('fs');
var path = require('path');

if (typeof module === "undefined") throw "Unexpected context - expected to be called from node.js";
module.exports = {
	id:"computer_request_v1",
	name: "Request Computer",
	version: 1,
	states: ["submitted", "approved", "denied", "withdrawn", "closed"],
	create: {
		//Store the contents of the file inside the action, so it can be retrieved later. 
		request_form: fs.readFileSync( path.dirname(module.filename) + "/computer_request_v1_requestform.html", "utf8"),
		prepare: function() {
			var el = $(action.attributes.request_form);
			
			//What to do when submitted?
			el.submit(function(e) {
				e.preventDefault();
				console.log("Form contents", el.find('form').serializeArray());
				
				//TODO: Get the data from the form.
				var inputs = {};
				
				//Notify completion
				//complete(inputs);
			});
			
			return { 
				el: el,
				render: function() {}
			};
		},
		fire: function() {
			
		},
		to: ['submitted']
	},
	actions: [
  	    {
	    	id: 'approve',
	    	allowed: ['admin', 'approver'],
	    	from: ['submitted'],
	    	to: ['approved', 'closed']
	    	//fire TODO: Make stuff happen
	    },
	    
	    {
	    	id: 'deny',
	    	allowed: ['admin', 'approver'],
	    	from: ['submitted'],
	    	to: ['denied', 'closed']
	    },
	    
	    {
	    	id: 'withdraw',
	    	description: "Cancel and remove the request",
	    	allowed: ['creator', 'admin'],
	    	from: ['submitted'],
	    	to: ['withdrawn', 'closed']
	    },
	    
	    {
	    	id: 'delegate',
	    	allowed: ['approver','admin'],
	    	description: "Forward the request to another person for approval",
	    	from: ['submitted'],
	    	to: ['submitted'],
	    	form: fs.readFileSync( path.dirname(module.filename) + "/computer_request_v1_delegateform.html", "utf8"),
	    	prepare: function() { return new (Backbone.Marionette.ItemView.extend({
				template: _.template(action.attributes.form),
				events: {
					'click #cancel' : function() { cancel("Form cancelled"); },
					//When the form is submitted, fetch and complete the handler
					'submit' : function(e) { e.preventDefault();
						console.log("Form submitted");
						var inputs = {}; _.each( this.$("form").serializeArray(), function(el) { inputs[el.name] = el.value; } );
						complete(inputs);
					}
				}
			}))(); },
			fire: function() {
				//Set the nominated approver
				//TODO: Check existence using EBAT Person instead of User
				if (!inputs.approver) error(new Errors.ServerError("Invalid approver"));
				var approver = new User.Model({id:inputs.approver});
				user.fetch({
					success: function() {
						//Great, add them to the approver role
						roles.approver = roles.approver ? _.union(roles.approver, inputs.approver) : inputs.approver;
						
						//TODO:Email them?
						
						complete();
					},
					error: function(model, e) { error(e); }
				});
			}
	    }

	    
	]
};