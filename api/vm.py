from gevent import monkey
monkey.patch_all()

from flask import Flask, request, jsonify
from flask_compress import Compress
from flask_cors import CORS
import numpy as np
import datetime
import json
import subprocess
from dateutil.relativedelta import relativedelta
from PIL import Image, ImageDraw
from io import BytesIO
from owslib.wms import WebMapService
import dateutil.parser
import grequests

# pip install gevent pillow grequests flask_compress owslib
#docker run -it -e LETSENCRYPT_HOST=vmapi.jrsrp.com -e LETSENCRYPT_EMAIL=peter.scarth@gmail.com -e VIRTUAL_HOST=vmapi.jrsrp.com -v /root/api/:/home/jovyan/work/ -p 8017:5001 -e VIRTUAL_PORT=5001 -t petescarth/datascience-rs37 /bin/bash



# Set Up Logging
import logging
logger = logging.getLogger(__name__)
hdlr = logging.FileHandler('/home/jovyan/vmapi.log')
formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
hdlr.setFormatter(formatter)
logger.addHandler(hdlr) 
logger.setLevel(logging.DEBUG)


# Global request parameters
class baseConfig(object):
    def __init__(self):
        self.imageWidth = 64
        self.imageHeight = 64


#Geo Bounding Box Class:
#Attributes: Upper/Lower+Left/Right X/Y coordinates
class boundingBox(object):
    def __init__(self, coordList):
        # Return a bounding box object
        self.ulx = float(min(coordList[0]))
        self.lrx = float(max(coordList[0]))
        self.uly = float(max(coordList[1]))
        self.lry = float(min(coordList[1]))
        self.midX = (self.ulx + self.lrx) / 2.0
        self.midY = (self.lry + self.uly) / 2.0
        self.lenX = abs(self.ulx - self.lrx)
        self.lenY = abs(self.lry - self.uly)
        self.area = self.lenX * self.lenY
        
# Extract and flatten all the geometry to build the bounding box
def geoJsonBbox(jsonRepr):
    coordList = list(zip(*list(explodeJson(getJsonValues('coordinates',jsonRepr)))))
    return  boundingBox(coordList)

 
# Modify json.loads to return dict at all levels
def getJsonValues(jsonKey, jsonRepr):
    results = []
    def _decode_dict(a_dict):
        try: results.append(a_dict[jsonKey])
        except KeyError: pass
        return a_dict
    json.loads(jsonRepr, object_hook=_decode_dict)  # return value ignored
    return results

# Explode a GeoJSON geometry's coordinates object and yield coordinate tuples.
# As long as the input is conforming, the type of the geometry doesn't matter
def explodeJson(coords):
    for e in coords:
        if isinstance(e, (float, int)):
            yield coords
            break
        else:
            for f in explodeJson(e):
                yield f

# Burn the polygons into an image
def burnPolys(jsonRepr):
    rp = baseConfig()
    bbox = geoJsonBbox(jsonRepr)
    # Extract the coordinate arrays
    jsonPolys = getJsonValues('coordinates',jsonRepr)
    
    # Geographic x & y distance
    xratio = rp.imageWidth/bbox.lenX
    yratio = rp.imageHeight/bbox.lenY
    # Setup the bilevel output image
    img = Image.new("1", (rp.imageWidth, rp.imageHeight), 0)
    draw = ImageDraw.Draw(img)
    # Loop for each polygon geometry
    for jsonPoly in jsonPolys:
        pixels = []
        for coordList in explodeJson(jsonPoly):
          px = int(rp.imageWidth - ((bbox.lrx - coordList[0]) * xratio))
          py = int((bbox.uly - coordList[1]) * yratio)
          pixels.append((px,py))
        # Draw the polygon onto the image. Outline could be 0 to ignore boundary
        draw.polygon(pixels, outline=1,fill=1)
    #img.save("poly.png")
    return img

# Simple Moving Average Function to smooth a histogram
# Takes care to buffer either end of the series
def smoothHistogram(a, n=5):
    bufferList = [0] * int(n//2)
    paddedList = bufferList[:]
    paddedList.extend(a)
    paddedList.extend(bufferList)
    ret = np.cumsum(paddedList, dtype=float)
    ret[n:] = ret[n:] - ret[:-n]
    # Round the result since it's a histogram
    return np.around(ret[n - 1:] / n)

# Utility Function to format the output as JSON with Javascript Times
def jsonJS(fcDate,fcValue):
    # Convert the datetime dates to integer miliseconds    
    fcMilliSeconds =[int((t - datetime.datetime(1970, 1, 1).date()).total_seconds() * 1000) for t in fcDate]
    # Replace and nans with None type objects
    fcValueNone = np.where(np.isnan(fcValue), None, fcValue)
    if fcValueNone.ndim>1:
        # Is a histogram - convert the array to a list
        return [[d,v.tolist()] for (d,v) in zip(fcMilliSeconds,fcValueNone)]
    else:
        # Is a float value       
        return [[d,v] for (d,v) in zip(fcMilliSeconds,fcValueNone)]

#Function to extract statistics from returned WMS images
def decodeWMStiff(timeSeriesTiff,dataStartValue,geoJsonPoly):
    maskImage =  burnPolys(geoJsonPoly)
    # Output Arrays
    histTimeSeriesData = []
    meanTimeSeriesData = []
    stdevTimeSeriesData = []
    countTimeSeriesData = []
    p5TimeSeriesData = []
    p20TimeSeriesData = []
    p50TimeSeriesData = []
    p80TimeSeriesData = []
    p95TimeSeriesData = []

    # Static arrays for calculating histogram stats
    coverValues = np.array([np.arange(101),np.arange(101),np.arange(101)],dtype=np.float)
    
    for tiffData in timeSeriesTiff:
        # Open each image as a PIL object
        try:
            tiffImage = Image.open(BytesIO(tiffData.content))
            # Calculate the histogram for the image
            imageHist = np.asarray([smoothHistogram(tiffImage.split()[band].histogram(maskImage)[dataStartValue:dataStartValue+101]) for band in [0,1,2]])
            histTimeSeriesData.append(imageHist)
           

            ## These are not used in the current API - have been offsided to Javascript API
            imageCount = imageHist.sum(axis=1) # Could be an issue here when two of the covers add up to 100% so third is 0%.
            if imageCount.min()>1:
                imageMean = (imageHist * coverValues).sum(axis=1) / imageCount
                imageStd = np.sqrt((imageHist * np.square(coverValues - np.array([imageMean,]*101).transpose())).sum(axis=1) / imageCount)
                cumHist = np.cumsum(imageHist ,axis=1).transpose() / imageCount
                
                meanTimeSeriesData.append(imageMean)
                stdevTimeSeriesData.append(imageStd)
                countTimeSeriesData.append(imageCount)
                p5TimeSeriesData.append(np.argmax(cumHist >= 0.05, axis=0))
                p20TimeSeriesData.append(np.argmax(cumHist >= 0.20, axis=0))
                p50TimeSeriesData.append(np.argmax(cumHist >= 0.50, axis=0))
                p80TimeSeriesData.append(np.argmax(cumHist >= 0.80, axis=0))
                p95TimeSeriesData.append(np.argmax(cumHist >= 0.95, axis=0))
            else:
                meanTimeSeriesData.append([None,None,None])
                stdevTimeSeriesData.append([None,None,None])
                countTimeSeriesData.append(imageCount)
                p5TimeSeriesData.append([None,None,None])
                p20TimeSeriesData.append([None,None,None])
                p50TimeSeriesData.append([None,None,None])
                p80TimeSeriesData.append([None,None,None])
                p95TimeSeriesData.append([None,None,None])



        except IOError:
            histTimeSeriesData.append(np.transpose([[None,None,None]]*101))
            meanTimeSeriesData.append([None,None,None])
            stdevTimeSeriesData.append([None,None,None])
            countTimeSeriesData.append([None,None,None])
            p5TimeSeriesData.append([None,None,None])
            p20TimeSeriesData.append([None,None,None])
            p50TimeSeriesData.append([None,None,None])
            p80TimeSeriesData.append([None,None,None])
            p95TimeSeriesData.append([None,None,None])


    # Return as np arrays
    return (np.asarray(meanTimeSeriesData,dtype=np.float),
            np.asarray(stdevTimeSeriesData,dtype=np.float),
            np.asarray(countTimeSeriesData,dtype=np.float),
            np.asarray(histTimeSeriesData,dtype=np.float),
            np.asarray(p5TimeSeriesData,dtype=np.float),
            np.asarray(p20TimeSeriesData,dtype=np.float),
            np.asarray(p50TimeSeriesData,dtype=np.float),
            np.asarray(p80TimeSeriesData,dtype=np.float),
            np.asarray(p95TimeSeriesData,dtype=np.float))


def getRainfall(requestBbox,sumPeriod):
    #Queries the rainfall raster at the appropriate scale
    #Uses custom made rainfall rasters
    #Rescaled using gdalwarp averaging

    # Call GDAL - Test Making Faster Local Function
    scaleDegrees = np.sqrt(requestBbox.area)
    print("Scale of Extract is %f" % scaleDegrees)
    
    if   scaleDegrees < 0.05:
        rainFileName = "bom-rain-month-005.tif"
    elif scaleDegrees < 0.10:
        rainFileName = "bom-rain-month-010.tif"
    elif scaleDegrees < 0.20:
        rainFileName = "bom-rain-month-020.tif"
    elif scaleDegrees < 0.50:
        rainFileName = "bom-rain-month-050.tif"
    elif scaleDegrees < 1.00:
        rainFileName = "bom-rain-month-100.tif"
    elif scaleDegrees < 2.00:
        rainFileName = "bom-rain-month-200.tif"
    else:
        rainFileName = "bom-rain-month-500.tif"
    
        
    rainfallCall = " ".join(["gdallocationinfo -valonly -wgs84",rainFileName, str(requestBbox.midX),str(requestBbox.midY)])
    # Pick up the rain from 1987 onward (84th Month). Last line in the file is a cr so we drop that as well
    monthlyRain = np.array(list(map(int,
        subprocess.Popen(rainfallCall, shell=True, stdout=subprocess.PIPE)
        .stdout.read()
        .decode("utf-8")
        .split('\n')[:-1])))
    
    # Rainfall is reported at the end of the month. 1987-09-01 below corresponds to 1987-10-01 as the first rainfall layer in the stack
    rainTimes = [(datetime.datetime(1987, 9, 1).date() + relativedelta(months=i)) for i in range(len(monthlyRain))]
    
    # Compute cumulative rainfall
    rainTimes=[rainTimes[i+sumPeriod-1] for i in range(len(monthlyRain)-sumPeriod+1)]
    monthlyRain=[sum(monthlyRain[i:i+sumPeriod]) for i in range(len(monthlyRain)-sumPeriod+1)]
   # JSON
    return jsonJS(rainTimes,monthlyRain)



def getTimeLayersInfo(url):
    # Returns a list of dictionaries containing just the time enabled wms layers found on the server
    # Uses the most excellent owslib
    layerInfo = []

    # Generic getmap string used for grabbing thr raw imagery subsets from the server in the format we need
    # Note we have hard coded 64 x 64 rasters here. It's a tradeoff between speed and accuracy over large areas
    getMapString = 'wms?service=WMS&version=1.1.1&request=GetMap&styles=raster&width=64&height=64&srs=EPSG:4326&format=image/tiff&layers='
    
    # Query the server. Note thet we specify the url to the geoserver instance
    wms = WebMapService(url+"ows", version='1.1.1')
    
    # Go through the layers one by one
    for layer in list(wms.contents):
        # Get the layer times
        isoTimes = wms[layer].timepositions
        # If the layer has times, then add the information to the dictionary
        if isoTimes is not None:
            layerName = wms[layer].name
            layerTimes = [dateutil.parser.parse(isoTime) for isoTime in isoTimes]
            # Work out WMS Getmap URL to add to the dictionary
            # We'll add the time and bbos parameters later
            if ':' in layerName:
                layerURL = url+layerName.split(':')[0]+'/'+getMapString+layerName
            else:
                layerURL = url+getMapString+layerName
            # Add the information to the array of dictionaries
            layerInfo.append({'name': layerName, 'times':layerTimes, 'url':layerURL})
            
    return layerInfo






def maskedMeanJSON(dataArray):
    if dataArray.count() > 0:
        return dataArray.mean()
    return None


def logCoverFactor(cover):
  #peperModel = -0.0465 * cover - 0.7985
  robModel = -0.000545 * cover**1.9 - 0.802962
  return robModel
  
def logCover(coverFactor):
  #peperModel = np.clip(-(coverFactor + 0.7985) /  0.0465,1,99)
  robModel = np.clip((-(coverFactor + 0.802962) /  0.000545)**(1.0/1.9),1,99) 
  return robModel
  
def changeRasterMean(coverArray,cfA,cfB):
    newCoverArray = coverArray.copy()
    for i in range(len(newCoverArray)):        
        if newCoverArray[i].count() > 0:
            # Get the current mean value of cover after the transform
            currentCoverFactorMean = logCoverFactor(newCoverArray[i]).mean()
            wantedCoverFactorMean = np.log(float(cfA)) + (currentCoverFactorMean * float(cfB))
            wantedCoverMean = logCover(wantedCoverFactorMean)
            # Loop until the mean is acceptably close
            while abs(newCoverArray[i].mean() - wantedCoverMean) > 1:
                #print(newCoverArray[i].mean(), wantedCoverMean)
                # Change every value so that the mean will work out OK
                newCoverArray[i] = newCoverArray[i] + wantedCoverMean - newCoverArray[i].mean()
                # Fix up the raster where the values are incorrect
                newCoverArray[i,newCoverArray[i]>100]=100
                newCoverArray[i,newCoverArray[i]<0]=0
            #print(wantedCoverFactorMean,logCoverFactor(newCoverArray[i]).mean())
            #print(newCoverArray[i].mean(), wantedCoverMean)
    return newCoverArray


  

  
peperApp = Flask(__name__)
CORS(peperApp)
Compress(peperApp)


@peperApp.route("/tsjson", methods = ['GET','POST'])
def tsPlot():

    # Debug Stuff
    processStartTime = datetime.datetime.now()
    print("********** Starting VM API **********")
    print(datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S%z"))

    print("IP address: %s" % request.environ.get('HTTP_X_FORWARDED_FOR'))
    
    global imageDates
    global imageDatesModis


    # Get the JSON data sent from the form
    wmsLayer = request.args.get('wmsLayer')
    geoJsonPoly = request.args.get('geoJsonPoly')
    returnRain = request.args.get('monthlyRainfall')
    
    # Handle POST Form data if no GET request
    if geoJsonPoly is None:
        print("Is POST Polygon")
        geoJsonPoly = request.form.get('geoJsonPoly', None)
    
    if wmsLayer is None:
        print("Is POST wmsLayer")
        wmsLayer = request.form.get('wmsLayer', "aus:ground_cover")
        
    if returnRain is None:
        print("Is POST returnRain")
        returnRain = request.form.get('monthlyRainfall', None)

    # Build Bounding Box from geoJSON if it exists
    if geoJsonPoly is not None:
      requestBbox = geoJsonBbox(geoJsonPoly)
    else:
        return "Hey, there's no polygon or bounds. You need to give me something to work with!"
    
    # Check if MODIS
    dataStartValue = 100  #Landsat is 100 to 200
    if "modis" in wmsLayer.lower():
        print("MODIS Processing")
        dataStartValue =  0 # MODIS is 0 to 100
        imageDates = imageDatesModis

    # Sort out the image Dates
    imageTimes = [datetime.datetime.strptime(d,'%Y-%m').date() for d in imageDates]
                
    # Setup the WMS URL for download
    bbox = str(requestBbox.ulx) + "," + str(requestBbox.lry) + "," + str(requestBbox.lrx) + "," + str(requestBbox.uly)
    wmsURL = "https://geoserver.tern.org.au/geoserver/aus/wms?service=WMS&version=1.1.0&request=GetMap&layers="+wmsLayer+"&styles=raster&width=64&height=64&srs=EPSG:4326&format=image/tiff&bbox="+bbox+"&time="
    logger.info(wmsLayer + " " + bbox)
    
    # Create a set of unsent server equests:
    imageDatesSub = [t.strftime("%Y-%m") for t in imageTimes]
    serverRequests = (grequests.get(wmsURL + date) for date in imageDatesSub)
    for i in range(4):
      # Query the server in parallel
      print("Sending Requests")
      timeSeriesWMS = grequests.map(serverRequests)
      print("Received Requests")
      # Decode the results
      meanTimeSeriesData,stdevTimeSeriesData,countTimeSeriesData,histTimeSeriesData,p5TimeSeriesData,p20TimeSeriesData,p50TimeSeriesData,p80TimeSeriesData,p95TimeSeriesData = decodeWMStiff(timeSeriesWMS,dataStartValue,geoJsonPoly)
      # How many invalid points
      tileErrors = np.count_nonzero(np.isnan(countTimeSeriesData))
      print("Tile Errors  %f " % tileErrors) 
      if tileErrors < 10:
        break
        

    # JSON Output
    print("Formatting Output")
    # Compute the rainfall if requested
    rainJSONData = {}
    if returnRain is not None:
      try:
        sumPeriod = int(float(returnRain))
      except:
        sumPeriod = 1

    rainJSONData = getRainfall(requestBbox,sumPeriod)
    
    bareJSONdataHist = jsonJS(imageTimes,histTimeSeriesData[:,0]) 
    greenJSONdataHist = jsonJS(imageTimes,histTimeSeriesData[:,1])
    nongreenJSONdataHist =jsonJS(imageTimes,histTimeSeriesData[:,2])
    bareJSONdata = jsonJS(imageTimes,meanTimeSeriesData[:,0])
    greenJSONdata = jsonJS(imageTimes,meanTimeSeriesData[:,1])
    nongreenJSONdata = jsonJS(imageTimes,meanTimeSeriesData[:,2])
    bareJSONdataSD = jsonJS(imageTimes,stdevTimeSeriesData[:,0])
    greenJSONdataSD = jsonJS(imageTimes,stdevTimeSeriesData[:,1])
    nongreenJSONdataSD = jsonJS(imageTimes,stdevTimeSeriesData[:,2])
    bareJSON5p =jsonJS(imageTimes,p5TimeSeriesData[:,0])
    bareJSON20p =jsonJS(imageTimes,p20TimeSeriesData[:,0])
    bareJSON50p =jsonJS(imageTimes,p50TimeSeriesData[:,0])
    bareJSON80p =jsonJS(imageTimes,p80TimeSeriesData[:,0])
    bareJSON95p =jsonJS(imageTimes,p95TimeSeriesData[:,0])
    greenJSON5p =jsonJS(imageTimes,p5TimeSeriesData[:,1])
    greenJSON20p =jsonJS(imageTimes,p20TimeSeriesData[:,1])
    greenJSON50p =jsonJS(imageTimes,p50TimeSeriesData[:,1])
    greenJSON80p =jsonJS(imageTimes,p80TimeSeriesData[:,1])
    greenJSON95p =jsonJS(imageTimes,p95TimeSeriesData[:,1])
    nongreenJSON5p =jsonJS(imageTimes,p5TimeSeriesData[:,2])
    nongreenJSON20p =jsonJS(imageTimes,p20TimeSeriesData[:,2])
    nongreenJSON50p =jsonJS(imageTimes,p50TimeSeriesData[:,2])
    nongreenJSON80p =jsonJS(imageTimes,p80TimeSeriesData[:,2])
    nongreenJSON95p =jsonJS(imageTimes,p95TimeSeriesData[:,2])

    #fcObject = {"bareHist": bareJSONdataHist,"greenHist": greenJSONdataHist,"nongreenHist": nongreenJSONdataHist, "monthlyRainfall":rainJSONData}
    fcObject = {"bare": bareJSONdata,
                "green": greenJSONdata,
                "nongreen": nongreenJSONdata,
                "bareSD": bareJSONdataSD,
                "greenSD": greenJSONdataSD,
                "nongreenSD": nongreenJSONdataSD,
                "bareHist": bareJSONdataHist,
                "greenHist": greenJSONdataHist,
                "nongreenHist": nongreenJSONdataHist,
                "monthlyRainfall":rainJSONData,
                "bare5percentile": bareJSON5p,
                "green5percentile": greenJSON5p,
                "nongreen5percentile": nongreenJSON5p,
                "bare20percentile": bareJSON20p,
                "green20percentile": greenJSON20p,
                "nongreen20percentile": nongreenJSON20p,
                "bare50percentile": bareJSON50p,
                "green50percentile": greenJSON50p,
                "nongreen50percentile": nongreenJSON50p,
                "bare80percentile": bareJSON80p,
                "green80percentile": greenJSON80p,
                "nongreen80percentile": nongreenJSON80p,
                "bare95percentile": bareJSON95p,
                "green95percentile": greenJSON95p,
                "nongreen95percentile": nongreenJSON95p}
    
    print("Request time taken %f seconds" % (datetime.datetime.now() - processStartTime).total_seconds())
    return json.dumps(fcObject)


    # Close the Dastset
    dataSet = None
    return jsonify(returnList)    

@peperApp.route("/isup", methods = ['GET'])
def helloworld():
        return "Yes"


if __name__ == "__main__":
    # Make a list of date strings
    # Todo - Extract from getcapabilities
    imageDates = ["1987-12","1988-03","1988-06","1988-09","1988-12","1989-03","1989-06","1989-09","1989-12","1990-03","1990-06","1990-09","1990-12","1991-03","1991-06","1991-09","1991-12","1992-03","1992-06","1992-09","1992-12","1993-03","1993-06","1993-09","1993-12","1994-03","1994-06","1994-09","1994-12","1995-03","1995-06","1995-09","1995-12","1996-03","1996-06","1996-09","1996-12","1997-03","1997-06","1997-09","1997-12","1998-03","1998-06","1998-09","1998-12","1999-03","1999-06","1999-09","1999-12","2000-03","2000-06","2000-09","2000-12","2001-03","2001-06","2001-09","2001-12","2002-03","2002-06","2002-09","2002-12","2003-03","2003-06","2003-09","2003-12","2004-03","2004-06","2004-09","2004-12","2005-03","2005-06","2005-09","2005-12","2006-03","2006-06","2006-09","2006-12","2007-03","2007-06","2007-09","2007-12","2008-03","2008-06","2008-09","2008-12","2009-03","2009-06","2009-09","2009-12","2010-03","2010-06","2010-09","2010-12","2011-03","2011-06","2011-09","2011-12","2012-03","2012-06","2012-09","2012-12","2013-03","2013-06","2013-09","2013-12","2014-03","2014-06","2014-09","2014-12","2015-03","2015-06","2015-09","2015-12","2016-03","2016-06","2016-09","2016-12","2017-03","2017-06","2017-09","2017-12","2018-03","2018-06","2018-09","2018-12","2019-03","2019-06","2019-09","2019-12","2020-03","2020-06","2020-09","2020-12","2021-03","2021-06","2021-09"]
    imageDatesModis = ["2000-02","2000-03","2000-04","2000-05","2000-06","2000-07","2000-08","2000-09","2000-10","2000-11","2000-12","2001-01","2001-02","2001-03","2001-04","2001-05","2001-06","2001-07","2001-08","2001-09","2001-10","2001-11","2001-12","2002-01","2002-02","2002-03","2002-04","2002-05","2002-06","2002-07","2002-08","2002-09","2002-10","2002-11","2002-12","2003-01","2003-02","2003-03","2003-04","2003-05","2003-06","2003-07","2003-08","2003-09","2003-10","2003-11","2003-12","2004-01","2004-02","2004-03","2004-04","2004-05","2004-06","2004-07","2004-08","2004-09","2004-10","2004-11","2004-12","2005-01","2005-02","2005-03","2005-04","2005-05","2005-06","2005-07","2005-08","2005-09","2005-10","2005-11","2005-12","2006-01","2006-02","2006-03","2006-04","2006-05","2006-06","2006-07","2006-08","2006-09","2006-10","2006-11","2006-12","2007-01","2007-02","2007-03","2007-04","2007-05","2007-06","2007-07","2007-08","2007-09","2007-10","2007-11","2007-12","2008-01","2008-02","2008-03","2008-04","2008-05","2008-06","2008-07","2008-08","2008-09","2008-10","2008-11","2008-12","2009-01","2009-02","2009-03","2009-04","2009-05","2009-06","2009-07","2009-08","2009-09","2009-10","2009-11","2009-12","2010-01","2010-02","2010-03","2010-04","2010-05","2010-06","2010-07","2010-08","2010-09","2010-10","2010-11","2010-12","2011-01","2011-02","2011-03","2011-04","2011-05","2011-06","2011-07","2011-08","2011-09","2011-10","2011-11","2011-12","2012-01","2012-02","2012-03","2012-04","2012-05","2012-06","2012-07","2012-08","2012-09","2012-10","2012-11","2012-12","2013-01","2013-02","2013-03","2013-04","2013-05","2013-06","2013-07","2013-08","2013-09","2013-10","2013-11","2013-12","2014-01","2014-02","2014-03","2014-04","2014-05","2014-06","2014-07","2014-08","2014-09","2014-10","2014-11","2014-12","2015-01","2015-02","2015-03","2015-04","2015-05","2015-06","2015-07","2015-08","2015-09","2015-10","2015-11","2015-12","2016-01","2016-02","2016-03","2016-04","2016-05","2016-06","2016-07","2016-08","2016-09","2016-10"]
    imageDatesS2 = ["2017-01","2017-02","2017-03","2017-04","2017-05","2017-06","2017-07","2017-08","2017-09","2017-10","2017-11","2017-12","2018-01","2018-02","2018-03","2018-04","2018-05","2018-06","2018-07","2018-08","2018-09","2018-11","2018-12","2019-01","2019-02","2019-03","2019-04","2019-05","2019-06","2019-07","2019-08","2019-09","2019-10","2019-11","2019-12","2020-01","2020-02","2020-03","2020-04","2020-05","2020-06","2020-07","2020-08","2020-09","2020-10","2020-11","2020-12","2021-03","2021-06","2021-09"]

    peperApp.run(host="0.0.0.0",port=int("5001"),debug=False)