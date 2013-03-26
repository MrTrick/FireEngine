/**
 * 
 */
exports.serverport = 8000;
exports.db =  "http://localhost:5984/fireengine";
exports.fire_timeout = 5000;


exports.myexternaldb = "http://localhost:5984/fireengine_testexternal";

exports.auth = {
	server_key: 'SECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRET',
	lifetime: 3600,
		
	adapter: function(credentials, success, failure) {
		var connect = require('connect');
		var LdapAuth = require('ldapauth');
		var ldap = new LdapAuth({
			//....
		});
		
		ldap.authenticate(credentials.username, credentials.password, function(err, user) {
			if (err) failure(err);
			else success();
		});
	} 		
};