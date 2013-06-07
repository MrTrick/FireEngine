/**
 * 
 */

var Sanitize = require("./sanitizer.js");
var Activity = require("./activity.js");
var Errors = require("./errors.js");
var fs = require('fs');

/**
 * Synchronously preload designs and return a sync function over them   
 */
module.exports = function(path) {
	//Maintain a list of designs in-memory
	var designs = {};

	//Preload designs at start-up
	//(This is partly because designs are modules, asynchronous 'require' calls
	// can be complex, and `always` will restart the server if a design changes)
	fs.readdirSync(path).forEach(function(file) {
		if (file.match(/\.js$/)) {
			var design = Sanitize(require(path + "/" + file)); 
			var data = Activity.environment.createInstance(design, design.id);
			var report = Activity.schemas.design.validate(data);
			if (report.errors.length) {
				console.log(design.id);
				console.error(report.errors);
				process.exit(1);
			}
			designs[design.id] = design; //Store the data, not the actual model. 
		}
	});
	
	var sync = function(method, model, options) {
		if (method == 'read') {
			if (model instanceof Backbone.Model) {
				if (model.isNew()) options.error(model, "Can't load new model", options);
				console.log("[Sync] Reading model", model.id);
				if (!designs[model.id])
					options.error(new Errors.NotFound("No design found"));
				else
					options.success(designs[model.id]);
			} else {
				console.log("[Sync] Reading collection");
				//TODO: Filtering?
				options.success(_.values(designs));
			}
		} else {
			console.log("[Sync] Illegal method on design sync", method);
			options.error(model, new Errors.Forbidden("Illegal method on design sync", method), options);
		}
	};
	
	//Make the designs directly available (for sync_activity)
	sync.designs = designs;
	
	return sync;
};