
function validateForm() {
    var x = $('#upload');
    if (x === null || x === "") {
        alert("Name must be filled out");
        return false;
    }
}

// TIMESERIES TOOLS
$("#transparency-slider").slider({
	min: 0,
	max: 1,
	step: 0.01,
	value: 0,
	slide: function(event, ui) { 
		for (var key in layerDetails) {
			layerDetails[key].tdWmsLayer.setOpacity(1-ui.value);
		}
	}
});

function toggleLegend() {
	var visible = document.getElementById('legend').style.visibility;
	if (visible === 'hidden') {
		$('#legend').css('visibility', 'visible');
	} else if (visible === 'visible') {
		$('#legend').css('visibility', 'hidden');
	}
}

function sendMessage(userName, userEmail, userQuestion) {
	$.ajax({
		async: true,
		url: 'https://vegmachine.net/vmhelp',
		type: "POST",
		data: {
			userName: userName,
			userEmail: userEmail,
			userIssue: userQuestion,
		}
	})	
	}
	
// GOOGLE MAPS GEOCODER
google.maps.event.addDomListener(window, 'load', function() {
	var places = new google.maps.places.Autocomplete(document.getElementById('address'));
});

function codeAddress() {
	if ($("#address_locopt").is(":checked")) {
		  var geocoder = new google.maps.Geocoder();
			var address = document.getElementById('address').value;
	     geocoder.geocode({
		'address': address + ',au'
	}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			map.setView(new L.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng()), 10);
		} else {
			$('#result').html('Geocode was not successful for the following reason: ' + status);
		}
	});
	}
	else if($("#latlong_locopt").is(":checked")) {
		var lat = document.getElementById('lat').value;
		var long = document.getElementById('long').value;
		map.setView(new L.LatLng(lat,long), 10);
		
	} else if($("#lot_locopt").is(":checked")) {
		var lotPlan = document.getElementById('lotplan').value;
    var URL = wfsLayer(lotPlan);

	$.get(URL, parseJSONP, "JSONP");
	//this is the call back from the jsonp ajax request
	function parseJSONP(data) {
		//we call the function to turn it into geoJSON and write a callback to add it to the geojson object
		toGeoJSON(data,
			function(georesponse) {
				if (georesponse.features.length > 0) {
					var selected = new L.geoJson(georesponse);
					var selectedbounds = selected.getBounds();
					map.fitBounds(selectedbounds);
				}
			}
		);
	}
	}
	else {
		alert('you need to select an option');
	}
}


// FULLSCREEN PANELS FUCTIONS
function fullScreen(panel) {
	// If fullscreen mode is active, remove class and enable panel sorting
	if ($('body.panel-fullscreen-active').length) {
		$('body').removeClass('panel-fullscreen-active');
		panel.removeClass('panel-fullscreen');
	}
	// if not active add fullscreen classes and disable panel sorting
	else {
		$('body').addClass('panel-fullscreen-active');
		panel.addClass('panel-fullscreen');
	}

	// Hide any open mobile menus or popovers
	$('.popover').popover('hide');

	// Trigger a global window resize to resize any plugins
	// the fullscreened content might contain.
	  setTimeout(function() {
		$(window).trigger('resize');
	}, 100);

	map.invalidateSize();
}

