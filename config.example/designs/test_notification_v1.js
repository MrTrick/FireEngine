/**
 * 
 */
if (typeof exports === "undefined") throw "Unexpected context - expected to be called from node.js";
require("underscore").extend(exports, {
	"id": "test_notification_v1",
	"name": "Test Notification",
    "version": 1,
    "states": ["opened"],
    "create" : {
    	"to" : ["opened"]
    },
    "actions": [
		{
			"id" : "notify",
			"fire": function() { 
				console.log("Sending email to ", user.id, user.get('primary_email') );
				//TODO: Not working...
				email({
					to: user.get('email_primary'),
					subject: "Test - Notification",
					html: "<h2>Hooray</h2>Hey there, you're getting an email notification!"
				}, function(err) {
					if (err) error(err);
					else complete();
				});
			}
		}
	]
});