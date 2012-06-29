function gfMap(options) {
	this.ready = ko.observable(false)
	this.geolocationQueue = ko.observableArray([])
	this.mapMakingQueue = ko.observableArray([])
	this.maps

	
	this.start = function() {
		this.geocoder = new google.maps.Geocoder()
		this.maps = []
		this.ready(true)
	}

	function parseLocation(location) {
		var latlng = []; 
		for( var i in location ) { 
			if( typeof location[i] == 'number' ) latlng.push( location[i] )
		}
		latlng.sort()
		return latlng[1]+','+latlng[0];
	}


	this.geolocate = function(observable) {
		var obs = ko.toJS(observable), address = obs.address
		this.geolocationQueue.push( {observable: observable, address: address } )
	}

	this.geolocater = ko.computed( function() {
		var queue = this.geolocationQueue, flatQueue = queue()
		if( this.ready() && flatQueue.length > 0 ) {
			if( typeof google == 'undefined' ) throw 'No Google!'
			for (var i=0; i < flatQueue.length; i++) {
				var observable = flatQueue[i].observable, address = flatQueue[i].address
				queue.remove( queue[i] )
				this.geocoder.geocode( { 'address': address }, function(results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						observable._initalAddress = address
						observable._fail(false)
						observable._googlePoint = results[0].geometry.location
						observable().latlng( parseLocation(results[0].geometry.location) )
					} else if( status == google.maps.GeocoderStatus.OVER_QUERY_LIMIT ) {
						setTimeout( function() { queue.push( {observable: observable, address: address } ) }, 10000 )
					} else {
						observable._initalAddress = address
						observable._fail(true)
					}
				})
				
			};
		}
	},this)

	this.mapper = ko.computed( function() {
		var queue = this.mapMakingQueue()
		if( this.ready() && queue.length > 0 ) {
			for (var i=0; i < queue.length; i++) {
				this.makeMap(queue[i][0],queue[i][1],queue[i][2])
			};
		}
	},this)

	function gfMapped(rows, field, div) {
		this.rawPoints = rows
		this.field = field
		this.div = div
		return this
	}


	this.makeMap = function(data, field, options)  {
		var options = options || {},
			obj = options.obj || {},
			scope = typeof options.obj == 'string' ? window[obj] : obj,
			map = new gfMapped( data, field, typeof scope == 'undefined' || typeof scope.div == 'undefined' ? ko.observable('') : scope.div )

		if( ! this.ready() ) {
			this.mapMakingQueue.push( [data, field, options] )
		} else {
			map.mapOptions = {
				zoom: 4,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				center: new google.maps.LatLng(45, -122)
			}

			map.gMap = ko.computed(function() {
				var div = this.div()
				if( div.nodeType === 1  ) return new google.maps.Map( this.div(), this.mapOptions )
			},map)

			map.points = ko.computed(function() {
				var rawPoints = ko.toJS( this.rawPoints ), gMap = this.gMap(),  markers = []
				for (var i=0; i < rawPoints.length; i++) {
					var latlng = ko.toJS( rawPoints[i][this.field] ).latlng
					if( latlng != '' ) {
						var parse = latlng.split(','),
							point = new google.maps.LatLng(parse[0], parse[1])
						markers.push( {
							lat: parse[0],
							lng: parse[1],
							point: new google.maps.Marker({
								position: point,
								map: gMap,
								draggable: false,
								animation: google.maps.Animation.DROP
							})
						});
					}
				};
				return markers
			},map)

			map.center = ko.computed(function() {
				var gMap = this.gMap()
				if( typeof gMap != 'undefined' ) {
						var points = this.points(),
							allLats = this.points().map( function(el) { return parseFloat(el.lat) }),
							allLngs = this.points().map( function(el) { return parseFloat(el.lng) }),
							newCenter = new google.maps.LatLng( ( Math.max.apply(Math, allLats) + Math.min.apply(Math, allLats) ) / 2, ( Math.max.apply(Math, allLngs) + Math.min.apply(Math, allLngs) ) / 2 )

					 	gMap.setCenter(newCenter)

						return newCenter
				}
			},map)

	}

		map.setMap = function(id) {
			map.div( id )
		}

		if( typeof obj == 'string' ) return window[obj] = map
		else return scope = map
	}

	ko.bindingHandlers.gfMap = {
		init: function(element,valueAccessor) {
			var map = valueAccessor()
			if( element.id == '' ) {
				element.id = 'gfMap_'+new Date().getTime()
			}
			map.setMap( element )
		}
	};



	if( typeof this.constructor.map == 'undefined' || typeof google == 'undefined' ) {
		var script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = 'https://maps.googleapis.com/maps/api/js?sensor=true&callback=gfMap.map.start';
			document.body.appendChild(script);
			return this.constructor.map = this;
	}


}