
function getCardId( crate, fru )
{
	return "c-" + crate + "-" + fru;
}

var sensorCounter = 0;

var Sensor = function( crateno, fru, data ) {
    var self = this;
    self.id = ++sensorCounter;
    self.isSensor = true;
    self.crate = crateno;
    self.fru = fru;
    self.currentValue = "";
    if ( data.type == "E" )
        self.currentValue = "E";
    self.raw = null;
    self.raw2value = null;
    self.unit = "";
    self.when = -1;
    for ( var key in data ) {
    	if ( key != "name" )
    		self[key] = data[key];
    }
    self.name = ko.observable( data.name );
//    ko.mapping.fromJS( data, {}, self);
};   



var Card = function( crateno, data ) {
    var self = this;
    self.isCard = true;
    self.crate = crateno;
    self.selected = ko.observable( false );
    
    ko.mapping.fromJS( data, {}, self);
	self.slotstr = self.type() + self.slot();
	self.cssClasses = self.type() + " " + self.slotstr;
    
    self.sensors = ko.mapping.fromJS( [], {
	 	key: function(data) {
	      	return ko.utils.unwrapObservable(data.name);
	    },
	    create: function(opts) {
	    	var fru = self.fru();
    	    return new Sensor( self.crate, fru, opts.data );
    	}
	} );

    
    self.id = function() {
    	return getCardId( self.crate, self.fru() );
    };
    
    self.updateSensors = function( sensorinfo ) {
		ko.mapping.fromJS( sensorinfo, self.sensors );
	};

	self.getSensor = function( name ) {
		var underlyingArray = self.sensors();
		return ko.utils.arrayFirst( underlyingArray, 
				function(item) {
			   		return item.name() === name;
				});
	};
	
};   


var Crate = function( data ) {
    var self = this;
    ko.mapping.fromJS(data, {}, self);
    self.cardsMap = {};
    self.isCrate = true;
	self.infoTable = ko.mapping.fromJS( [] );
	self.infoTableHeader = ko.observable( "" );
	self.selectedSensors = {};
    self.sensorTable = ko.observableArray( [] );
    self.sensorGauge = ko.observable( "" );
    self.previousSensorValue = -1;


	self.cards = ko.mapping.fromJS( [], {
	 	key: function(data) {
	      	return ko.utils.unwrapObservable(data.fru);
	    },
	    create: function(opts) {
	    	var crate = self.crateno();
    	    return new Card( crate, opts.data );
    	}
	} );

    self.updateCards = function( cardinfo ) {
    	for ( var i = 0; i < cardinfo.length; i++ ) {
			var card = cardinfo[i];
			card.img = knownCards[card.name];
    	}

		ko.mapping.fromJS( cardinfo, self.cards );
		self.cardsMap = {};
	    ko.utils.arrayForEach( self.cards(), function(card) {
	    	self.cardsMap[ card.fru() ] = card;
	    });
	};
	
	self.getCard = function( fru ) {
		if ( isNaN( fru ) )
			fru = Number( fru );
		return self.cardsMap[ fru ];
/*
		var underlyingArray = self.cards();
		return ko.utils.arrayFirst( underlyingArray, 
				function(item) {
			   		return item.fru() === fru;
				});
*/
	};
	
};

var Rack = function( rackName, indexInRacksArray ) {
    var self = this;
    self.name = rackName;
    self.i = indexInRacksArray;
    self.height = 0;
	self.crates = ko.observableArray();
	
	self.addCrate = function( crate ) {
		self.crates.push( crate );
		if ( self.crates().length > 1 )
			self.isRack = true; 	// more than one crate
		var newHeight = crate.pos() + 7; 
		if (  newHeight > self.height )
			self.height = newHeight;
		var x = self;  // for debugging
	};
};



var SysmgrModel = function() {
    var self = this;

    self.crate2rack = {};
    self.cratesMap = {};
    self.racks = ko.observableArray();
    self.crates = [];

    self.events = ko.observableArray();

	self.initCrates = function( crate_array ) {
		var x = self;  // for debugging
		for ( var i = 0; i < crate_array.length; i++ ) {
			var crate = crate_array[i];
			if ( !crate.rack ) {
				if ( sysmgrModel.crate2rack[ crate.description ] ) {
					crate.rack = sysmgrModel.crate2rack[ crate.description ].rack;
					crate.pos  = sysmgrModel.crate2rack[ crate.description ].pos;
				} else {
					crate.rack = crate.description;
					crate.pos  = 2;
				}
			}
			self.crates.push( new Crate( crate ) );
			self.cratesMap[ crate.crateno ] = self.crates[ self.crates.length - 1 ];
		}
	};
	
	self.initRacks = function() {
		var x = self;  // for debugging
		var rackList = {};
		for ( var i = 0; i < self.crates.length; i++ ) {
			var crate = self.crates[i];
			var rackName = crate.rack();
			var rackI = rackList[ rackName ];
			if ( !rackI ) {
				var rack = new Rack(  rackName, self.racks().length );
				rack.addCrate( crate );
				rackList[ rackName ] = self.racks.push( rack );
			}
			else {
				rackI -= 1; // starts with 1
				self.racks()[ rackI ].addCrate( crate );
			}
		}
		for ( var i = 0; i < self.racks().length; i++ ) {
			var rack = self.racks()[i];
			if ( rack.height < 25 )
				rack.height = 24;
		}
			
	};
	
	self.initCratesRacks = function( crate_array ) {
		self.initCrates( crate_array );
		self.initRacks();
	};

	self.updateCrates = function( crate_array ) {
		for ( var i = 0; i < crate_array.length; i++ ) {
			var crate = crate_array[i];
			self.getCrate( crate.crateno ).connected( crate.connected );
		}
	};
	
	self.getCrate = function( crate_number ) {
		if ( isNaN( crate_number ) )
			crate_number = Number( crate_number );
		return self.cratesMap[ crate_number ];
	};
	
	self.getCardById = function( cardId ) {
		var cCardFru = cardId.split('-');
		if ( cCardFru.length != 3 )
			return null;
		if ( cCardFru[0] != "c" )
			return null;
		
		var c = self.getCrate( cCardFru[1] );
		if ( !c )
			return null;
		return c.getCard( cCardFru[2] );
	};
	
	self.getCard = function( crate_, fru_ ) {
		var crate_number = crate_;
		var fru = fru_;
		if ( !fru_ ) {
			fru = crate_.fru;
			crate_number = crate_.crate;
		}
		var c = self.getCrate( crate_number );
		if ( !c )
			return null;
		return c.getCard( fru );
	};
	
	self.getCards = function( crate_number ) {
		var c = self.getCrate( crate_number );
		if ( !c )
			return [];
		return c.cards();
	};
	
	self.getSensor = function( selected ) {
		var c = self.getCard( selected.crate, selected.fru );
		if ( !c )
			return null;
		return c.getSensor( selected.sensor );
	};
	
	self.getSensors = function( selected ) {
		var c = self.getCard( selected.crate, selected.fru );
		if ( !c )
			return [];
		return c.sensors();
	};
	
	
};
    
