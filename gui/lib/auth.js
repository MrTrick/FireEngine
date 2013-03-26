/**
 * 
 */

Auth = this.Auth = (function() {
	var auth = {};
	
	//////////////////////////////////////////////////////////////////////////
	//Session handling
	//////////////////////////////////////////////////////////////////////////
	
	//Current session.	
	auth.session = null;

	//--------------------------------
	//Server time tracking
	//--------------------------------
	
	//Attempt to track the difference between client and server time
	var server_time_offset = 0;
	
	var _warned = 0;
	//Every time a response is received, calculate and store the difference between server time and client time
	function addServerTimeHook() {
		$(document).ajaxComplete(function(event,xhr) {
			//TODO: CORS issues - can't get the response header. http://www.html5rocks.com/en/tutorials/cors/
			var date_str = xhr.getResponseHeader("Date");
			if (!date_str && !_warned++) { console.warn("Responses don't contain Date"); return; };
			server_time_offset = Math.round( (new Date(date_str).valueOf() - new Date().valueOf()) / 1000 );
		});
	}
	
	//Return the time on the server, in seconds since epoch
	var getServerTime = auth.getServerTime = function() { 
		return Math.round(Date.now()/1000) + server_time_offset; 
	};

	
	//--------------------------------
	//Authentication hook
	//
	//This function hooks into every request before it's sent.
	//If there is an authenticated session, will 'sign' the request.
	//--------------------------------
	function addAuthenticationHook() {
		$(document).ajaxSend(function(event,xhr,settings) {
			if (auth.session.isAuthenticated()) {
				auth.session.authenticateRequest(xhr, settings);
			}
		});
	}
		
	//--------------------------------
	//Session object
	//Responsible for: 
	//- Tracking whether or not the user is logged in
	//- Storing the client's credentials
	//- Signing all requests so the server will accept them
	//- Automatically signing the user out when their credentials expire
	//- Generating 'login' and 'logout' requests
	//--------------------------------
	var Session = Backbone.Model.extend({
		//Instances need to define a few elements;
		//TODO: Have sensible defaults here.
		//loginUrl : 'auth/login',
		//logoutUrl : 'auth/logout',
		//authenticateRequest : function(xhr, url, params) { ... }
		
		initialize: function(data, options) {
			_.each(['loginUrl', 'logoutUrl'], function(k) {
				if (options[k]) this[k] = options[k];
				if (!this[k]) throw "Must define " + k;
			});
			
			//Use the 'loginUrl' for fetching
			this.url = loginUrl;
		},
	
		//Instances need a 'url' path to log in, like;
		//url: 'auth/login',
		
		defaults: {
			client_key: null,
			expiry: null,
			identity: null
		},
		
		/**
		 * Does the user have a current authentication session?
		 */
		isAuthenticated: function() {
			var expiry = this.get('expiry');
			return this.get('identity') && expiry && expiry > Auth.getServerTime();
		},
		
		/**
		 * Perform a login operation.
		 * Any credentials required for authentication should be included in the data:{} object in the options parameter.
		 * (eg username, password. Other server authentication methods might require different info)
		 */
		login: function(options) {
			options = options ? _.clone(options) : {};
			var success_handler = options.success, error_handler = options.error;
			options.success = function(sess, resp, options) {
				//Set up a trigger to log the user out when their key expires
				if (sess.timeout_trigger) clearTimeout(sess.timeout_trigger);
				sess.timeout_trigger = setTimeout(_.bind(sess.logout, sess), (sess.get('expiry') - Auth.getServerTime())*1000); 

				FlashManager.info("Logged in as " + sess.get("identity"));
				
				//On successful login, trigger a login(session, identity, options) event
				sess.trigger('login', sess, sess.get('identity'), options);
				if (success_handler) success_handler(sess, resp, options);
			};
			options.error = function(sess, xhr, options) {
				if (xhr.status==500) FlashManager.error('Server error, please try again later.');
				else FlashManager.error(JSON.parse(xhr.responseText).error);
				
				if (error_handler) error_handler(sess, xhr, options);
			};
			
			//Authenticate by fetching to the given URL
			this.fetch(_.extend({method:'POST'}, options));

			return this;
		},
		
		/**
		 * Perform a logout operation.
		 * This will clear the session, and trigger a logout event.
		 * If a url is given in options, a 'logout' request is sent to the server
		 */
		logout: function(options) {
			var identity = this.get('identity');
			if (!identity) return; //Already logged out, don't trigger again.

			//Clear all local information about the session
			this.attributes = {};
			this._previousAttributes = {};

			//On logout, trigger a logout(model, identity, options) event
			this.trigger('logout', this, identity, options);
			FlashManager.info("Logged out");

			//Notify the server that we're logging out, don't read the response
			$.ajax(this.logoutUrl, {data:{identity:identity}});
		},
		
		/**
		 * Sign the given request
		 * @param xhr
		 * @param url
		 * @param params
		 */
		authenticateRequest: function(xhr, settings) {
			var method = settings.type;
			var url = settings.url;
			var signature = CryptoJS.HmacSHA256(method+url, this.get('client_key'));
			var auth_block = {
				identity: this.get('identity'),
				expiry: this.get('expiry'),
				signature: signature.toString()
				//url: url //Just for debug/info purposes, not used
			};
			
			//console.log("Encoded '"+method+url+"' with key: " + this.get('client_key'));
			//console.log("Auth block: ", auth_block, "Url", url);
			xhr.setRequestHeader('Authorization', 'HMAC '+$.param(auth_block));
		}
	});

	//////////////////////////////////////////////////////////////////////////
	//Session View
	//////////////////////////////////////////////////////////////////////////
	
	auth.sessionView = null;
	
	
	var SessionView = Backbone.Marionette.ItemView.extend({
		templates: {
			loggedin: _.template(
	          '<div>'+
	            '<p class="navbar-text pull-left">Logged in as {{ identity }}. </p> '+
	              '<a id="logout_btn" class="btn pull-left">Log out</a>'+
	          '</div>'
	        ), 
	        login: _.template(
			  '<form class="navbar-form">'+
	            '<input class="span2" type="text" name="username" placeholder="User Name"> '+
	            '<input class="span2" type="password" name="password" placeholder="Password"> '+
	            '<button id="login_btn" type="submit" class="btn">Log in</button>'+
	          '</form>'
	        )
		},
		getTemplate: function() {
			return this.model.get('identity') ? this.templates.loggedin : this.templates.login;
		},
		initialize: function(options) {
			_.bindAll(this);
			
			//Ensure that any session changes ... wait, this should be caught by 'change' 
			this.model.on('login logout', this.render);
		},
		events: {
			'submit form': 'doLogin',
			'click #logout_btn' : 'doLogout'
		},
		
		/**
		 * Collect the username/password from the form, do a basic check, and pass to the session login()
		 * If login fails, grab the server response and print it.
 		 */
		doLogin: function(e) {
			e.stopPropagation();
			e.preventDefault();
			
			var username = $("input[name=username]").val();
			var password = $("input[name=password]").val();
			if (!username || !password) 
				return FlashManager.error("Missing username or password");
			
			this.model.login({
				data: JSON.stringify({username:username, password:password})
			});
			
		},
		
		/**
		 * Delegate to session
		 */
		doLogout: function(e) {
			e.stopPropagation();
			e.preventDefault();
			this.model.logout();
		}
	});

	//--------------------------------
	//Entry point
	//
	//Called from main code to start the session
	auth.startSession = function(options) {
		if (auth.session) {
			console.warn("Session already started");
		} else {
			auth.session = new Session({}, options);
			auth.sessionView = new SessionView({model:auth.session});
			addServerTimeHook();
			addAuthenticationHook();
			console.log("Started session");
		}
		return auth.session;
	};
	
	return auth;
})();