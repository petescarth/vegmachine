

var sat = L.gridLayer.googleMutant({
    type: 'hybrid',	// valid values are 'roadmap', 'satellite', 'terrain' and 'hybrid'
}).addTo(map);
var road = L.gridLayer.googleMutant({
    type: 'roadmap',	// valid values are 'roadmap', 'satellite', 'terrain' and 'hybrid'
});
var baseLayers = {
	"Roads": road,
	"Hybrid": sat,
};

L.control.locate().addTo(map);
L.control.scale({
	imperial: false
}).addTo(map);
L.control.mousePosition().addTo(map);

