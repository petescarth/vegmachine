
// EXPORT DATA TO LOCAL FILES
function makeCsvLink(result) {
	if (result !== undefined) {
		var filename = 'results.csv';
		var rows = result;
		var processRow = function(row) {
			var finalVal = '';
			for (var j = 0; j < row.length; j++) {
				var innerValue = row[j] === null ? '' : row[j].toString();
				if (row[j] instanceof Date) {
					innerValue = row[j].toLocaleString();
				}
				var result = innerValue.replace(/"/g, '""');
				if (result.search(/("|,|\n)/g) >= 0)
					result = '"' + result + '"';
				if (j > 0)
					finalVal += ',';
				finalVal += result;
			}
			return finalVal + '\n';
		};

		var csvFile = '';
		for (var i = 0; i < rows.length; i++) {
			csvFile += processRow(rows[i]);
		}
		downloadBlob([csvFile], 'text/csv;charset=utf-8;', filename);
	}
}

function exportFeatures(drawnItems) {
	var keys = Object.keys(drawnItems._layers);
	var fclist = [];
	var filename = 'polygons.geojson';
	for (var i = 0; i < keys.length; i++) {
		var polygon = drawnItems._layers[keys[i]];
		fclist.push(polygon.feature);
	}

	var fc = {
		"type": "FeatureCollection",
		"features": fclist
	}

	var textFile = JSON.stringify(fc);
	downloadBlob([textFile], 'text/plain;charset=utf-8;', filename);
	link.click();
}

function downloadBlob(fileList, fileType, filename) {
	var blob = new Blob(fileList, {
		type: fileType,
	});
	if (navigator.msSaveBlob) { // IE 10+
		navigator.msSaveBlob(blob, filename);
	} else {
		link = document.createElement("a");
		if (link.download !== undefined) { // feature detection
			// Browsers that support HTML5 download attribute
			var url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", filename);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
		}
	}
}

