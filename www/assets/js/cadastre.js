// WFS LAYER 
function wfsLayer(lotplan) {
	var rootUrl = 'https://gisservices.information.qld.gov.au/arcgis/rest/services/PlanningCadastre/LandParcelPropertyFramework/MapServer/4/query';
	var defaultParameters = {
		text: lotplan,
		f:'json',
		outSR:'4326',
		inSR:'900973'		
	};
	var parameters = L.Util.extend(defaultParameters);
	var URL = rootUrl + L.Util.getParamString(parameters);
	return URL;
}

 L.esri.dynamicMapLayer({
    url: 'https://gisservices.information.qld.gov.au/arcgis/rest/services/PlanningCadastre/LandParcelPropertyFramework/MapServer',
    layers: [5,6],
	  opacity: 1,
	  transparent: true,
  }).addTo(map);

