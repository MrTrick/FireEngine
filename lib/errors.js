/*
 * FireEngine - Javascript Activity Engine 
 * 
 * @license Simplified BSD
 * Copyright (c) 2013, Patrick Barnes
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *    
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Simple error library to wrap and include all HTTP errors.
 * 
 * Helps to provide semantic clues when errors occur.
 * 
 * @author Patrick Barnes
 */

(function() {
	//Housekeeping - ensures the file is usable on node.js and on browser
	var Errors = this.Errors = this.window ? {} : exports;

	var status_codes = {
	  400: 'Bad request',
	  401: 'Unauthorized',
	  402: 'Payment Required',
	  403: 'Forbidden',
	  404: 'Not Found',
	  405: 'Not Allowed',
	  406: 'Not Acceptable',
	  407: 'Proxy Authentication Required',
	  408: 'Request Timeout',
	  409: 'Resource Conflict',
	  410: 'Resource Gone',
	  411: 'Length Required',
	  412: 'Precondition Failed',
	  413: 'Request Entity Too Large',
	  414: 'Request-URI Too Long',
	  415: 'Unsupported Media Type',
	  416: 'Requested Range Not Satisfiable',
	  417: 'Expectation Failed',
	  418: 'I\'m A Teapot',
	  420: 'Enhance Your Calm',
	  428: 'Precondition Required',
	  429: 'Too Many Requests',
	  431: 'Request Header Fields Too Large',
	  500: 'Server Error',
	  501: 'Not Implemented',
	  502: 'Bad Gateway',
	  503: 'Service Unavailable',
	  504: 'Gateway Timeout',
	  505: 'HTTP Version Not Supported',
	  506: 'Variant Also Negotiates',
	  511: 'Network Authentication Required'
	};

	//Build an error type for each code
	for (var status in status_codes) (function(status){
		var status_msg = status_codes[status];
		var name = status_msg.replace(/\W/g,'');
		
		var CodeError = function(message, inner) {
			this.constructor.prototype.__proto__ = Error.prototype;
			this.message = message || status_msg;
			if (inner) this.inner = inner;
			
			//Grab info from the closure
			this.status = status;
			this.name = name;
			this.status_msg = status_msg;
			
			//Store the stacktrace - how did we get here?
			if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
			else this.stack = (new Error()).stack;
		};

		//Store the error for that code
		Errors[status] = CodeError;
		Errors[name] = CodeError;
	})(status);
}).call(this);