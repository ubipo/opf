# QGIS Countries Guide

How to create the assets/countries folder

## Download

```
[out:json][timeout:300];
(
  relation["boundary"="administrative"]["admin_level"="2"];
);
out body;
>;
out skel qt;
```

## Processing

- Remove all features that match "'id' IS NULL OR 'ISO3166-1:alpha2' IS NULL OR 'name:en' IS NULL"
- Remove all attributes except "id", "ISO3166-1:alpha2" and "name:en" 
- Buffer (0.03°)
- Dissolve (dissolve fields: id)
- Simplify (0.03°, Area)
- Create new field ("IntersectingCountries", String, 80) with expression "IntersectingCountries(@layer_id)", where "IntersectingCountries" is the following:
*IntersectingCountries*
```python
from qgis.core import *
from qgis.gui import *

@qgsfunction(args='auto', group='Custom', usesgeometry=True)
def IntersectingCountries(layerName, feature, parent):
    layer = QgsProject.instance().mapLayer(layerName)
    IntersectingCountries = []
    
    for f in layer.getFeatures():
        geom = f.geometry()
        if f.attribute("id") == feature.attribute("id"):
            continue
        
        if geom.intersects(feature.geometry()):
            IntersectingCountries.append(f.attribute("ISO3166-1:alpha2"))
            
    return ";".join(IntersectingCountries)
```
- Export as geojson (COORDINATE_PRECISION=5)
- Split in individual geojson's using:
*split-ocic-geojson.py*
```python
import json, sys

with open(sys.argv[1]) as f: 
	raw = f.read()

parsed = json.loads(raw)

for feature in parsed["features"]:
	with open("{}/{}.geojson".format(sys.argv[2], feature["properties"]["ISO3166-1:alpha2"]), "w") as f: 
		f.write(json.dumps(feature))
```