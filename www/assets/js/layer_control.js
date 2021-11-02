// LAYER METADATA CONSTRUCTOR OBJECT
function LayerDetails(legend) {
		this.legend = legend,
		this.initialised = false,
		this.active = false
	}

// GLOBAL JSON OBJECTS
var layerDetails = {
	'Fractional Cover': new Layer('aus:fractional_cover'),
  'Monthly Fractional Cover': new Layer('aus:monthly_fractional_cover'),
	'Sentinel Fractional Cover': new Layer('aus:sentinel_fractional'),
	'Ground Cover': new Layer('aus:ground_cover'),
	'Total Ground Cover': new Layer('aus:total_cover'),
	'Cover Deciles Total': new Layer('aus:cover_deciles_total'),
	'Cover Deciles Green': new Layer('aus:cover_deciles_green'),
	'Persistent Green': new Layer('aus:persistent_green'),
	'None': new Layer('aus:dummy')
};

var layerMeta = {
	'None': new LayerDetails(''), 
	'Fractional Cover': new LayerDetails('assets/images/legend_triangleonly.png'),
  'Monthly Fractional Cover': new LayerDetails('assets/images/legend_triangleonly.png'),
	'Sentinel Fractional Cover': new LayerDetails('assets/images/legend_triangleonly.png'),	
	'Ground Cover': new LayerDetails('assets/images/legend_triangleonly.png'),
	'Total Ground Cover': new LayerDetails('assets/images/total_cover_legend.png'),
	'Cover Deciles Total': new LayerDetails('assets/images/deciles_legend.png'),
	'Cover Deciles Green': new LayerDetails('assets/images/deciles_legend.png'),
	'Persistent Green': new LayerDetails('assets/images/persistent_green_legend.png')
}
// GROUPED OVERLAYS
// Overlay layers are grouped
var groupedOverlays = {
	"Timeseries Datasets": {
		"Ground Cover": updateLayer('Ground Cover'),
		"Total Ground Cover": updateLayer('Total Ground Cover'),
		"Fractional Cover": updateLayer('Fractional Cover'),
    "Monthly Fractional Cover": updateLayer('Monthly Fractional Cover'),
		"Sentinel Fractional Cover": updateLayer('Sentinel Fractional Cover'),
		"Cover Deciles Green": updateLayer('Cover Deciles Green'),
		"Cover Deciles Total": updateLayer('Cover Deciles Total'),
		"Persistent Green": updateLayer('Persistent Green'),
		"None": updateLayer('None')		
	}
};

// Make the "Timeseries Datasets" group exclusive (use radio inputs)
var options = {
	exclusiveGroups: ["Timeseries Datasets"],
	groupCheckboxes: true,
	autoZIndex: false,
};

// Use the custom grouped layer control, not "L.control.layers"
var layerControl = L.control.groupedLayers(baseLayers, groupedOverlays, options);
map.addControl(layerControl);

map.on('overlayremove', function onOverlayRemove(e) {
	map.removeLayer(layerDetails[e.name].tdWmsLayer);
	layerMeta[e.name].active = false;
})

map.on('overlayadd', function onOverlayAdd(e) {
	var newWms = updateLayer(e.name);
	map.addLayer(layerDetails[e.name].tdWmsLayer);
	layerMeta[e.name].active = true;
})

function updateLayer(layer) {
  oldWms.setOpacity(0);
	var wms = new Layer(layerDetails[layer].title, layerDetails[layer].opacity).tdWmsLayer;
	if (layerMeta[layer].initialised === true) {
		document.getElementById('legend').src = layerMeta[layer].legend;
		if (wms._baseLayer.wmsParams.layers === 'aus:dummy') {
			$('#slider-div').css('display', 'none');
			$('#legend').css('visibility', 'hidden');
			$('#legendToggle').css('visibility', 'hidden');
		} 
		else if (wms._baseLayer.wmsParams.layers === 'aus:persistent_green' && moment(map.timeDimension.getCurrentTime()).isAfter(moment(currentTime).subtract(2,'years'))) {		
			$('#slider-div').css('visibility', 'visible');	
		  $('#dateRangeAlert .modal-body').html('There is no persistent green image for this date. Persistent green products lag 2 years behind the other products. The most recent persistent green image is for ' + persistentString + '.');
		  $('#dateRangeAlert').modal('toggle');	
		}		
		else if (wms._baseLayer.wmsParams.layers === 'aus:sentinel_fractional' && moment(map.timeDimension.getCurrentTime()).isBefore(moment(new Date('2015-12-01')))) {		
			$('#slider-div').css('visibility', 'visible');	
		  $('#dateRangeAlert .modal-body').html('There is no Sentinel-2 fractional cover image for this date. Sentinel-2 products do not exist prior to December 2015.');
		  $('#dateRangeAlert').modal('toggle');	
		}				
		else {
			$('#slider-div').css('visibility', 'visible');
			$('#legendToggle').css('visibility', 'visible');
			$('#legend').css('visibility', 'visible');
		}		
	}
	
	layerMeta[layer].initialised = true;
	return wms;
}
