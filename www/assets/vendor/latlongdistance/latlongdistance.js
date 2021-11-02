/*
	
	This script is pretty basic, but if you use it, please let me know.  Thanks!
	Andrew Hedges, andrew(at)hedges(dot)name
	
	*/
	
	var Rm = 3961; // mean radius of the earth (miles) at 39 degrees from the equator
	var Rk = 6373; // mean radius of the earth (km) at 39 degrees from the equator
		
	/* main function */
	function findDistance(t1,n1,t2,n2) {
		var lat1, lon1, lat2, lon2, dlat, dlon, a, c, dm, dk, mi, km, dx,dy,bigd;

		
		// convert coordinates to radians
		lat1 = deg2rad(t1);
		lon1 = deg2rad(n1);
		lat2 = deg2rad(t2);
		lon2 = deg2rad(n2);
		
		// find the differences between the coordinates
		dlat = lat2 - lat1;
		dlon = lon2 - lon1;
		
		// here's the heavy lifting
		a  = Math.pow(Math.sin(dlat/2),2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon/2),2);
		c  = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); // great circle distance in radians
		dm = c * Rm; // great circle distance in miles
		dk = c * Rk; // great circle distance in km
		
    dx = dlon * Rk;
    dy = dlat * Rk;
    
    if (dy>dx) {bigd = dy}
    else {bigd = dx}
    
		// round the results down to the nearest 1/1000
		mi = round(dm);
		km = round(dk);
		
    return bigd;
	}
	
	
	// convert degrees to radians
	function deg2rad(deg) {
		rad = deg * Math.PI/180; // radians = degrees * pi/180
		return rad;
	}
	
	
	// round to the nearest 1/1000
	function round(x) {
		return Math.round( x * 1000) / 1000;
	}
	