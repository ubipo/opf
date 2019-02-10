import { OverpassObject } from "./overpass/OverpassObject";
import { OsmType } from "./overpass/types";

import destination from '@turf/destination';
import { getCoord } from '@turf/invariant';

type GeoJSON = object;
type Country = string;
type cachedGeom = {
  country: Country,
  geom: GeoJSON
}
type cachedLoc = {
  country: Country,
  name: string
}
type NominatimLookupType = "city" | "postalcode";

/**
 * A class of CountryLookup objects that
 * try to look up the country of an osm
 * object as efficiently as possible.
 */
export default class CountryLookup {
  private static reverseLookupBboxSize = 20; // km (side)
  private static cardinalDirections = ['w', 's', 'e', 'n'];
  private static cardinalDirectionBearings = [-90, 180, 90, 0];

  cachedGeoms: Array<cachedGeom> = [];
  cachedCities: Array<cachedLoc> = [];
  cachedPostcodes: Array<cachedLoc> = [];

  lookup(object: OverpassObject): Country {
    let city, postcode = null;
    for (const tag of object.tags) {
      if (tag.key === "addr:country") {
        return tag.val;
      } else if (tag.key === "addr:city") {
        let cachedCity = this.cachedCities.find(city => city.name === tag.val);
        if (cachedCity !== undefined) {
          return cachedCity.country;
        }
      } else if (tag.key === "addr:postcode") {
        let cachedPostcode = this.cachedPostcodes.find(postcode => postcode.name === tag.val);
        if (cachedPostcode !== undefined) {
          return cachedPostcode.country;
        }
      }
    }

    return "";
  }

  naminatimReverseLookup(osmType: OsmType, id: number) {
    let nominatimOsmType = osmType.slice(0,1).toUpperCase();
    let req = new XMLHttpRequest();
    let query = `osm_type=${nominatimOsmType}&osm_id=${id}`;
    req.open(
      "GET", 
      `https://nominatim.openstreetmap.org/reverse?email=ubipo.skippy@gmail.com&format=jsonv2&${query}`
    );

    return new Promise<string>((resolve, reject) => {
      req.addEventListener("load", e => {
        resolve(CountryLookup.countryFromNominatimRes(req.responseText));
      });
      req.send();
    })
  }

  static buildPostcodeOverpassQuery(postcode: string, lat: number, lon: number) : string {
    let query = document.implementation.createDocument(null, "osm-script", null);
    let eRoot = query.getElementsByTagName("osm-script")[0];
    eRoot.setAttribute("output", "json");
    eRoot.setAttribute("timeout", "25");

    let eUnion = query.createElement("union");
    eUnion.setAttribute("into", "_");

    let eQuery = query.createElement("query");
    eQuery.setAttribute("type", "relation");

    let center = [lon, lat];
    
    let bbox = []
    let eBbox = query.createElement("bbox-query");
    for (let i = 0; i < 4; i++) {
      console.log(this.cardinalDirectionBearings[i]);

      let point = getCoord(destination(center, this.reverseLookupBboxSize / 2, this.cardinalDirectionBearings[i]));
      console.log(point);
      let val = point[i % 2];
      console.log(val);
      eBbox.setAttribute(this.cardinalDirections[i], val.toString());
    }
    eQuery.append(eBbox);

    let eTypeKv = query.createElement("has-kv");
    eTypeKv.setAttribute("k", "type");
    eTypeKv.setAttribute("v", "boundary");
    eQuery.appendChild(eTypeKv);
    let eBoundaryKv = query.createElement("has-kv");
    eBoundaryKv.setAttribute("k", "boundary");
    eBoundaryKv.setAttribute("v", "postal_code");
    eQuery.appendChild(eBoundaryKv);
    let ePostalCodeKv = query.createElement("has-kv");
    ePostalCodeKv.setAttribute("k", "postal_code");
    ePostalCodeKv.setAttribute("v", postcode);
    eQuery.appendChild(ePostalCodeKv);

    eUnion.appendChild(eQuery);

    eRoot.appendChild(eUnion);

    let ePrintMain = query.createElement("print");
    ePrintMain.setAttribute("from", "_");
    ePrintMain.setAttribute("geometry", "center");
    ePrintMain.setAttribute("ids", "yes");
    ePrintMain.setAttribute("mode", "body");
    ePrintMain.setAttribute("order", "quadtile");
    eRoot.appendChild(ePrintMain);

    // realation members
    let eRecurse = query.createElement("recurse");
    eRecurse.setAttribute("from", "_");
    eRecurse.setAttribute("into", "_");
    eRecurse.setAttribute("type", "down");
    eRoot.appendChild(eRecurse);

    // member coords
    let ePrintRecursed = query.createElement("print");
    ePrintRecursed.setAttribute("from", "_");
    ePrintRecursed.setAttribute("geometry", "center");
    ePrintRecursed.setAttribute("ids", "yes");
    ePrintRecursed.setAttribute("mode", "skeleton");
    ePrintRecursed.setAttribute("order", "quadtile");
    eRoot.appendChild(ePrintRecursed);

    return eRoot.outerHTML;
  }

  // static getPostcodeGeom(postcode: string): GeoJSON {

  // }

  static countryFromNominatimRes(res: string): string {
    console.log(JSON.parse(res));
    return "BE";
  }

  static nominatimLookup(name: string, lat: number, lon: number, lookupType: NominatimLookupType): Promise<string> {
    /**
     4.7013115882873535,
              50.88064560036615
            ],
            [
              4.703199863433838,
              50.88064560036615
            ],
            [
              4.703199863433838,
              50.88145790082436
            ],
            [
              4.7013115882873535,
              50.88145790082436
     */

    let req = new XMLHttpRequest();
    req.open("GET", `https://nominatim.openstreetmap.org/search?email=ubipo.skippy@gmail.com&format=jsonv2&${lookupType}=${name}`);

    return new Promise<string>((resolve, reject) => {
      req.addEventListener("load", e => {
        resolve(this.countryFromNominatimRes(req.responseText));
      });
      req.send();
    })
  }
}