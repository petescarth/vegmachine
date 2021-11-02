
var polygonStyle = {
	"color": "#ffffff",
	'fillColor': '#ffffff',
	"opacity": 0.7,
	"fillOpacity": 0.6,
	"weight": 1
}

var selectedStyle = {
	"color": "#ffffff",
	'fillColor': '#ffffff',
	"opacity": 1,
	"fillOpacity": 0.1,
	"weight": 2.5
}

// DRAW TOOLS 
// Initialize the FeatureGroup to store editable layers
var drawnItems = L.featureGroup().addTo(map);
// Initialize the draw control and pass it the FeatureGroup of editable layers
var drawControl = new L.Control.Draw({
	draw: {
		polygon: {
			shapeOptions: polygonStyle,
			allowIntersection: false
		},
		polyline: false,
		rectangle: false,
		marker: false,
		circle: false,
		circlemarker: false
	},
	edit: {
		featureGroup: drawnItems,
		edit: false,
		remove: true
	}
});

map.on('draw:created', function(e) {
	if (e.layerType === "polygon") {
		var layer = e.layer.toGeoJSON();
		processPolygon(layer);
	}
});

map.addControl(drawControl);
map.invalidateSize(false);

