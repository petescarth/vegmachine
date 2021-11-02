
// CLICK AND CHANGE EVENTS
$('#privacy').click(function() {
	$("#data-warning").modal("toggle");
})
$('#rename').click(function() {
	var analysisfeature = combineFeatures(drawnItems);
	populateModal(analysisfeature);
})
$('#renameSubmit').click(function() {
	var analysisfeature = combineFeatures(drawnItems);
	drawnItems = renamePolygons(analysisfeature);
})
$('#zoomAll').click(function() {
	if (Object.keys(drawnItems._layers).length > 0) {
		zoomTo('all');
	} else {
		$('#noPolygonAlert').modal('toggle');
	}
})
$('#zoomSelected').click(function() {
	zoomTo('selected');
})
$('#savePolygons').click(function() {
	if (Object.keys(drawnItems._layers).length > 0) {
		exportFeatures(drawnItems);
	} else {
		$('#noPolygonAlert').modal('toggle');
	}
})
$('#searchSubmit').click(function() {
	codeAddress();
})
$('#contactSubmit').click(function() {
	sendMessage(document.getElementById('userName').value, document.getElementById('userEmail').value,  document.getElementById('userQuestion').value);
})
$('#forage-submit').click(function() {
	var foragefeature = combineFeatures(drawnItems);
	getForage(document.getElementById('report').value, document.getElementById('loclabel').value,  document.getElementById('email').value, foragefeature, document.getElementById('imageyear').value, document.getElementById('imageseason').value);
})
$('#importSubmit').click(function() {
	importBoundary(document.getElementById('labelField').value);
})
$('#peperSubmit').click(function() {
	var peperfeature = combineFeatures(drawnItems);
	csvData = getPEPERAnalysis(peperfeature, document.getElementById('cover').value, document.getElementById('buffer').value);
})
$('#legendToggle').click(function() {
	toggleLegend();
})
$('#mapToggle').click(function() {
	fullScreen($('#mapPanel1'))
})
$('#chartToggle').click(function() {
	fullScreen($('#chartDiv1'))
})
$("#saveChart").click(function(){
	saveChart();
})
$("#saveCSV").click(function(){
	link.click();
})

$('ul.seasonal > li > a').click(function() {
	var analysisfeature = combineFeatures(drawnItems);
	var name = $(this).attr('value');
	getTSAnalysis(name, analysisfeature)
})
$('ul.polygon > li > a').click(function() {
	var analysisfeature = combineFeatures(drawnItems);
	var name = $(this).attr('value');
	getPolygonAnalysis(name, analysisfeature)
})


$('input[name=locopt]').change(function(){
  if ($("#address_locopt").is(":checked")) {
    $("#address-block").show("fast");
  } else {
    $("#address-block").hide("fast");
  }
  if ($("#lot_locopt").is(":checked")) {
		$("#lotplan-block").show("fast");
  } else {
		$("#lotplan-block").hide("fast");
  }
  if ($("#latlong_locopt").is(":checked")) {
    $("#latlong").show("fast");
  } else {
    $("#latlong").hide("fast");
  }
})


$('#report').change(function(){
  if ($("#report").val()==="groundcover") {
    $("#individualyear").show("fast");
  } else {
    $("#individualyear").hide("fast");
  }  
})

