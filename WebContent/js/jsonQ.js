
var jsonQ = (function() {
 	var pending = false;
	var requests = [];
	var requestCounter = 0;
	var jsonURL = "json";
	var session = null;
	var $statusDiv = null;
	var wheel = [ '-', '\\', '|', '/', '-', '\\', '|', '/' ];
	
	var find = function( to_be_found ) {
		for ( var i = 0; i < requests.length; i++ ) {
			var existing = requests[i].params;
			var found = true;
			for ( var key in to_be_found ) {
				if ( !existing[key] || to_be_found[key] != existing[key] ) {
					found = false;
					break;
				}
			}
			if ( found )
				return i;
		}
		return -1;
	};
	
	return {
		setSession: function( sessionN ) {
			session = sessionN;
		},
		setJsonURL: function( url ) {
			jsonURL = url;
		},
		setStatusDiv: function( div ) {
			$statusDiv = div;
		},
		queueRequest: function( parameters, callback, wait ) {
			var x = requests; // for debugging
			var next = (new Date()).getTime() / 1000 + wait;
			var old = find( parameters );
			if ( old != -1 ) {
				if ( requests[old].when < next )
					return;
				requests.splice( old, 1 );
			}
			if ( !wait )
				requests.unshift( { params: parameters, callback: callback, when: -1 } );
			else {
				for ( var i = 0; i < requests.length; i++ )
				{
					if ( requests[ i ].when > next ) {
						requests.splice( i, 0, { params: parameters, callback: callback, when: next } );
						return;
					} 
				}
				requests.push( { params: parameters, callback: callback, when: next } );
			}
				
			jsonQ.sendNextRequest();
		},
		setDone: function() {
	    	pending = false;
	    	jsonQ.sendNextRequest();
	    },
	    isIdle: function() {
	    	return !pending && requests.length == 0;
	    },
	    inQ: function( request ) {
	    	return find( request ) != -1; 
	    },
		sendNextRequest: function() {
			var x = requests;  // for debugging
			if ( pending || requests.length == 0 )
				return;
			
			var now = (new Date()).getTime() / 1000;
			if ( requests[0].when > now ) {
				window.setTimeout( jsonQ.sendNextRequest, 1000 );
				return;
			}
			
			var request = requests.shift();
			if ( session && !request.params.session )
				request.params.session = session;
			request.params.n = ++requestCounter;
			pending = request.params.n;
			if ( $statusDiv )
				$statusDiv.addClass( 'circleBusy' );
//			$statusDiv.html( wheel[ requestCounter % 8 ] ).css( 'background-color', 'lightyellow' );
			$.getJSON( jsonURL, request.params, request.callback );
		},
		setStatusDivDone: function() {
			if ( $statusDiv ) {
				$statusDiv.removeClass( 'circleBusy' ).toggleClass( 'circleBrighter' );
			}
//			$statusDiv.html( requestCounter % 2 == 0 ? "." : "&nbsp;." ).css( 'background-color', requestCounter % 2 == 0 ? 'white' : 'lightgrey' );
		}
	  };
})();	
	
