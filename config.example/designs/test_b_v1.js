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
		"to": ["foo"],
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