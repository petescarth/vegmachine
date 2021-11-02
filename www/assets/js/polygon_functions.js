
function importBoundary(labelField) {
	var load = true;
	$('#convertGeoJson').ajaxForm({
		success: function(data) {
			if (data.errors !== undefined) {
				if (data.errors[0] === "Can't transform coordinates, source layer has no") {
					$('#transformAlert').modal('toggle');
				} else {
					$('#failureAlert').modal('toggle');
				}
			} else {
				$('#geojsonModal').modal('hide');
				var boundary = new L.geoJson(data, {
					style: polygonStyle,
					onEachFeature: function(feature) {
						if (feature.properties[labelField] === undefined && labelField !== '') {
							load = false;
						}
						if (load === true) {
							if (feature.properties[labelField] !== undefined && feature.properties[labelField] !== null) {
								feature.properties.VMId = feature.properties[labelField].toString();
							} else if (feature.properties.VMId !== undefined) {
								console.log('vm field exists');
							}  
							else {
								feature.properties.VMId = 'Polygon' + polyindex + '';
							}
							if (feature.properties.selected !== undefined) {} else {
								feature.properties.selected = false;
							}
							polyindex++;
						}
					}
				});

				
				if (load === true) {
					var bounds = boundary.getBounds();
					map.fitBounds(bounds);

					boundary.eachLayer(function(layer) {
						if (layer.feature.type === "Feature") {
							if (layer.feature.properties.selected === 1) {
								layer.feature.properties.selected = true;
								layer.setStyle(selectedStyle);
							} else if (layer.feature.properties.selected === 0) {
								layer.feature.properties.selected = false;
								layer.setStyle(polygonStyle);
							}
							drawnItems.addLayer(layer);
							layer.bindTooltip(layer.feature.properties.VMId);
							layer.on('click', function(e) {
								layer.feature.properties.selected = !layer.feature.properties.selected;
								if (layer.feature.properties.selected === true) {
									this.setStyle(selectedStyle);
								} else if (layer.feature.properties.selected === false) {
									this.setStyle(polygonStyle);
								}
							});
						}
					});
					boundary.addTo(map);
				} else {
					$('#labelAlert').modal('toggle');
				}
			}
		},
		timeout: 30000 // sets timeout to 30 seconds
	});
}

function processPolygon(data) {
	var polybound = new L.geoJson(data, {
		style: polygonStyle,
		onEachFeature: function(feature) {
			feature.properties.VMId = 'Polygon' + polyindex + '';
			feature.properties.selected = true;
			polyindex++;
		}
	});
	var bounds = polybound.getBounds();

	polybound.eachLayer(function(layer) {
		layer.bindTooltip(layer.feature.properties.VMId);
		layer.on('click', function(e) {
			layer.feature.properties.selected = !layer.feature.properties.selected;
			if (layer.feature.properties.selected === true) {
				this.setStyle(selectedStyle);
			} else if (layer.feature.properties.selected === false) {
				this.setStyle(polygonStyle);
			}
		});
	});
	polybound.addTo(map);
	var key = Object.keys(polybound._layers)[0];
	var drawnfeature = polybound._layers[key];
	drawnItems.addLayer(drawnfeature);
	return polybound;
}

function combineFeatures(drawnItems) {
  var keys = Object.keys(drawnItems._layers);
	var polylist = [];

	for (var i = 0; i < keys.length; i++) {
		var polygon = drawnItems._layers[keys[i]];
    if (polygon.feature.properties.name === undefined) {
      polygon.feature.properties.name = polygon.feature.properties.VMId
    }
		if (polygon.feature.properties.selected === true) {
			// fix geometries to avoid issues with 3d polygons
		//	for (var j=0; j<polygon.feature.geometry.coordinates[0].length; j++) {
		//	  polygon.feature.geometry.coordinates[0][j] = [polygon.feature.geometry.coordinates[0][j][0],polygon.feature.geometry.coordinates[0][j][1]];
		//	}
			polylist.push(polygon.feature);
		}
	}
	var fc = {
		"type": "FeatureCollection",
		"features": polylist
	}
 console.log(fc);
	return fc;
}

// ZOOM TO POLYGON
function zoomTo(selection) {
	if (selection === 'all') {
		var allbounds = drawnItems.getBounds();
		map.fitBounds(allbounds);
	}

	if (selection === 'selected') {
		var fc = combineFeatures(drawnItems);
		if (fc.features.length > 0) {
			var selected = new L.geoJson(fc);
			var selectedbounds = selected.getBounds();
			map.fitBounds(selectedbounds);
		} else {
			$('#polygonAlert').modal('toggle');
			return;
		}
	}
}

// CHECK IF POLYGON VALID FOR GIVEN ANALYSIS
function checkIfValid(fc, report) {

	var valid = false;
	var qldJSON = {
		"type": "Feature",
		"properties": {},
		"geometry": {
			"type": "Polygon",
			"coordinates": [
				[
					[137.9443359375, -16.55196172197251],
					[137.900390625, -25.95804467331783],
					[141.0205078125, -25.997549919572098],
					[141.0205078125, -28.998531814051795],
					[148.9306640625, -28.9600886880068],
					[149.5458984375, -28.613459424004414],
					[150.1611328125, -28.574874047446983],
					[150.732421875, -28.65203063036226],
					[151.259765625, -28.92163128242129],
					[151.30371093749997, -29.152161283318915],
					[152.0068359375, -28.84467368077178],
					[151.9189453125, -28.536274512989916],
					[152.6220703125, -28.381735043223095],
					[153.5009765625, -28.1882436418503],
					[153.3251953125, -27.137368359795595],
					[153.017578125, -25.997549919572098],
					[153.4130859375, -25.085598897064763],
					[153.1494140625, -24.926294766395593],
					[152.7978515625, -25.60190226111574],
					[151.875, -24.166802085303225],
					[150.82031249999997, -22.431340156360594],
					[149.677734375, -22.268764039073968],
					[149.37011718749997, -21.125497636606266],
					[148.447265625, -20.13847031245114],
					[147.0849609375, -19.31114335506463],
					[146.46972656249997, -19.062117883514652],
					[145.98632812499997, -17.30868788677001],
					[145.2392578125, -16.13026201203474],
					[145.283203125, -15.199386048559994],
					[144.53613281249997, -14.434680215297268],
					[143.96484375, -14.136575651477932],
					[143.349609375, -12.811801316582606],
					[142.91015625, -11.60919340793894],
					[142.3828125, -10.617418067950293],
					[141.6796875, -11.480024648555816],
					[141.328125, -13.111580118251648],
					[141.1962890625, -14.434680215297268],
					[141.328125, -15.623036831528264],
					[140.66894531249997, -17.182779056431826],
					[139.921875, -17.35063837604883],
					[139.04296875, -16.88865978738161],
					[137.9443359375, -16.55196172197251]
				]
			]
		}
	};

	var exploded = turf.explode(fc);

	var convex = turf.convex(exploded);
	var intersection = turf.intersect(qldJSON, convex);
	
	if (report === 'pdkcover' || report === 'groundcover' || report === 'fpc') {
		var tests;
		if (intersection !== undefined) {
			valid = JSON.stringify(convex.geometry) == JSON.stringify(intersection.geometry);
			var bbox = turf.extent(convex);
			var distance = findDistance(bbox[0], bbox[3], bbox[2], bbox[1]);
			var area = turf.area(convex);
			var largeEnough = (area >= 50000);
			var smallEnough = (distance < 200)
			tests = [valid,largeEnough,smallEnough];
		} else {
			tests = [valid];
		}
		return tests;
	}

	
	if (report === 'peper') {
		if (intersection !== undefined) {
			valid = JSON.stringify(convex.geometry) == JSON.stringify(intersection.geometry);
		}
		return valid;
	}
}

