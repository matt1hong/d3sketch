
//// COMMON VARIABLES
// Dimensions
var margin = {top: 30, right: 20, bottom: 45, left: 70},
    width = 960 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

// Column names
var col = {
	"selective": "ACT Composite 25th percentile score (bin)",
	"region": "Geographic region (group)",
	"name": "Name",
	"enrollment": "Percent of total enrollment",
	"endowment": "Total endowment (log)"
}

// Scatterplot transformations
var xValue = function(d) { return +d[col["enrollment"]];},
	xDomain = [0,36],
    xScale = d3.scaleLinear().domain(xDomain).range([0, width]),
    xMap = function(d) { return xScale(xValue(d));},
    xAxis = d3.axisBottom(xScale)
    	.tickFormat(function(d){return d});

var yValue = function(d) { return +d[col["endowment"]];},
	yDomain = [1e3, 3e6],
    yScale = d3.scaleLog().clamp(true).domain(yDomain).range([height, 0]), // Log scale
    yMap = function(d) { return yScale(yValue(d));},
    yAxis = d3.axisLeft(yScale)
    	.ticks(4)
    	.tickFormat(function(d){
    		if (d.toString()[0] == 1) {
    			return d3.format(",.0f")(d/1000) + "K"
    		}
    	})

var cValue = function(d) { return d[col["selective"]];}



//// D3 INITIALIZATION
// SVG container
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Tooltips container
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);



//// SVG CODE
var shapeClasses = {
	"circles": ".dot",
	"refX": ".reference.x",
	"refY": ".reference.y"
}

function toggleShapes (params, transition) {
	for (var shape in shapeClasses) {
		var selection = svg.selectAll(shapeClasses[shape]);
		if (transition) {
			selection.transition(transition).style("opacity", +params[shape]);
		} else {
			selection.style("opacity", +params[shape]);
		}
	}
}

function update(params) {
	var group = params.group;
	var pointAt = params.pointAt;

	d3.csv("./" + group + "-enrollment.csv").then(function(data) {
		// Filter
		var regionFilter = function(d) { 
			return d[col["region"]].indexOf(params.region) > -1 
		};
		var pointAtFilter = function(d) {
			return Object.keys(pointAt).indexOf(d[col["name"]]) > -1
		};

		// Transitions
		var t = d3.transition()
		      .duration(params.reset ? 0 : 750)
		      .ease(d3.easeLinear);

		// Circles
		var stage = svg.selectAll(".dot")
			.data(data.filter(regionFilter));

		stage.exit()
			.remove();

		stage.transition(t)
			.attr("fill", function(d) { 
		      	if (d[col["selective"]] == "Selective"
		      		&& params.colorCircles) {
					return "rgba(133,118,187,1)";
		      	} else {
		      		return "rgba(133,118,187,0.2)";
		      	}
		    })
			.attr("cx", xMap)
			.attr("cy", yMap)
		
		// Point out selected circles
		svg.selectAll(".dotinfo").remove();
		if (pointAt && Object.keys(pointAt).length > 0) {
			svg.selectAll(".dotinfo")
				.data(data.filter(pointAtFilter))
			.enter().append("text")
				.attr("class", "dotinfo")
				.text(function(d){
					return d[col["name"]];
				})
				.attr("x", xMap)
				.attr("y", yMap)
				.attr("transform", function(d) {
					var translation = pointAt[d[col["name"]]];
					return "translate("+translation.x+","+translation.y+")"
				})
		}

		// Reference lines
		var xMedian = d3.median(data, xValue);
	    var xReference = svg.selectAll('.reference.x.line')
			.transition(t)
			.attr("class", "reference line x " + group)
	        .attr('x1', xScale(xMedian))
	        .attr('y1', yScale(yDomain[0]))
	        .attr('x2', xScale(xMedian))
	        .attr('y2', yScale(yDomain[1]));

		var groupLabel = capitalize(group);
		var stageText = svg.selectAll(".axis.label.x.groupinfo")
			.attr("class", "axis label x groupinfo " + group)
			.text(" who are " + groupLabel);
		var stageRefText = svg.selectAll(".reference.label.x")
			.attr("class", "reference label x " + group)
			.transition(t)
			.attr("transform",
				"translate(" + (xScale(xMedian) + 8) + 
				"," + (height-6) + ")")
			.text("Median " +groupLabel+ " enrollment");

		toggleShapes(params, t);
	})
}

function render(params) {
	var group = params.group;

	d3.csv("./" + group + "-enrollment.csv").then(function(data) {

		// Filter
		var regionFilter = function(d) { 
			return d[col["region"]].indexOf(params.region) > -1 };


		// Create axes and ticks
		var bottom = svg.append("g")
	      .attr("class", "x axis")
	      .attr("transform", "translate(0," + height + ")")
	      .call(xAxis)  

	    var left =   svg.append("g")
	      .attr("class", "y axis")
	      .call(yAxis)


		// Draw circles
		var circles = svg.selectAll(".dot")
				.data(data.filter(regionFilter))
		    .enter().append("circle")
		    	.attr("class", "dot")
			    .attr("fill", function(d) { 
			      	if (d[col["selective"]] == "Selective"
			      		&& params.colorCircles) {
						return "rgba(133,118,187,1)"
			      	} else {
			      		return "rgba(133,118,187,0.2)"
			      	}
			    })
			    .attr("r", 10)
			    .attr("cx", xMap)
			    .attr("cy", yMap)

		circles.on("mouseover", function(d) {
		          tooltip.transition()
		               .duration(200)
		               .style("opacity", .9);
		          tooltip.html(d[col["name"]] + "<br/>" 
		          	+ "Enrollment: " + xValue(d) + "%<br/>"
			        + "Endowment: $" + formatNumber(yValue(d)))
		               .style("left", (d3.event.pageX + 5) + "px")
		               .style("top", (d3.event.pageY - 28) + "px");
		      })
		      .on("mouseout", function(d) {
		          tooltip.transition()
		               .duration(500)
		               .style("opacity", 0);
		      });


		// Draw reference lines
		var xMedian = d3.median(data, xValue)
	    var xReference = svg.append('line')
	        .attr('x1', xScale(xMedian))
	        .attr('y1', yScale(yDomain[0]))
	        .attr('x2', xScale(xMedian))
	        .attr('y2', yScale(yDomain[1]))
	        .attr('class', 'reference x line ' + group);
	    var yReference = svg.append('line')
	        .attr('x1', xScale(xDomain[0]))
	        .attr('y1', yScale(84000))
	        .attr('x2', xScale(xDomain[1]))
	        .attr('y2', yScale(84000))
	        .attr('class', 'reference y line');


	    // Create axis labels
	    var groupLabel = capitalize(group);
	    // x axis
	    var bottomText = svg.append("g")
		  .attr("transform", 
		  	"translate(" + (width / 2) + " ," + (height+margin.bottom - 2) + ")")
	    bottomText.append("text")
	    	.attr("class", "axis label x")
	    	.attr("transform", "translate(-50,0)")
		  	.text(col["enrollment"])
		bottomText.append("text")
			.attr("class", "axis label x groupinfo " + group)
			.attr("transform", "translate(125,0)")
		  	.text(" who are " + groupLabel)

		var xReferenceText = svg.append("text")
			.attr("class", "reference label x " + group)
			.attr("transform",
				"translate(" + (xScale(xMedian) + 8) + 
				"," + (height-6) + ")")
			.text("Median " +groupLabel+ " enrollment")

		// y axis
	    svg.append("text")
	    	.attr("class", "axis label y")
		    .attr("transform", "rotate(-90)")
		    .attr("y", 0 - margin.left)
		    .attr("x",0 - (height / 2))
		    .attr("dy", "1em")
		    .text("Endowment per student (log)")

		var yReferenceText = svg.append("text")
			.attr("class", "reference label y")
			.attr("transform",
				"translate(" + (width) + 
				"," + (yScale(84000) - 6) + ")")
			.text("Average endowment")

		toggleShapes(params)
	})
}



//// UTILITY FUNCTIONS
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatNumber (num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
}




