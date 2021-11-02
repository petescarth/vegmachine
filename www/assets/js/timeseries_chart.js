function getTSAnalysis(layer, analysisfeature) {
	console.log('timeseries analysis selected');
	if (analysisfeature.features.length === 0) {
		$('#polygonAlert').modal('toggle');
		return;
	}

	$.ajax({
		async: true,
		url: 'https://vmapi.jrsrp.com/tsjson',
		type: "POST",
		dataType: "json",
		statusCode: {
			404: function() {
				$('#serverAlert').modal('toggle');
			},
			500: function() {
				$('#serverAlert').modal('toggle');
			},
			502: function() {
				$('#serverAlert').modal('toggle');
			}
		},
		data: {
			geoJsonPoly: JSON.stringify(analysisfeature),
			wmsLayer: layer,
			monthlyRainfall: 'yes'
		},
		success: function(series) {
			var csvData = onDataReceived(series, layer);
			makeCsvLink(csvData);
		},
	})
	document.getElementById('helpSrc').src = 'assets/help/SinglePolygon002.png'
	zoomTo('selected');
	$(window).trigger('resize');
}

function saveChart() {
	$('#chartdiv').highcharts().exportChart();
}

function onDataReceived(series, product) {
	var layerJSON = {
		'aus:ground_cover': 'Ground Cover',
		'aus:fractional_cover': 'Fractional Cover',
    'aus:monthly_fractional_cover': 'Monthly Fractional Cover'
	}

	$('#saveChart').attr('style', 'display:inline');
	$('#saveCSV').attr('style', 'display:inline');

	var chartData = generateChartData(series);

	function generateChartData(series) {
   	
   var dataStructure = {
		 totalcover: []
	 };
		
    var csvDataStructure = {};
		var startDate = new Date(series.bare[0][0]);

		for (var prop in series) {
			dataStructure[prop] = [];			
		for (var i = 0; i < series[prop].length; i += 1) {
			var dataDate = new Date(series[prop][i][0]);
			var dataMonth = dataDate.getMonth();
      if (product.split('_')[0] === 'aus:monthly') {
        dataDate.setMonth(dataMonth+1);
      }
      else {
        dataDate.setMonth(dataMonth + 1);
      }

			var coverDate = dataDate.valueOf();
			if (coverDate > startDate.getTime() && csvDataStructure[coverDate] === undefined) {
				csvDataStructure[coverDate]= {}
			}

			if (coverDate > startDate.getTime() && coverDate <= series.bare[series.bare.length-1][0]) {
				dataStructure[prop].push([coverDate, series[prop][i][1]]);
				csvDataStructure[coverDate][prop] = series[prop][i][1];

				if (prop === 'bare'){
					if (series[prop][i][1] === null){
							dataStructure.totalcover.push([coverDate, null]);
					    csvDataStructure[coverDate].totalcover = 'null';
					} else {
					dataStructure.totalcover.push([coverDate, 100 - series[prop][i][1]]);
					csvDataStructure[coverDate].totalcover = 100 - series[prop][i][1];
					}
				}			
			}
		}
	}

	function toISODate(milliseconds) {
			var date = new Date(parseInt(milliseconds));
			var y = date.getFullYear()
			var m = date.getMonth() + 1;
			m = (m < 10) ? '0' + m : m;
			return [y, m].join('-');
		}		
		var csvList = [];

    var propertiesList = ["monthlyRainfall","bare","green","nongreen",
        "bare5percentile","bare20percentile","bare50percentile","bare80percentile","bare95percentile",
        "green5percentile","green20percentile","green50percentile","green80percentile","green95percentile",
        "nongreen5percentile","nongreen20percentile","nongreen50percentile","nongreen80percentile","nongreen95percentile"];
		
    csvList.push(['date', 'rain(mm)', 'bare_mean', 'green_mean', 'non_green_mean', "bare5percentile","bare20percentile",
        "bare50percentile","bare80percentile","bare95percentile",
        "green5percentile","green20percentile","green50percentile","green80percentile","green95percentile",
        "nongreen5percentile","nongreen20percentile","nongreen50percentile","nongreen80percentile","nongreen95percentile"]);
		
    var keys = Object.keys(csvDataStructure).sort(function(a, b){return a-b});

		for (var k=0; k<keys.length; k++){
			var csvDate = toISODate(keys[k]);
			var csvData = csvDataStructure[keys[k]];
			var csvDataList = [csvDate];			
			for (var l=0; l<propertiesList.length; l++){ 				 
						if (csvData[propertiesList[l]] === undefined){
						csvDataList.push('');
					} else {
						csvDataList.push(csvData[propertiesList[l]]);					
				}

			}
			csvList.push(csvDataList);			
		}
    
		return [dataStructure.monthlyRainfall, dataStructure.bare, dataStructure.green, dataStructure.nongreen, dataStructure.totalcover, csvList];
	}

	var csvList = drawChart(chartData);

	function drawChart(data) {
    //console.log(data)

		var chart = $('#chartdiv').highcharts('StockChart', {

			plotOptions: {
				line: {
					dataGrouping: {
						enabled: false,
					},

				},
				column: {
					dataGrouping: {
						enabled: false,
					}
				},
				series: {
                cursor: 'pointer',
                point: {
                    events: {
                        click: function(event) {
                            var day = new Date(event.point.x);
                            day.setUTCHours(12, 0, 0);
                            map.timeDimension.setCurrentTime(day.getTime());
                        }
                    }
                }
            }
			},
			rangeSelector: {
				selected: 2,
				buttons: [{
					type: 'year',
					count: 5,
					text: '5y'
				}, {
					type: 'all',
					text: 'All'
				}],
				inputDateFormat: "%Y-%m",
				inputEditDateFormat: "%Y-%m"
			},

			xAxis: {
				minRange: 60 * 1000 * 60 * 24 * 365 // one minute
			},

			yAxis: [{
				min: 0,
				labels: {
					align: 'right',
					x: -3
				},
				title: {
					text: 'Cover Fraction (%)'
				},
				height: '65%',
				lineWidth: 2
			}, {
				min: 0,
				labels: {
					align: 'right',
					x: -3
				},
				title: {
					text: 'Rain (mm)'
				},
				top: '70%',
				height: '30%',
				offset: 0,
				lineWidth: 2
			}],



			chart: {
				type: 'line',

			},
			


			title: {
				text: 'Single Polygon:' + ' ' + layerJSON[product],
			},

			navigator: {
				enabled: false
			},
			scrollbar: {
				enabled: false,
			},


			tooltip: {
				valueDecimals: 0,
				valueSuffix: '%'
			},


			credits: {
				enabled: false
			},

			navigation: {
				buttonOptions: {
					enabled: false
				},
			},


			legend: {
				enabled: true,
			},



			series: [{
				type: 'column',
				name: 'Rain',
				data: data[0],
				yAxis: 1,
				tooltip: {
					valueDecimals: 0,
					valueSuffix: 'mm'
				},
			}, {
				marker: {
					enabled: true,
					radius: 3
				},

				color: "#ff0000",

				name: 'Bare Ground',
				data: data[1]
			}, {
				marker: {
					enabled: true,
					radius: 3
				},
				color: "#00ff00",
				name: 'Green',
				data: data[2]
			}, {
				marker: {
					enabled: true,
					radius: 3
				},
				color: "#0000ff",
				name: 'Non-Green',
				data: data[3]
			}, {
				marker: {
					enabled: true,
					radius: 3
				},

				name: 'Total Cover',
				data: data[4]
			}],

			exporting: {
				chartOptions: {
					plotOptions: {
						series: {
							dataLabels: {
								enabled: false,
							},
							marker: {
								radius: 1
							},

						},
					},
					scrollbar: {
						enabled: false
					},
					rangeSelector: {
						labelStyle: {
							display: 'none'
						},
						buttonTheme: {
							style: {
								display: 'none'
							}
						}
					}
				}
			}

		});

		return data[5];
	}
	return csvList;
}
