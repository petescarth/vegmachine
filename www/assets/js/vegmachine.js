// GLOBAL VARIABLES
var wms, baseLayers, layer;
var opacity;
var polyindex = 1;
var link;
var oldWms;

init.push(function() {
//	$('#server-down').modal('toggle');
})

window.PixelAdmin.start(init);

$body = $("body");
$(document).on({
	ajaxStart: function() {
		$body.addClass("loading");
	},
	ajaxStop: function(series, layer) {
		$body.removeClass("loading");
	}
});

var nowDate = new Date(Date.now());
var nowMonth = nowDate.getMonth();
var nowYear = nowDate.getFullYear();

if ([8,9,10].includes(nowMonth)) {
   nowMonth = 5
}  
else if (nowMonth === 11){
  nowMonth = 8}  
else if ([0,1].includes(nowMonth)){
  nowMonth =8
  nowYear = nowYear-1
}
else if ([2,3,4].includes(nowMonth)){
  nowMonth=11
  nowYear = nowYear-1}   
else if ([5,6,7].includes(nowMonth)){
  nowMonth = 2 }

var currentTime = moment(new Date(nowYear,nowMonth,1,10,0,0));
var currentDate = moment(new Date(nowYear,nowMonth+3,1,10,0,0));
var currentYear = currentDate.year();
var currentMonth = currentDate.month() + 1;
var displayYear = currentYear;
//var displaySeason = getSeason(moment(new Date().setUTCDate(1, 0, 0, 0, 0, 0)));
var displaySeason = getSeason(moment(nowDate));
var persistentString = displaySeason + ' ' + (displayYear-2).toString();

var map = L.map('map', {
    zoom: 6,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionOptions: {
        timeInterval: "1990-06-01/" + currentTime.toISOString(),
        period: "P3M",
        //currentTime: nowDate
    },
    center: [-22, 145],
});

Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};

L.Control.TimeDimensionCustom = L.Control.TimeDimension.extend({
    _getDisplayDateFormat: function(date){
        return date.format("mmmm yyyy");
    }    
});

var timeDimensionControl = new L.Control.TimeDimensionCustom({
	      position: 'topright',
        speedSlider: true,
        timeSlider: true,
        loopButton: true,
        playerOptions: {
          buffer: 1,
          minBufferReady: -1,
			    loop: true,
			    transitionTime: 3000,           
    }
});
map.addControl(this.timeDimensionControl);

// CONSTRUCTORS
// WMS LAYER CONSTRUCTOR 
function Layer(title) {
	this.title = title;
	this.wmsRef = L.tileLayer.wms('https://geoserver.tern.org.au/geoserver/aus/wms', {
		layers: this.title,
		format: 'image/png',
		transparent: true,
		opacity: 1,
    time: currentTime.year() + '-' + ("0" + (currentTime.month() + 1)).slice(-2) + '-01'// CHANGE THIS STRING TO yyyy-mm-dd
	});
	
	this.tdWmsLayer = L.timeDimension.layer.wms(this.wmsRef,{
	//	updateTimeDimension: true,
	//	requestTimeFromCapabilities: true,
		wmsVersion: '1.1.1'
});  
  oldWms = this.tdWmsLayer;
}

//return season based on month
function getSeason(month) {
	var season;
  month = parseInt(month)+3
	if (month < 6 && month >= 3) {
		season = 'Autumn';
	} else if (parseInt(month) < 9 && parseInt(month) >= 6) {
		season = 'Winter';
	} else if (parseInt(month) < 12 && parseInt(month) >= 9) {
		season = 'Spring';
	} else if ((parseInt(month) < 3 && parseInt(month) >= 1) || (parseInt(month)) == 12) {
		season = 'Summer';
	}
	return season;
}
