function getPolygonAnalysis(layer, analysisfeature) {
    if (analysisfeature.features.length !== 2) {
        $('#twoPolygonAlert').modal('toggle');
        return;
    }
    zoomTo('selected');
    var keys = Object.keys(analysisfeature);
    var jsonCoords1 = analysisfeature.features[0].geometry;
    var region1Name = analysisfeature.features[0].properties.VMId;
    var jsonCoords2 = analysisfeature.features[1].geometry;
    var region2Name = analysisfeature.features[1].properties.VMId;

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
            geoJsonPoly: JSON.stringify(jsonCoords1),
            wmsLayer: layer,
            monthlyRainfall: 'yes'
        },
        success: function(series1) {
            var region1 = series1;
            $.ajax({
                async: true,
                url: 'https://vmapi.jrsrp.com/tsjson',
                type: "POST",
                dataType: "json",
                data: {
                    geoJsonPoly: JSON.stringify(jsonCoords2),
                    wmsLayer: layer,
                    monthlyRainfall: 'yes'
                },
                success: function(series2) {
                    var region2 = series2;
                    var output = onPolygonDataReceived(region1, region1Name, region2, region2Name, layer);
                    makeCsvLink(output);
                }
            });
        }
    });
    $(window).trigger('resize');
    document.getElementById('helpSrc').src = 'assets/help/PolygonComparison002.png';
}
// format date in a readable string format
function toISODate(milliseconds) {
    var date = new Date(parseInt(milliseconds));
    var y = date.getFullYear()
    var m = date.getMonth() + 1;
    m = (m < 10) ? '0' + m : m;
    return [y, m].join('-');
}

function fromIsoDate(iso_date) {
    var date = new Date(iso_date); // some mock date
    var milliseconds = date.getTime();
    return milliseconds
}

function onPolygonDataReceived(series1, series1Name, series2, series2Name, layer) {

  console.log(series1, series1Name, series2, series2Name)  
  var layerJSON = {
        'aus:ground_cover': 'Ground Cover',
        'aus:fractional_cover': 'Fractional Cover',
        'aus:monthly_fractional_cover': 'Monthly Fractional Cover'
    }

    $('#saveChart').attr('style', 'display:inline');
    $('#saveCSV').attr('style', 'display:inline');

    var chartData = generateChartData(series1, series2, layer)

    function generateChartData(series1, series2, layer) {
        // sort API data into dictionary with date as key
        var csv_dictionary = {};
        for (var variable_name in series1) {
            for (var j = 0; j < series1[variable_name].length -1 ; j += 1) { //I HAVE PUT A -1 IN HERE TO FIX THE RAINFALL BUG
                //align dates of various api results
                var date = new Date(series1[variable_name][j][0]);
                if (layer != 'monthly_fractional_cover') {
                    date.setMonth(date.getMonth() + 3);
                } else {
                    date.setMonth(date.getMonth() + 1);
                }
                date.setDate(date.getDate() - 1);
                date = toISODate(date.valueOf());

                var obs = {
                    series1: null,
                    series2: null
                }

                var var_obs = {
                    [variable_name]: obs
                }

                if (!csv_dictionary.hasOwnProperty(date)) {
                    csv_dictionary[date] = var_obs;
                } else if (!csv_dictionary[date].hasOwnProperty(variable_name)) {
                    csv_dictionary[date][variable_name] = obs;
                }

                csv_dictionary[date][variable_name].series1 = series1[variable_name][j][1];
                csv_dictionary[date][variable_name].series2 = series2[variable_name][j][1];
            }
        }
   console.log(csv_dictionary)
        // create empty range lists for graphing
        var maxRange1 = [];
        var mean1 = [];
        var maxRange2 = [];
        var mean2 = [];
        var rainData1 = [];
        var rainData2 = [];

        // set up empty csv lists list for csv output
        var csv_lists = [];
        // add header to csv file
        csv_lists.push(['date',
            'rain_' + series1Name,
            'rain_' + series2Name,
            '5th_percentile_' + series1Name,
            '5th_percentile_' + series2Name,
            '20th_percentile_' + series1Name,
            '20th_percentile_' + series2Name,
            '50th_percentile_' + series1Name,
            '50th_percentile_' + series2Name,
            '80th_percentile_' + series1Name,
            '80th_percentile_' + series2Name,
            '95th_percentile_' + series1Name,
            '95th_percentile_' + series2Name
        ]);

        var observation_dates = Object.keys(csv_dictionary).sort(); // or loop over the object to get the array
        for (var date_index in observation_dates) {

            // restrict to dates from start of landsat timeseries
            var iso_date = observation_dates[date_index]
            //  var iso_date = toISODate(observation_date); 
            //  console.log(iso_date);
            if (iso_date > "1990-01") {
                // sort data into lists for graphing and output
                // format data for output to csv
                var csv_obs = []

                csv_obs.push(iso_date)
                var statistics_ref = ['monthlyRainfall', 'bare95percentile', 'bare80percentile', 'bare50percentile', 'bare20percentile', 'bare5percentile']
                var series_ref = ['series1', 'series2'];
                for (var stats_ind = 0; stats_ind < 6; stats_ind++) {
                    for (var series_ind = 0; series_ind < 2; series_ind++) {
                        if (statistics_ref[stats_ind] == 'monthlyRainfall') {
                            csv_obs.push(csv_dictionary[iso_date][statistics_ref[stats_ind]][series_ref[series_ind]])
                        } else if (csv_dictionary[iso_date][statistics_ref[stats_ind]] != undefined &&
                            csv_dictionary[iso_date][statistics_ref[stats_ind]] != 'monthlyRainfall' &&
                            typeof csv_dictionary[iso_date][statistics_ref[stats_ind]][series_ref[series_ind]] !== 'object') {
                            csv_obs.push(100 - csv_dictionary[iso_date][statistics_ref[stats_ind]][series_ref[series_ind]])
                        }
                    }
                }
                csv_lists.push(csv_obs)
            }
        }

        for (var m = 1; m < csv_lists.length; m++) {
            var observation = csv_lists[m];
            var milliseconds = fromIsoDate(observation[0])
            rainData1.push([milliseconds, observation[1]])
            rainData2.push([milliseconds, observation[2]])
            if (observation[9] != null) {
                maxRange1.push([milliseconds, observation[9], observation[5]]);
                mean1.push([milliseconds, observation[7]]);
                maxRange2.push([milliseconds, observation[10],  observation[6]]);
                mean2.push([milliseconds, observation[8]]);
            }
        }
        return [rainData1, rainData2, maxRange1, maxRange2, mean1, mean2, csv_lists];
    }
    var output = drawChart(chartData, series1Name, series2Name)

    function drawChart(data, series1Name, series2Name) {
        $('#chartdiv').highcharts('StockChart', {
            plotOptions: {
                arearange: {
                    dataGrouping: {
                        enabled: false,
                    },

                    fillOpacity: 0.3,

                },
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
                credits: {
                    enabled: false
                },

            },
            navigation: {
                buttonOptions: {
                    enabled: false
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
            legend: {
                enabled: true,
            },
            xAxis: {
                minRange: 60 * 1000 * 60 * 24 * 365 // one minute
            },
            yAxis: [{
                labels: {
                    align: 'right',
                    x: -3
                },
                title: {
                    text: 'Total Cover (%)'
                },
                height: '70%',
                lineWidth: 2
            }, {
                labels: {
                    align: 'right',
                    x: -3
                },
                title: {
                    text: 'Rain (mm)'
                },
                top: '80%',
                height: '20%',
                offset: 0,
                lineWidth: 2
            }],
            chart: {
                type: 'arearange'
            },
            title: {
                text: 'Polygon Comparison:' + ' ' + layerJSON[layer]
            },
            navigator: {
                enabled: false
            },
            scrollbar: {
                enabled: false
            },
            tooltip: {
                valueSuffix: '%',
                valueDecimals: 0,
            },
            series: [{
                type: 'column',
                name: 'Rain - ' + series1Name,
                data: data[0],
                yAxis: 1,
                tooltip: {
                    valueDecimals: 0,
                    valueSuffix: 'mm'
                },
                color: '#ff0000'
            }, {
                type: 'column',
                name: 'Rain - ' + series2Name,
                data: data[1],
                yAxis: 1,
                tooltip: {
                    valueDecimals: 0,
                    valueSuffix: 'mm'
                },
                color: '#0000ff'
            }, {
                name: ' Range - ' + series1Name,
                data: data[2],
                lineWidth: 0,
                color: '#ff0000',
                visible: false
            }, {
                name: ' Range - ' + series2Name,
                data: data[3],
                lineWidth: 0,
                color: '#0000ff',
                visible: false
            }, {
                type: 'line',
                name: 'Median - ' + series1Name,
                data: data[4],
                color: '#ff0000'
            }, {
                type: 'line',
                name: 'Median - ' + series2Name,
                data: data[5],
                color: '#0000ff'
            }, ],
            exporting: {
                chartOptions: {
                    plotOptions: {
                        series: {
                            dataLabels: {
                                enabled: false
                            }
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
        return data[6];
    }
    return output;

}
