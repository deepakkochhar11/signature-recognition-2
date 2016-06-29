'use strict'
const INDEX_THRESHOLD = 50
const EXTREMA_GRANULARITY = '1'
const LENGTH = 1000

module.exports = {
	compare: compare
}

var DTW = require('dtw')
var dtw = new DTW()

function compare(newSignature, savedSignatures, callback) {
	var savedX = []
	var savedY = []
  var savedForce = []

	for (var i = savedSignatures.length - 1; i >= 0; i--) {
		savedX.push(savedSignatures[i].x)
		savedY.push(savedSignatures[i].y)
      savedForce.push(savedSignatures[i].force)
	}

	var xResult = compareValues(newSignature.x, savedX)
	// var yResult = compareValues(newSignature.y, savedY)
  // var forceResult = compareValues(newSignature.force, savedForce)

	// var combinedScore = combineScores(xResult, yResult, forceResult)
	// var success = combinedScore < SCORE_THRESHOLD ? true : false
	var result = {
		success: true,
		combinedScore: null,
		x: xResult,
		y: null,
		acceleration: null,
		gyroscope: null,
		force: null,
	}
  console.log("Result: " + result)
	callback(result)
}

function compareValues(newValues, savedValues) {
	var score = 0;
	for (var i = 0; i < savedValues.length; i++) {
		var result = compute_slicing_result(JSON.parse(newValues), JSON.parse(savedValues[i]));
		score = score + result
	}

	return score/savedValues.length
}

function combineScores(xScore, yScore, forceScore) {
	return (xScore * 0.1 + yScore * 0.5 + forceScore * 1000) / 3
}

function compute_slicing_result(s, t) {
	console.log('Elements in s:', s.length);
	console.log('Elements in t:', t.length);
	s = s.filter(function(n){ return n != undefined })
	t = t.filter(function(n){ return n != undefined })
	console.log('Numeric elements in s:', s.length);
	console.log('Numeric elements in t:', t.length);

	var extrema_s = prepare_slicing(s)
	var extrema_t = prepare_slicing(t)
	console.log(extrema_s);
	console.log(extrema_t);

	console.log('dtw mapped minlists:');
	var mapped_extrema_minlists = map_extrema_lists(extrema_s.minlist, extrema_t.minlist)
	extrema_s.minlist = mapped_extrema_minlists[0]
	extrema_t.minlist = mapped_extrema_minlists[1]
	var mapped_extrema_maxlists = map_extrema_lists(extrema_s.maxlist, extrema_t.maxlist)
	extrema_s.maxlist = mapped_extrema_maxlists[0]
	extrema_t.maxlist = mapped_extrema_maxlists[1]
  console.log(extrema_s.minlist);
  console.log(extrema_t.minlist);
	console.log(extrema_s.maxlist);
  console.log(extrema_t.maxlist);
	var cleaned_extrema_minlists = clean_up_lists(extrema_s.minlist, extrema_t.minlist)
	extrema_s.minlist = cleaned_extrema_minlists[0]
	extrema_t.minlist = cleaned_extrema_minlists[1]
	var cleaned_extrema_maxlists = clean_up_lists(extrema_s.maxlist, extrema_t.maxlist)
	extrema_s.maxlist = cleaned_extrema_maxlists[0]
	extrema_t.maxlist = cleaned_extrema_maxlists[1]
	var cutting_points = determine_cutting_points(extrema_s, extrema_t)
	console.log('cutting points:');
	console.log(cutting_points[0]);
	console.log(cutting_points[1]);

	return calculate_costs(s, t, cutting_points)
}

function prepare_slicing(values) {
	// ### Extrema function ###

	var extrema = function(values, eps) {
	    // make y enumerated and define x = 1, 2, 3, ...
	    var x, y;
	    y = enumerate(values);
	    x = Object.keys(y).map(Math.floor);
	    // call extremaXY version
	    var res = extremaXY(x, y, eps);
	    res.minlist = res.minlist.map(function(val) {
	        var index = Math.floor((val[1] + val[0]) / 2);
	        return Object.keys(values)[index];
	    });
	    res.maxlist = res.maxlist.map(function(val) {
	        var index = Math.floor((val[1] + val[0]) / 2);
	        return Object.keys(values)[index];
	    });

	    return {minlist: res.minlist, maxlist: res.maxlist};
	}

	var extremaXY = function(x, y, eps) {
	        // declare local vars
	        var n, s, m, M, maxlist, minlist, i, j;
	        // define x & y enumerated arrays
	        var enumerate = function(obj) {
	            var arr = [];
	            var keys = Object.keys(obj);
	            for (var k = 0; k < keys.length; k++) {
	                arr[k] = obj[keys[k]];
	            }
	            return arr;
	        }
	        y = enumerate(y);
	        x = enumerate(x);
	        // set initial values
	        n = y.length;
	        s = 0;
	        m = y[0];
	        M = y[0];
	        maxlist = [];
	        minlist = [];
	        i = 1;
	        if (typeof eps == "undefined") {
	            eps = 0.1;
	        }
	        // the algorithm
	        while (i < n) {
	            if (s == 0) {
	                if (!(M - eps <= y[i] && y[i] <= m + eps)) {
	                    if (M - eps > y[i]) {
	                        s = -1;
	                    }
	                    if (m + eps < y[i]) {
	                        s = 1;
	                    }
	                }
	                M = Math.max(M, y[i]);
	                m = Math.min(m, y[i]);
	            }
	            else {
	                if (s == 1) {
	                    if (M - eps <= y[i]) {
	                        M = Math.max(M, y[i]);
	                    }
	                    else {
	                        j = i - 1;
	                        while(y[j] >= M - eps) {
	                            j--;
	                        }
	                        maxlist.push( [x[j], x[i]] );
	                        s = -1;
	                        m = y[i];
	                    }
	                }
	                else {
	                    if(s == -1) {
	                        if(m + eps >= y[i]) {
	                            m = Math.min(m, y[i]);
	                        }
	                        else {
	                            j = i - 1;
	                            while(y[j] <= m + eps) {
	                                j--;
	                            }
	                            minlist.push( [x[j], x[i]] );
	                            s = 1;
	                            M = y[i];
	                        }
	                    }
	                }
	            }
	            i++;
	        }

	        return {minlist: minlist, maxlist: maxlist};
	    }

	    // helper to make an array or object an enumerated array
	    var enumerate = function(obj) {
	        var arr = [];
	        var keys = Object.keys(obj);
	        for (var k = 0; k < keys.length; k++) {
	            arr[k] = obj[keys[k]];
	        }
	        return arr;
	}

	values = values.filter(function(n){ return n != undefined })
	var extrema = extrema(values, EXTREMA_GRANULARITY)

	extrema.minlist = extrema.minlist.filter(function(n){ return n != undefined })
	extrema.maxlist = extrema.maxlist.filter(function(n){ return n != undefined })

	for(var i = 0; i < extrema.minlist.length; i++) extrema.minlist[i] = parseInt(extrema.minlist[i])
	for(var i = 0; i < extrema.maxlist.length; i++) extrema.maxlist[i] = parseInt(extrema.maxlist[i])

	return extrema
}

function map_extrema_lists(list_s, list_t) {
	if (list_s.length > 0 && list_t.length > 0) {
		var cost_intervals = dtw.compute(list_s, list_s);
	  var path = dtw.path();
	  var new_list_s = [list_s[0]];
	  var new_list_t = [list_t[0]];
	  if (list_s.length <= list_t.length) {
	    for (var i = 1; i < path.length; i++) {
	      if (i > 0 && (path[i][0] !== path[i-1][0])) {
	        if (i < path.length-1 && path[i][0] == path[i+1][0]) {
	          var indices = []
	          for (var j = i; j < path.length; j++) {
	            if (path[i][0] == path[j][0]) {
	              indices.push(j);
	            }
	          }
	          var distances = []
	          for (var k = 0; k < indices.length; k++) {
	            var local_distance = Math.abs(list_s[path[i][0]] - list_t[indices[k]]);
	            distances.push(local_distance);
	          }
	          var min = Math.min.apply(null, distances);
	          var index = indices[distances.indexOf(min)];

	          new_list_s.push(list_s[path[index][0]]);
	          new_list_t.push(list_t[path[index][1]]);
	          i = indices[indices.length-1]
	        } else {
	          new_list_s.push(list_s[path[i][0]]);
	          new_list_t.push(list_t[path[i][1]]);
	        }
	      }
	    }
	  } else if (list_t.length < list_s.length) {
	    for (var i = 1; i < path.length; i++) {
	      if (i > 0 && (path[i][1] !== path[i-1][1])) {
	        if (i < path.length-1 && path[i][1] == path[i+1][1]) {
	          var indices = []
	          for (var j = i; j < path.length; j++) {
	            if (path[i][1] == path[j][1]) {
	              indices.push(j);
	            }
	          }
	          var distances = []
	          for (var k = 0; k < indices.length; k++) {
	            var local_distance = Math.abs(list_s[indices[k]] - list_t[path[i][1]]);
	            distances.push(local_distance);
	          }
	          var min = Math.min.apply(null, distances);
	          var index = indices[distances.indexOf(min)];

	          new_list_s.push(list_s[path[index][0]]);
	          new_list_t.push(list_t[path[index][1]]);
	          i = indices[indices.length-1]
	        } else {
	          new_list_s.push(list_s[path[i][0]]);
	          new_list_t.push(list_t[path[i][1]]);
	        }
	      }
	    }
	  }
	  return [new_list_s, new_list_t]
	}
	return [[],[]]
}

function clean_up_lists(list_s, list_t) {
	var rejected_s = []
	var rejected_t = []
	for (var i = 0; i < list_s.length; i++) {
	  if ((Math.abs(list_s[i] - list_t[i])) > INDEX_THRESHOLD) {
	    rejected_s.push(list_s[i])
	    rejected_t.push(list_t[i])
	  }
	}

	for (var i = 0; i < rejected_s.length; i++) {
	  list_s.splice(list_s.indexOf(rejected_s[i]), 1)
	  list_t.splice(list_t.indexOf(rejected_t[i]), 1)
	}

	return [list_s, list_t]
}

function determine_cutting_points(extrema_s, extrema_t) {
	var min_minlists = Math.min.apply(null, extrema_s.minlist.concat(extrema_t.minlist));
	var min_maxlists = Math.min.apply(null, extrema_s.maxlist.concat(extrema_t.maxlist));
	var cutting_points = undefined

	if (min_minlists < min_maxlists) {
		cutting_points = cutting_points_for_lists(extrema_s.minlist, extrema_s.maxlist, extrema_t.minlist, extrema_t.maxlist)
	} else {
		cutting_points = cutting_points_for_lists(extrema_s.maxlist, extrema_s.minlist, extrema_t.maxlist, extrema_t.minlist)
	}
	return cutting_points
}

function cutting_points_for_lists(list_s1, list_s2, list_t1, list_t2) {
	var points_s = []
	var points_t = []
	if (list_s1.length > 0 && list_t1.length > 0) {
		points_s.push(list_s1[0])
		points_t.push(list_t1[0])
	}
	if (list_s2.length > 0 && list_t2.length > 0) {
		points_s.push(list_s2[0])
		points_t.push(list_t2[0])
	}
	for (var i = 1; i < Math.max(list_s1.length, list_t1.length, list_s2.length, list_t2.length); i++) {
		if ((list_s1[i] != undefined) &&
				(list_t1[i] != undefined) &&
				(list_s1[i] > points_s[points_s.length - 1]) &&
				(list_t1[i] > points_t[points_t.length - 1])) {
					points_s.push(list_s1[i])
					points_t.push(list_t1[i])
		}
		if ((list_s2[i] != undefined) &&
				(list_t2[i] != undefined) &&
				(list_s2[i] > points_s[points_s.length - 1]) &&
				(list_t2[i] > points_t[points_t.length - 1])) {
					points_s.push(list_s2[i])
					points_t.push(list_t2[i])
		}
	}
	return [points_s, points_t]
}

function calculate_costs(s, t, cutting_points) {
	var sum = 0
	var costs = undefined
	for (var i = 0; i < cutting_points[0].length - 1; i++) {
	  var s_slice = s.slice(cutting_points[0][i], cutting_points[0][i+1])
	  var t_slice = t.slice(cutting_points[0][i], cutting_points[0][i+1])
	  costs = dtw.compute(s_slice, t_slice)
	  sum = sum + costs
	  console.log('Costs slice_' + (i + 1) + ':', costs)
	}
	console.log('Costs sum slices: ' + sum)
	return sum
}