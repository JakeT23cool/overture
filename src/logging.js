const monitor = process.env.MONITOR;
const monitorIP = process.env.MONITORIP;

function logging(req,res,next){
	if(monitor != "1"){
		next();
		return 0;
	}
	let s = '['+(new Date()).toLocaleString()+'] ';
	if(monitorIP == "1")
		s+=req.socket.remoteAddress + " ";
	s += req._parsedUrl.path;
	next();
	s += " " + res.statusCode.toString();
	console.log(s);
}

export { logging }; // make it an ES module
