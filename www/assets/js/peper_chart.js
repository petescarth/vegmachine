function getPEPERAnalysis(peperfeature, cover, buffer) {


    var valid = checkIfValid(peperfeature, 'peper');
    if (valid === false) {
        $('#areaAlert').modal('toggle');
        return;
    }

    $.ajax({
        async: true,
        url: 'https://vegcover.com/vmpeper',
        type: "POST",
        statusCode: {
            500: function() {
                $('#serverAlert').modal('toggle');
            }
        },
        data: {
            bufferDistance: parseInt(buffer) * 1000,
            geoJsonPoly: JSON.stringify(peperfeature),
            proposedMeanCover: parseInt(cover)
        },
        success: function(series) {
            var csvList = onPEPERDataReceived(series);
            makeCsvLink(csvList);
        }

    });

    zoomTo('selected');
    document.getElementById('helpSrc').src = 'assets/help/PEPER002.png'
}

function onPEPERDataReceived(features) {
    var jsonfeatures = JSON.parse(features);
    $('#saveChart').attr('style', 'display:inline');
    $('#saveCSV').attr('style', 'display:inline');


    var chartData = generateChartData(jsonfeatures);

    function generateChartData(jsonfeatures) {
        var csvList = [];
        csvList.push([
            "",
            "Polygon",
            "Hectares",
            "Cover",
            "Export(t/yr)",
            "Export(t/ha/yr)"
        ]);
      
       
        if (jsonfeatures.warning === "Polygons are far apart. Consider a bigger buffer or individual polygon analysis") {
          $('#peperAlert').modal('toggle');          
        } 
  
         var region = jsonfeatures.peperFeatures[0];
         var polygons = jsonfeatures.peperFeatures[1];
        

        //FORMAT CSV DATA HERE
        csvList.push(['Actual', 'Polygons(s)', polygons.featureArea.toFixed(2), polygons.cover50percentile, polygons.peperAnnualExportTotal.toFixed(2), polygons.peperExportRate.toFixed(2)]);
        csvList.push(['Regional', 'Polygons(s)', polygons.featureArea.toFixed(2), polygons.surroundingMedianCover, polygons.surroundingAnnualExportTotal.toFixed(2), polygons.surroundingExportRate.toFixed(2)]);
        csvList.push(['Target', 'Polygons(s)', polygons.featureArea.toFixed(2), polygons.proposedMeanCover, polygons.proposedAnnualExportTotal.toFixed(2), polygons.proposedExportRate.toFixed(2)]);

        return [csvList, [polygons.proposedExportRate, polygons.peperExportRate, polygons.surroundingExportRate]];
    }


    var csvData = drawChart(chartData);

    function drawChart(data) {
        $('#chartdiv').highcharts({
            chart: {
                type: 'column'
            },
            tooltip: {
                valueDecimals: 2,
                valueSuffix: ' t/ha/yr'
            },
            title: {
                text: 'PEPER Analysis'
            },
            xAxis: [{
                categories: ['Sediment Export'],

                labels: {
                    enabled: false
                }
            }],
            credits: {
                enabled: false
            },
            navigation: {
                buttonOptions: {
                    enabled: false
                }
            },
            yAxis: [{
                min: 0,
                labels: {
                    align: 'right',
                    x: -3
                },
                title: {
                    text: 'Sediment Export (t/ha/yr)'
                },
            }],
            series: [{
                name: 'Actual',
                data: [data[1][1]]
            }, {
                name: 'Regional',
                data: [data[1][2]]
            }, {
                name: 'Target',
                data: [data[1][0]]
            }]
        });
        return data[0];
    }
    return csvData;
}
