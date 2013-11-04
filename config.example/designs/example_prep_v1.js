/**
 * 
 */
if (typeof exports === "undefined") throw "Unexpected context - expected to be called from node.js";
require("underscore").extend(exports, {
	"id":"example_prep_v1",
	"name": "Example: Prepare Handlers",
	"version": 1,
	"states": ["open", "closed"],
	
	"create": {
		"to": ["open"],
		"prepare": function() {
			return new (Marionette.ItemView.extend({
				template: _.template(
					'<form><fieldset>'+
					'  <legend>Justification</legend>'+
					'  <textarea name="justification" required></textarea>'+
					'  <span class="help-block">Why do you want to create this action?</span>'+
					'  <button type="submit" class="btn">Submit</button>'+
					'  <button id="cancel" class="btn">Cancel</button>'+
				    '</fieldset></form>'
				),
				events: {
					'click #cancel' : function() { cancel("Create cancelled."); },
			        'submit' : 'submit'
				},
				submit: function(e) {
					e.preventDefault();
					//Get the form value
					var justification = this.$('textarea[name=justification]').val();
					
					//Signal the completion of the prep, passing back those inputs. 
					var inputs = {justification:justification};
					complete( inputs );
				}
			}));
		},
		//A corresponding fire handler is needed to deal with any input data		
		"fire": function() {
			if (!inputs.justification) {
				error("Create justification is required");
			} else { 
				data.justification = inputs.justification;
				complete();
			}
		}
	},
	"actions": [
	    {
	    	"id": "nop",
	    	"name": "Do The Nop",
	    	"prepare": function() {
	    		complete({some_field:{contains:'data',even:'objects'}}); 
	    	},
	    	"fire" : function() {
	    		_.extend(data, inputs);
	    		complete();
	    	}
	    },
	    {
	    	"id": "prompt",
	    	"name": "Add some data",
	    	"prepare": function() {
				return new (Backbone.Marionette.ItemView.extend({
					template: _.template(
						//See http://twitter.github.com/bootstrap/base-css.html#forms
						'<form><fieldset>'+
							    '<legend>Something...</legend>'+
							    '<input type="text" name="value" placeholder="Value..." required>'+
							    '<span class="help-block">Type something. Anything but \'frog\'!</span>'+
							    '<button type="submit" class="btn">Submit</button>'+
							    '<button id="cancel" class="btn">Cancel</button>'+
						'</fieldset></form>'
					),
					events: {
						'click #cancel' : function() { cancel("Form cancelled"); },
						'submit' : function(e) {
							e.preventDefault();
							var value = this.$("form input[name=value]").val();
							if (value.match(/frog/i)) cancel("You wrote frog! How could you?");
							else complete({some_text:value});
						}
					}
				}))();
	    	},
	    	"fire": function() {
	    		if (!inputs.some_text) error("Input must specify 'some_text'");
	    		
	    		//Add the given text to the data
	    		if (!data.prompted) data.prompted = [];
	    		data.prompted.push(inputs.some_text);
	    		complete();
	    	}
	    }
	]
});