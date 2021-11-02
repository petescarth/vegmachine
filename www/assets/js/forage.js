// POST REQUEST FOR FORAGE REPORTS
function getForage(report, loclabel, email, foragefeature, imageyear, imageseason) {

	if (foragefeature.features.length === 0) {
		$('#forageModal').modal('toggle');
		$('#polygonAlert').modal('toggle');
		return;
	}

	if (email === '') {
		$('#emailAlert').modal('toggle');
		$('#emailAlert').css("z-index", parseInt($('.modal-backdrop').css('z-index')) - 1);
		return;
	}

	var valid = checkIfValid(foragefeature, report);
	if (valid[0] === false) {
		$('#forageModal').modal('toggle');
		$('#regionValidAlert').modal('toggle');
		return;
	}  else if (valid[1] === false) {
		$('#forageModal').modal('toggle');
		$('#regionSmallAlert').modal('toggle');
		return;
	}  else if (valid[2] === false) {
		$('#forageModal').modal('toggle');
		$('#regionLargeAlert').modal('toggle');
		return;
	}

var formData = {
			email: email,
			label: loclabel,
			paddocks: foragefeature,
      waterPoints: {
        type: "FeatureCollection",
        features: []
    },
    gates: {
        type: "FeatureCollection",
        features: []
    },
			reports: [
        {report: report, 
         extra: {
			       imageyear: imageyear,
			       imagemonth: imageseason,
             subscription: "0"}}]}

	$('#forageModal').modal('toggle');
	$.ajax({
		url: 'https://sls.longpaddock.qld.gov.au/forage-report-anon',
		type: "POST",
		dataType: "json",
    contentType: 'application/json',  
		statusCode: {
			500: function() {
				$('#serverAlert').modal('toggle');
			}
		},

    data: JSON.stringify(formData),
		success: function() {
			$('#forageAlert').modal('toggle');
		},
   
	});
}

