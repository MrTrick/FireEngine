/**
 * 
 */

var Sanitize = require("./sanitizer.js");
var FireEngine = require("./fireengine.js");
var Errors = require("./errors.js");
var fs = require('fs');

/**
 * Synchronously preload designs and return a sync function over them   
 */
module.exports = function(path) {
	//Maintain a collection of every design
	var designs = new FireEngine.Design.Collection();

	//Preload designs at start-up
	//(This is partly because designs are modules, asynchronous 'require' calls
	// can be complex, and `always` will restart the server if a design changes)
	fs.readdirSync(path).forEach(function(file) {
		if (file.match(/\.js$/)) {
			var data = Sanitize(require(path + "/" + file));
			var design = new FireEngine.Design(data);
			if (errors = design.validate()) {
				console.log("Errors in design " + design.id);
				console.error(errors);
				process.exit(1);
			}
			designs.add(design); //Store the model 
		}
	});
	
	var sync = function(method, model, options) {
		if (method == 'read') {
			if (model instanceof Backbone.Model) {
				if (model.isNew()) options.error(model, "Can't load new model", options);
				console.log("[Sync] Reading model", model.id);
				if (!designs.get(model.id))
					options.error(new Errors.NotFound("No design found"));
				else
					options.success(designs.get(model.id).attributes);
			} else {
				console.log("[Sync] Reading collection");
				//TODO: Filtering! Need to fetch say only active designs
				options.success(designs.models);
			}
		} else {
			console.log("[Sync] Illegal method on design sync", method);
			options.error(model, new Errors.Forbidden("Illegal method on design sync", method), options);
		}
	};
	
	//Make the all-design collection directly available (for sync_activity)
	sync.designs = designs;
	
	return sync;
};