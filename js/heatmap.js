// *****************************************
// render chart
// *****************************************
(function() {
    'use strict';

    var nestedData;
    var parseDate = d3.time.format('%Y-%m-%d').parse;
    // create chart
    var heatChart = d3.eesur.heatmap()
        .height(500)
        .startYear('2014')
        .endYear('2017')
        .on('_hover', function (d, i) {
            var f = d3.time.format('%B %d, %Y');
            d3.select('#info')
                .text(function () {
                    return 'date: ' + f(d) + ' | value: ' + nestedData[d];
                });
        });
    var city = "Beijing";
    var index = "pm25";
    var index_select = $( '#index-dropdown' );
    var city_select = $( '#city-dropdown' );
    index_select.change( function() {
      index = $( this ).val();
      mapData();
    });
    $('.dropdown-menu a').click(function() {
        alert("fuck");
    });
    city_select.change( function() {
      city = $( this ).val();
      mapData();
    });
    mapData();
    function mapData() {
        // apply after nesting data
        d3.json('../file/bigcity.json', function(error, data) {
            if (error) return console.warn(error);
            nestedData = d3.nest()
                .key(function (d) {
                    return parseDate(d.date);
                })
                .rollup(function (n) {
                    n = n[0]
                    if("undefined" === typeof n.value)
                        return 0;
                    if("undefined" === typeof n.value[city])
                        return 0;
                    return n.value[city][index];
                })
                .map(data);
            d3.selectAll("svg").remove();
            // render chart
            d3.select('#heatmap')
                .datum(nestedData)
                .call(heatChart);
        });
    }
}());

d3.select(self.frameElement).style('height', '800px');
