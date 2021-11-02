
// RENAME MODAL FUNCTIONS
function populateModal(analysisfeature) {
	if (analysisfeature.features.length === 0) {
		$('#renameAlert').modal('toggle');
		return;
	}
	var featureList = document.getElementById('renameTable');
	featureList.innerHTML = "";
	var i;
	for (i = 0; i < analysisfeature.features.length; i++) {
		var tr = document.createElement("tr");
		var newRow = featureList.appendChild(tr);

		var opt = analysisfeature.features[i].properties.VMId;
		var el = document.createElement("td");
		el.textContent = opt;
		el.id = "oldName" + i;
		newRow.appendChild(el);
		var newCell = document.createElement("td");
		var newName = document.createElement("input");
		newName.id = "newName" + i;
		newCell.appendChild(newName);
		newRow.appendChild(newCell);
	}
	$('#renameModal').modal('toggle');
	return analysisfeature;
}

function renamePolygons(analysisfeature) {
	for (var i = 0; i < analysisfeature.features.length; i++) {
		for (var p = 0; p < Object.keys(drawnItems._layers).length; p++) {
			var key = Object.keys(drawnItems._layers)[p];
			var drawnfeature = drawnItems._layers[key];
			if (drawnfeature.feature.properties.VMId === document.getElementById('oldName' + i).innerHTML) {
				if (document.getElementById('newName' + i).value !== '') {
					drawnfeature.feature.properties.VMId = document.getElementById('newName' + i).value;
				}
				drawnfeature.bindTooltip(drawnfeature.feature.properties.VMId);
			}
		}
	}
	$('#renameModal').modal('toggle');
	return drawnItems;
}