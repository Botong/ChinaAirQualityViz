var HOST="china-airquality.appspot.com",
	PORT="80";
var TOKEN="bca0d49923fd0e45662f7007f75df96c8abc14e6";

function isCanvasSupported() {
    var elem = document.createElement('canvas');
    return !!(elem.getContext && elem.getContext('2d'));
}
var stats = d3.select("#stats");
if (!isCanvasSupported()) {
    stats
        .style("top", "0px")
        .select("div")
        .html("Your browser is too old! Try with a modern browser or <a href=\"http://browser-update.org/update.html\">update now</a>!");
} else {
    aSeaOfTweets();
}

function aSeaOfTweets() {
    var totali = 11;

    var topics = [
        //"rodota",
        "beijing",
        "tianjin",
        "shanghai",
        "chongqing",
        //"moderate",
        //"good"
    ];
    var colors = {
        "beijing": "#6600ff",
        "shanghai": "#fff",
        "tianjin": "#ffe500",
        "chongqing": "#7fff00",
        //"moderate":"#0d88cb",
        //"good":"#ff6600"
    };


    var pause = false;
    var animating = false;
    var sea = 1;
    var mousedown = false;


    var viz = d3.select("#viz");

    var inwidth = $("body").innerWidth() - 30;
    var width = inwidth,
        height = viz.node().offsetHeight - 10;

    var max_radius = sea ? (height / 2) : 250;

    var margin_top = max_radius,
        half = 2;


    var svg = viz
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    createGradients();

    var grid = svg.append("g")
        .attr("id", "grid");

    var timeline = svg.append("g")
        .attr("id", "timeline");
    var dragme = {},
        gauge = {};
    var tweets = svg.append("g")
        .attr("id", "tweets")

    var statuses = d3.select("#statuses");

    var groups;

    var labels = svg.append("g")
        .attr("id", "labels")
        .attr("transform", "translate(0,-10)");

    var connections = [];

    var data = [];
    var xs = [];
    var ys = [];
    var time_labels = [];

    var formathhmmss = d3.time.format("%m/%d/%y %I %p");
    var formathhmmss2 = d3.time.format("%X");

    var time_scale = d3.scale["linear"]().range([0, width - 100]),
        radius_scale = d3.scale["pow"]().clamp(true).range([6, max_radius]).domain([0, 400]).exponent(0.4),
        reverse_scale = d3.scale["linear"]().domain([0, width - 100]),
        larger_radius_scale = d3.scale["pow"]().clamp(true).range([6, max_radius*2]).domain([0, 800]).exponent(0.4);

    var tmp_time_scale = d3.scale["linear"]().range([0, width - 100]),
        tmp_reverse_scale = d3.scale["linear"]().domain([0, width - 100]);

    var line = d3.svg.line()
        .x(function (d) {
            return d.x;
        })
        .y(function (d) {
            return d.y;
        })
    //.interpolate("basis");

    var arc = d3.svg.arc()
        .outerRadius(50)
        .innerRadius(0);

    var row_distance = (height - margin_top) / topics.length,
        speed = 2000,
        time_span = 1000 * 60 * 60 * 24;

    var now = 0,
        past = now - time_span;

    now = (now / (1000 * 60 * 60)) * (1000 * 60 * 60);
    past = (past / (1000 * 60 * 60)) * (1000 * 60 * 60);

    time_scale.domain([past, now]);
    reverse_scale.rangeRound([past, now]);

    tmp_time_scale.domain([past, now]);
    tmp_reverse_scale.rangeRound([past, now]);


    var to = null;
    window.onresize = function (event) {


        if (to != null) {
            clearTimeout(to);
        }
        to = setTimeout(function () {

            var old_width = width;

            if (Math.abs(old_width - inwidth) < 20)
                return;

            width = inwidth;
            height = viz.node().offsetHeight - 10;


            svg
                .attr("width", width)
                .attr("height", height);

            max_radius = sea ? (height / 2) : row_distance * 2;
            radius_scale.range([6, max_radius]);

            time_scale = d3.scale["linear"]().range([0, width - 100]);
            reverse_scale = d3.scale["linear"]().domain([0, width - 100]);

            tmp_time_scale = d3.scale["linear"]().range([0, width - 100]);
            tmp_reverse_scale = d3.scale["linear"]().domain([0, width - 100]);


            updateGauge();

            updateGrid();

        }, 100);


    }

    function createGradients() {
        var to = "#003482";
        var gradients = svg.append("svg:defs");
        topics.forEach(function (from) {

            // console.log(from);
            var g = gradients.append("svg:linearGradient")
                .attr("id", "g_" + from)
                .attr("x1", "0%")
                .attr("y1", "20%")
                .attr("x2", "0%")
                .attr("y2", "100%")


            g.append("svg:stop")
                .attr("offset", "0%")
                .attr("stop-color", colors[from])
                .attr("stop-opacity", 1);

            g.append("svg:stop")
                .attr("offset", "100%")
                .attr("stop-color", to)
                .attr("stop-opacity", 1);
        })

    }

    function showTweets(tweets) {
        var same = true,
            ids = tweets.map(function (d) {
                return d.id;
            });

        var tmp_tweets = {};


        same = statuses.selectAll("div.status").data().some(function (d) {
            return (ids.indexOf(d.id) == -1)
        });

        var __data = statuses.selectAll("div.status").data();
        if (__data.length == ids.length) {
            var same = true;
            for (var i = 0; i < __data.length; i++) {
                same = (ids.indexOf(__data[i].id) > -1);
                if (!same)
                    break;
            }
            if (same) {
                return;
            }
        }

        var ys = [],
            tmp_tweets = {};

        tweets = tweets.sort(function (a, b) {
            return b.f - a.f;
        }).map(function (d) {

            if (!tmp_tweets[d.id]) {
                tmp_tweets[d.id] = d;
                tmp_tweets[d.id].topics = [];
            }
            tmp_tweets[d.id].topics.push(d.c);

            return d;
        })


        tweets = d3.values(tmp_tweets);

        tweets.forEach(function (d, i) {

            var y = y = topics.indexOf(d.c) * row_distance,
                r = radius_scale(d.f);

            y = (sea ? (half * row_distance) : y);

            d.__y = margin_top + Math.round(y - r - 0);

            if (ys.length > 0) {
                var delta = d.__y - ys[i - 1];
                //console.log("delta",delta,d.__y,"-",ys[i-1])
                d.__y += (delta < 100) ? (100 - delta + 5) : 0;
            }
            ys.push(d.__y);
        });

        var delta = height - (tweets[tweets.length - 1].__y + 85);
        if (delta < 0) {
            tweets.forEach(function (d, i) {
                d.__y += delta;
            });
        }

        var __statuses = statuses.selectAll("div.status")
            .data(tweets);


        __statuses.enter()
            .append("div")
            .attr("class", "status")


        __statuses.exit().remove();

        statuses.selectAll("div.status")
            .attr("class", function (d) {
                return "status " + d.c;
            })
            .html(function (d) {
                //console.log(d)
                var html = "<h2>" + d.name + "<span>@" + d.sname + "</span></h2>" + "<h3><span>aqi</span> " + d.f + "</h3>" + "<p>" + d.d + "</p>";
                html += "<ul>";
                d.topics.forEach(function (c) {
                    html += "<li class=\"" + c + "\" style=\"width:" + (100 / d.topics.length) + "%\">" + c + "</li>"
                });
                html += "</ul>";
                return html;
            })
            .style("left", function (d) {
                var x = Math.floor(tmp_time_scale(d.t));

                if ((x - 370) < 0) {
                    return (x + 15) + "px";
                }

                return (x - 370) + "px";
            })
            .style("top", function (d) {
                return d.__y + "px"
            })

    }

    function releaseBlocked() {
        mousedown = false;
        pause = false;
        viz.classed("pressed", false);
        gauge.classed("pressed", false);

        statuses.selectAll("div.status").remove();

        tmp_time_scale.domain(time_scale.domain());
        tmp_reverse_scale.range(reverse_scale.range());

        tweets.selectAll("g")
            .classed("new", false)
            .classed("tweet", true)
            .select("circle.center")
            .attr("r", function (d) {
                        return d.f/50*8+4;
                    })
            .style("fill-opacity", 0.4)
            .style("stroke-width", 0);
    }

    function dragGauge(coord) {
        if (true) {


            var ot = tmp_reverse_scale(coord[0]),
                found = [],
                found_ids = [],
                past = tmp_reverse_scale.range()[0],
                t = Math.floor(ot / 1000) * 1000;

            // console.log(t);
            while (t > past && !found.length) {
                found = data.filter(function (d) {
                    return t == d.t;
                })
                t -= 1000;
            }

            gauge
                .style("left", coord[0] + "px")
                .select("span")
                .text(formathhmmss2(new Date(ot)));

            if (found.length) {

                showTweets(found);

                tweets.selectAll("g.tweet")
                    .filter(function (d) {
                        return found.indexOf(d) == -1
                    })
                    .select("circle.center")
                    .style("stroke", "white")
                    .style("stroke-width", 2)
                    .style("fill-opacity", 0.4);

                tweets.selectAll("g.tweet")
                    .filter(function (d) {
                        return found.indexOf(d) > -1
                    })
                    .select("circle.center")
                    .style("fill-opacity", 1);
            }
        }
    }

    function addGauge() {

        dragme = d3.select("#dragme");
        gauge = dragme.select("#gauge")
            .style("height", function () {
                if (sea) {
                    return (margin_top + half * row_distance + 40 - 150) + "px";
                } else {
                    return (height - 20 - 3 - 150) + "px";
                }
            })
            .style("left", (width / 2) + "px");

        gauge.on("mousedown", function () {
            d3.event.preventDefault();
            mousedown = true;
            pause = true;
            viz.classed("pressed", true);
            gauge.classed("pressed", true);
        }).on("mouseup", function () {
            releaseBlocked();
        });


        gauge
            .on("touchstart", function () {
                d3.event.preventDefault();
                mousedown = true;
                pause = true;
                viz.classed("pressed", true);
                gauge.classed("pressed", true);
            })
            .on("touchend", function () {
                releaseBlocked();
            });


        dragme.on("mousemove", function (d) {
            d3.event.preventDefault();
            if (mousedown) {
                var coord = d3.mouse(this);
                dragGauge(coord);
            }
        })
            .on("mouseup", function () {
                releaseBlocked();
                gauge
                    .select("span")
                    .text("Drag me");
                loop();
            })
            .on("touchmove", function (d) {
                d3.event.preventDefault();

                if (mousedown) {
                    var coord = d3.touches(this);
                    dragGauge(coord[0]);
                }
            })
            .on("touchend", function () {
                releaseBlocked();
            });
    }

    function addTweets(tweet) {

        wave_animation = true;

        groups = tweets.selectAll("g")
            .data(data)
            .enter()
            .append("g")
            .attr("class", function (d) {
                if (pause)
                    return "new " + d.c;
                return "tweet " + d.c;
            })
            .attr("transform", function (d) {
                var x = time_scale(d.t),
                    y = topics.indexOf(d.c) * row_distance;

                y = (sea ? (half * row_distance) : y) + 85

                return "translate(" + x + "," + (margin_top + y) + ")"
            });


        var circles = groups.append("circle")
            .attr("class", "center")
            .attr("cx", function (d) {
                return radius_scale(d.f) / 10;
            })
            .attr("cy", function (d) {
                return -radius_scale(d.f);
            })
            .attr("r", function (d) {
                return d.f/50*8+4;
            })
            .style("fill-opacity", function (d) {
                return 0.4;
            });


        // waves = groups.append("circle")
        //     .attr("class", "followers")
        //     .attr("d", function (d) {
        //         return waveZero(d);
        //     })
        //     .attr("transform", function (d) {
        //         return "translate(" + 0 + "," + 0 + ")"
        //     })
        //     .transition()
        //     .duration(4000)
        //     .attr("d", function (d) {
        //         return wave(d);
        //     })

    }

    function clean() {

        var data_removed = data.filter(function (d) {
            return d.t < past - 1000 * 60 * 60 * 10;
        });

        data = data.filter(function (d) {
            return d.t >= past - 1000 * 60 * 60 * 10;
        });


        tweets.selectAll("g.tweet")
            .data(data_removed)
            .remove();

        var time_labels_removed = time_labels.filter(function (d) {
            return d < past - 1000 * 60 * 60 * 10;
        });
        time_labels = time_labels.filter(function (d) {
            return d >= past - 1000 * 60 * 60 * 10;
        });

        timeline.selectAll("g.t")
            .data(time_labels_removed)
            .remove();

    }

    function changeMode() {
        sea = (sea != 1);

        d3.select("body").classed("sea", sea);
        // d3.select("div#viz").classed("sea",sea);
        // d3.select(".sea");

        max_radius = sea ? (height / 2) : row_distance * 2;
        radius_scale.range([6, max_radius]);

        updateGrid();
        updateGauge();
        animating = true;

        updateTimeLineGrid(500);
        updateTimeline(500);
        updateTweets(500);

        setTimeout(function () {
            animating = false;
        }, 500);

    }

    function updateGauge() {
        gauge
            .style("height", function (d) {
                if (sea) {
                    return (margin_top + half * row_distance + 40 - 150) + "px";
                } else {
                    return (height - 20 - 3 - 150) + "px";
                }
            });

    }

    function updateGrid() {

        grid.selectAll("line.main")
            .transition()
            .duration(1000)
            .style("opacity", sea ? 1 : 0);

        grid.selectAll("line.grid")
            .transition()
            .duration(1000)
            .style("opacity", sea ? 0 : 1);


        labels.selectAll("text.candidate-name")
            .transition()
            .duration(1000)
            .attr("x", width - 35)
            .attr("y", function (d, i) {
                if (sea) {
                    return margin_top / 3 + i * 13;
                } else {
                    return margin_top + i * row_distance - 2;
                }
            });
        labels.selectAll("rect.candidate-name")
            .transition()
            .duration(1000)
            .attr("x", width - 30)
            .attr("y", function (d, i) {
                return margin_top / 3 + i * 13 - 10;
            })
            .style("opacity", sea ? 1 : 0);


    }

    function updateTweets(duration) {

        if (duration) {
            tweets.selectAll("g." + (pause ? "new" : "tweet"))
                .transition()
                .duration(duration || speed)
                .attr("transform", function (d) {
                    var x = time_scale(d.t),
                        y = topics.indexOf(d.c) * row_distance;

                    y = (sea ? (half * row_distance) : y) + 85

                    return "translate(" + x + "," + (margin_top + y) + ")"
                })
                .select("path.followers")
                .attr("d", function (d) {
                    return wave(d);
                });

            tweets.selectAll("circle")
                .attr("cx", function (d) {
                    return radius_scale(d.f) / 10;
                })
                .attr("cy", function (d) {
                    return -radius_scale(d.f);
                });


        } else {
            tweets.selectAll("g." + (pause ? "new" : "tweet"))
                .transition()
                .duration(duration || speed)
                .attr("transform", function (d) {
                    var x = time_scale(d.t),
                        y = topics.indexOf(d.c) * row_distance;

                    y = (sea ? (half * row_distance) : y) + 85

                    return "translate(" + x + "," + (margin_top + y) + ")"
                })
        }
    }

    function calculatePath(d) {
        var i1 = topics.indexOf(d.from.c),
            i2 = topics.indexOf(d.to.c),
            x1 = time_scale(d.from.t),
            x2 = x1,
            y1 = margin_top + i1 * row_distance,
            y2 = margin_top + i2 * row_distance,
            delta = (i2 - i1) * 20;

        return [{x: x1, y: y1}, {x: (x1 + Math.abs(delta)), y: (y1 + y2) / 2}, {x: x2, y: y2}];
    }

    function waveZero(d) {
        var dx = radius_scale(d.f) / 2,
            x0 = 0 + dx,
            y0 = 0,
            x1 = radius_scale(d.f) * 2 + dx,
            y1 = -radius_scale(d.f) / 5,
            x2 = radius_scale(d.f) * 5 + dx,
            y2 = y0,
            cp00x = (x0 + x1) / 2,
            cp00y = y0,
            cp01x = (x0 + x1) / 2,
            cp01y = y1,
            cp10x = (x1 + x2) / 2,
            cp10y = y1,
            cp11x = cp10x,
            cp11y = y2;

        return "M" + x0 + "," + y0 + ("C" + cp00x + "," + cp00y + "," + cp01x + "," + cp01y + "," + x1 + "," + y1) + "L" + x1 + "," + y1 + " C" + cp10x + "," + cp10y + "," + cp11x + "," + cp11y + "," + x2 + "," + y2;//+"Z"
    }

    function wave(d) {

    	var i = data.indexOf(d);
        var x0 = 0,
            y0 = 0,
            x1 = radius_scale(d.f) / 10,
            y1 = -radius_scale(d.f),
            r = radius_scale(d.f),
            x2 = radius_scale(d.f) * 5,
            y2 = y0,
            cp1x = (x1 + x2) / 4,
            cp2x = cp1x,
            cp1y = y1,
            cp2y = y2;

        return "M" + x0 + "," + y0 + ("C" + (x0 + r * 0.2) + "," + (y0 - r * 0.3) + "," + (x1 + r * 0.2) + "," + (y1 + r * 0.3) + "," + x1 + "," + y1) + "L" + x1 + "," + y1 + " C" + cp1x + "," + cp1y + "," + cp2x + "," + cp2y + "," + x2 + "," + y2;//+"Z";

    }

    function updateTimeLineGrid(duration) {
        timeline.selectAll("g.t")
            .selectAll("line")
            .transition()
            .duration(duration || speed)
            .attr("y1", function (d) {
                if (sea) {
                    return -20;
                } else {
                    return -(height);
                }
            })
    }

    function updateTimeline(duration) {

        var last = d3.max(data, function (d) {
                return d.t;
            }),
            time_label = Math.floor(last / (1000 * 60 * 60 * 3)) * (1000 * 60 * 60 * 3);

        if (!time_labels.length) {
            time_labels.push(time_label);
        } else {
            var tmp_labels = [];
            while (time_label - time_labels[time_labels.length - 1] > 0) {
                tmp_labels.push(time_label);
                time_label -= 1000 * 60 * 60 * 3;
            }
            time_labels = time_labels.concat(tmp_labels.reverse());
        }

        var tg = timeline.selectAll("g.t")
            .data(time_labels)
            .enter()
            .append("g")
            .attr("class", "t")
            .attr("transform", function (d) {
                var y = margin_top + half * row_distance + 20;
                if (!sea) {
                    y = height - 30;
                }
                return "translate(" + time_scale(d) + "," + y + ")";
            })
        tg.append("text")
            .text(function (d) {
                return formathhmmss(new Date(d));
            });
        timeline.selectAll("text").each(function (d) {
            disableSelect(this)
        });

        tg.append("line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", function (d) {
                if (sea) {
                    return -20;
                } else {
                    return -(height);
                }
            })
            .attr("y2", -13)


        gt = timeline.selectAll("g.t")
            .transition()
            .duration(duration || speed)
            .attr("transform", function (d) {
                var y = margin_top + half * row_distance + 20;
                if (!sea) {
                    y = height - 30;
                }
                return "translate(" + time_scale(d) + "," + y + ")";
            });

    }

    grid.selectAll("line.grid")
        .data(topics)
        .enter()
        .append("line")
        .attr("class", "grid")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", function (d, i) {
            return margin_top + i * row_distance;
        })
        .attr("y2", function (d, i) {
            return margin_top + i * row_distance;
        })
        .style("opacity", 0)


    grid.append("line")
        .attr("class", "main")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", margin_top + half * row_distance + 2)
        .attr("y2", margin_top + half * row_distance + 2)
        .style("opacity", 1)

    d3.select("#sea")
        .style("top", Math.floor(margin_top + half * row_distance) + "px")

    var ls = labels.selectAll("text")
        .data(topics)
        .enter()

    ls.append("text")
        .attr("class", "candidate-name")
        .attr("rel", function (d) {
            return d;
        })
        .attr("x", width - 35)
        .attr("y", function (d, i) {
            if (sea) {
                return margin_top / 3 + i * 13;
            } else {
                return margin_top + i * row_distance - 2;
            }
        })
        .text(function (d) {
            return d;
        })
        .on("mouseover", function (c) {
            viz.classed(c, true);
        })
        .on("mouseout", function (c) {
            viz.classed(c, false);
        })
        .on("touchstart", function () {
            viz.classed(c, true);
        })
        .on("touchend", function () {
            viz.classed(c, false);
        });

    ls.append("rect")
        .attr("class", "candidate-name")
        .attr("x", width - 30)
        .attr("y", function (d, i) {
            return margin_top / 3 + i * 13 - 10;
        })
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", function (c) {
            return colors[c];
        })

    labels.selectAll("text").each(function (d) {
        disableSelect(this)
    });

    addGauge();


    // var socket = io.connect("ws://"+HOST+":"+PORT);
    // var socket = io.connect("ws://localhost:8080");

    d3.json("https://" + HOST + "/data", function (error, json) {

        if (error) {
            stats
                .style("top", "0px")
                .select("div")
                .text("Connecting...");
            return console.log("there was an error loading the data: " + error);
        }

        var __data = (json.responseText) ? JSON.parse(json.responseText) : json;//;
        __data.forEach(function (d) {
            if (topics.indexOf(d.c) > -1) {
                d.preloaded = 1;
                data.push(d);
                xs.push(0);
                ys.push(0);
            }
        });

        var extent = d3.extent(data, function (d) {
                return d.t;
            }),
            tmp_time_labels = {
                min: Math.floor(extent[0] / (1000 * 60 * 60 * 3)) * (1000 * 60 * 60 * 3),
                max: Math.floor(extent[1] / (1000 * 60 * 60 * 3)) * (1000 * 60 * 60 * 3)
            };
        past = tmp_time_labels.min;
        now = tmp_time_labels.max;

        time_scale.domain([past, now]);
        reverse_scale.rangeRound([past, now]);

        if (!pause) {
            tmp_time_scale.domain([past, now]);
            tmp_reverse_scale.range([past, now]);
        }
        while (tmp_time_labels.max - tmp_time_labels.min > 0) {
            time_labels.push(tmp_time_labels.min);
            tmp_time_labels.min += 1000 * 60 * 60 * 3;
        }

        loop();

    });


    d3.selectAll("#mode > a").on("click", function (d) {
        d3.event.stopPropagation();

        changeMode();

    })

    d3.selectAll("#footer #about > a#open").on("click", function (d) {
        d3.event.stopPropagation();
        d3.select("#footer").classed("overlay", true)
    })

    d3.selectAll("#footer #about > a#close").on("click", function (d) {
        d3.event.stopPropagation();
        d3.select("#footer").classed("overlay", false)
    })

	var rows = [];
    function getData() {

        stats
            .style("top", "-50px")
            .select("div")
            .text("CONNECTED!")
		if(rows.length == 0) {
			d3.csv("../file/bigcity.csv", function(theRows) {
			  rows = theRows;
			});
			totali ++;
		} else {
			var row = rows[totali]
	        var aqi = row.pm25;
	        var level = "Good";
	        var description = "Air quality is considered satisfactory, and air pollution poses little or no risk";
	        if (aqi > 50) {
	          if (aqi <= 100) {
	            level = "Moderate";
	            description = "Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.";
	          } else if (aqi <= 150) {
	            level = "Unhealthy for Sensitive Groups";
	            description = "Members of sensitive groups may experience health effects. The general public is not likely to be affected.";
	          } else if (aqi <= 200) {
	            level = "Unhealthy";
	            description = "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects";
	          } else if (aqi <= 300) {
	            level = "Very Unhealthy";
	            description = "Health warnings of emergency conditions. The entire population is more likely to be affected.";
	          } else {
	            level = "Hazardous";
	            description = "Health alert: everyone may experience more serious health effects";
	          }
	        }
	        var t = {
	         c:row.city.toLowerCase(),
	         t:row.time*1000,
	         d:description,
	          id:Math.floor(Math.random()*2147483647),
	          uid:Math.floor(Math.random()*2147483647),
	          name:level,
	          sname:row.city,
	          f:aqi,
	          l:'it',
	          h:[],
	          r_id:-1,
	          lat:row.latitude,
	          lon:row.longitude
	        }

			var d = t;
			// console.log(d);
			totali++;
			var user1 = {
				id_str: "1000",
				id: 1000,
				name: "haha",
				screen_name: "hoho",
				followers_count: 1000
			};

			now = Math.max(d.t, now),
				past = now - time_span;
			now = (now / (1000 * 60 * 60 * 3)) * (1000 * 60 * 60 * 3);
			past = (past / (1000 * 60 * 60 * 3)) * (1000 * 60 * 60 * 3);
			time_scale.domain([past, now]);
			reverse_scale.rangeRound([past, now]);

			if (!pause) {
				tmp_time_scale.domain([past, now]);
				tmp_reverse_scale.range([past, now]);
			}
			if (topics.indexOf(d.c) > -1) {
				data.push(d);
				xs.push(0);
				ys.push(0);
			}
			loop();
		}
    }

    // getData();
    setInterval(getData, 5000);
    function loop() {

        if (!pause)
            clean();

        if (!animating)
            updateTweets();
        if (!pause && !animating)
            updateTimeline();

        addTweets();
    }

    function disableSelect(el) {
        if (el.addEventListener) {
            el.addEventListener("mousedown", disabler, "false");
        } else {
            el.attachEvent("onselectstart", disabler);
        }
    }

    function enableSelect(el) {
        if (el.addEventListener) {
            el.removeEventListener("mousedown", disabler, "false");
        } else {
            el.detachEvent("onselectstart", disabler);
        }
    }

    function disabler(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        return false;
    }
}
