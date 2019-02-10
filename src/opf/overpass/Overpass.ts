import { OverpassObject, deserializeOverpassObject } from "./OverpassObject";
import { SerializedOverpassObject, Bbox, osmTypeStrings } from "./types";



export default abstract class Overpass {
  private static cardinalDirections = ['w', 's', 'e', 'n'];

  private static parseAndDeserializeRes(res: string): Array<OverpassObject> {
    let parsed = JSON.parse(res);
    let serialized: Array<SerializedOverpassObject> = parsed.elements;
    let deserialized: Array<OverpassObject> = serialized.map(deserializeOverpassObject);
    return deserialized;
  }

  private static isValidBbox(bbox: Bbox): boolean {
    return bbox.length == 4;
  }

  private static normalizeBbox(bbox: Bbox) {
    if (bbox[0] > bbox[2]) {
      let w = bbox[0];
      bbox[0] = bbox[2];
      bbox[2] = w;
    }

    if (bbox[1] > bbox[3]) {
      let s = bbox[1];
      bbox[1] = bbox[3];
      bbox[3] = s;
    }
  }

  static buildQuery(bbox: Bbox, keys: Array<string>) : string {
    if (!this.isValidBbox(bbox))
      throw new Error("ff");

    this.normalizeBbox(bbox);

    let query = document.implementation.createDocument(null, "osm-script", null);
    let eRoot = query.getElementsByTagName("osm-script")[0];
    eRoot.setAttribute("output", "json");
    eRoot.setAttribute("timeout", "25");

    let eUnion = query.createElement("union");
    eUnion.setAttribute("into", "_");

    let eBbox = query.createElement("bbox-query");
    for (let i = 0; i < 4; i++) {
      eBbox.setAttribute(this.cardinalDirections[i], bbox[i].toString());
    }

    for (const key of keys) {
      for (const type in osmTypeStrings) {
        let eQuery = query.createElement("query");
        eQuery.setAttribute("type", type);
    
        let eHasKv = query.createElement("has-kv");
        eHasKv.setAttribute("k", key);
    
        eQuery.appendChild(eHasKv);
        eQuery.appendChild(eBbox.cloneNode())
        eUnion.appendChild(eQuery);
      }
    }

    eRoot.appendChild(eUnion);

    let ePrint = query.createElement("print");
    ePrint.setAttribute("from", "_");
    ePrint.setAttribute("geometry", "center");
    ePrint.setAttribute("ids", "yes");
    ePrint.setAttribute("mode", "meta");
    ePrint.setAttribute("order", "id");
    eRoot.appendChild(ePrint);

    return eRoot.outerHTML;
  }

  static download(bbox: Bbox, keys: Array<string>): Promise<Array<OverpassObject>> {
    let query = this.buildQuery(bbox, keys);

    let req = new XMLHttpRequest();
    req.open("POST", "https://overpass-api.de/api/interpreter");
    req.setRequestHeader("Content-type", "application/xml");

    return new Promise<Array<OverpassObject>>((resolve, reject) => {
      req.addEventListener("load", e => {
        resolve(Overpass.parseAndDeserializeRes(req.responseText));
      });
      req.send(query);
    })
  }
} 