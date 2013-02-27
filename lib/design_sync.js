/**
 * 
 */

var Sanitize = require("./sanitizer.js");
var Activity = require("./activity.js");
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
			//if (report.errors.length) {
				console.log(design.id);
				console.error(report.errors);
				//process.exit(1);
			//}
			
			//TODO : Validate the design before loading.
			//require('./lib/validation.js').validate_design();
			
			designs[design.id] = new Activity.Design(design);
		}
	});
	
	return function(method, model, options) {
		if (method == 'read') {
			if (model instanceof Backbone.Model) {
				if (model.isNew()) options.error(model, "Can't load new model", options);
				console.log("[Sync] Reading model", model.id);
				if (!designs[model.id]) options.error(model, new Activity.Error("No design found", 404), options);
				options.success(model, designs[model.id], options);
			} else {
				console.log("[Sync] Reading collection");
				//TODO: Filtering?
				options.success(model, _.values(designs), options);
			}
		} else {
			console.log("[Sync] Illegal method on design sync", method);
			options.error(model, new Activity.Error("Illegal method on design sync", 403), options);
		}
	};
};