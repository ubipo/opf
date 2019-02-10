import json, sys

with open(sys.argv[1]) as f: 
	raw = f.read()

parsed = json.loads(raw)

for feature in parsed["features"]:
	with open("{}/{}.geojson".format(sys.argv[2], feature["properties"]["ISO3166-1:alpha2"]), "w") as f: 
		f.write(json.dumps(feature))