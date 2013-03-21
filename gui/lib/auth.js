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
	
	//Every time a response is received, calculate and store the difference between server time and client time
	function addServerTimeHook() {
		$(document).ajaxComplete(function(event,xhr) {
			var date_str = xhr.getResponseHeader("Date");
			if (!date_str) { console.log("Response didn't contain Date"); return; }
			server_time_offset = Math.round( (new Date(date_str).valueOf() - new Date().valueOf()) / 1000 );
		});
	}
	
	//Return the time on the server, in seconds since epoch
	var getServerTime = auth.getServerTime = function() { 
		return Math.round(Date.now()/1000) + server_time_offset; 
	};
	
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
			_.each(['loginUrl', 'logoutUrl', 'authenticateRequest'], function(k) {
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
			return this.get('identity') && expiry && expiry > App.getServerTime();
		},
		
		/**
		 * Perform a login operation.
		 * Any credentials required for authentication should be included in the data:{} object in the options parameter.
		 * (eg username, password. Other server authentication methods might require different info)
		 */
		login: function(options) {
			options = options ? _.clone(options) : {};
			var success = options.success;
			options.success = function(sess, resp, options) {
				//Set up a trigger to log the user out when their key expires
				if (sess.timeout_trigger) clearTimeout(sess.timeout_trigger);
				sess.timeout_trigger = setTimeout(_.bind(sess.logout, sess), (sess.get('expiry') - App.getServerTime())*1000); 

				//On successful login, trigger a login(session, identity, options) event
				sess.trigger('login', sess, sess.get('identity'), options);
				if (success) success(sess, resp, options);
			};
			
			//Authenticate by fetching to the given URL
			this.fetch(options);

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

			//Notify the server that we're logging out, don't read the response
			if (options.url)
				$.ajax(options.url, {data:{identity:identity}});
		}
	});
	
	//--------------------------------
	//Authentication hook
	//
	//This function hooks into every request before it's sent.
	//If there is an authenticated session, will 'sign' the request.
	//--------------------------------
	function addAuthenticationHook() {
		$(document).ajaxSend(function(event,xhr,params) {
			if (auth.session.isAuthenticated()) {
				var method = params['type'];
				var base = window.location.href.substring(0, window.location.href.length - window.location.search.length);
				var url = base + params['url']; //The absolute url for the request TODO: Make more reliable
				
				auth.session.authenticateRequest.call(auth.session, xhr, url, params);
			}
		});
	}
	
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

	//////////////////////////////////////////////////////////////////////////
	//Session View
	//////////////////////////////////////////////////////////////////////////
	
	auth.sessionView = null;
	
	
	var SessionView = Backbone.Marionette.ItemView.extend({
		templates: {
			identified: _.template(
	          '<div>'+
	            '<p class="navbar-text pull-left">Logged in as {{ identity }}. </p> '+
	              '<a id="logout_btn" class="btn pull-left">Log out</a>'+
	          '</div>'
	        ), 
	        unidentified: _.template(
			  '<form class="navbar-form">'+
	            '<input class="span2" type="text" name="username" placeholder="User Name"> '+
	            '<input class="span2" type="password" name="password" placeholder="Password"> '+
	            '<button id="login_btn" type="submit" class="btn">Log in</button>'+
	          '</form>'
	        )
		},
		template: function(data) {
			return this.templates[ data.identity ? "identified" : "unidentified" ](data); 
		},
		initialize: function(options) {
			_.bindAll(this);
			
			//Ensure that any session changes ... wait, this should be caught by 'change' 
			//this.model.on('login logout', this.render());
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
				data:{username:username, password:password},
				error: _.bind(function(sess, xhr, options) {
					if (xhr.status==500) 
						FlashManager.error('Server error, please try again later.');
					else
						FlashManager.error(JSON.parse(xhr.responseText).error);
				}, this)
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
	
	return auth;
})();