import AreaToDownloadTooLargeException from './exceptions/AreaToDownloadTooLargeException';
import { OpfObject, fromOverpassObject } from './OpfObject';
import Overpass from './overpass/Overpass';

import {EventEmitter} from 'events';
import difference from '@turf/difference';
import union from '@turf/union';
import bbox from '@turf/bbox';
import bboxPolygon from '@turf/bbox-polygon';
import area from '@turf/area';
import {PhoneNumberFormat, PhoneNumberUtil} from 'google-libphonenumber';
import { OverpassObject, isSameOsmObject, deserializeOverpassObject } from './overpass/OverpassObject';
import { Bbox } from './overpass/types';
import { getStatusCode } from './opf-url-checker';

type GeoJSON = object;

export default class Opf extends EventEmitter {
  private opfObjects: Array<OpfObject> = [];
  private areaDownloaded: GeoJSON | null = null;
  private queuedDownload: Bbox | null = null;
  private downloading: boolean = false;
  private static maxAreaDownload = 1;

  constructor() {
    super();
  }

  isDownloading() {
    return this.downloading;
  }

  phoneTest() {
    const phoneUtil = PhoneNumberUtil.getInstance();
    const number = phoneUtil.parseAndKeepRawInput('479 38-13-89 ', 'BE');
    console.log(number.getCountryCode());
    console.log(phoneUtil.isValidNumber(number));
    console.log(phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL))
  }

  private process(toProcess: Array<OpfObject>) {
    for (const object of toProcess) {
      for (const tag of object.tags) {
        if (tag.key === "phone" || tag.key === "contact:phone") {
          const phoneUtil = PhoneNumberUtil.getInstance();
          const number = phoneUtil.parseAndKeepRawInput(tag.val, 'BE');
          console.log(`${tag.key} = ${tag.val}`);
          object.phoneNumbers.push({
            key: tag.key,
            origial: tag.val,
            formatted: phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL),
            corrected: "",
            checked: false
          })
        }

        if (tag.key === "website" || tag.key === "contact:website") {
          console.log(tag.val);
          getStatusCode(tag.val).then(e => console.log)
        }
      }
    }
  }

  /**
   * 
   * @param newObjects 
   * 
   * @emits opfObjectsAdded
   */
  private addOpfObjects(newObjects: Array<OpfObject>) {
    let objectsToAdd: Array<OpfObject> = [];

    for (const newObject of newObjects) {
      let existingObject = this.opfObjects.find(testObject => isSameOsmObject(testObject, newObject));
      if (existingObject === undefined) {
        objectsToAdd.push(newObject);
      } else {
        if (existingObject.version === newObject.version) {
          // This happens when a way / realtion is partially outside the bbox
          console.log(existingObject);
        } else {
          // TODO: conflict
          console.error("todo: conflict");
        }
          
      }
    }

    this.process(objectsToAdd);

    this.emit("objectsAdded", objectsToAdd);
    this.opfObjects.push(...objectsToAdd);
  }

  OpfObjects() {
    return this.opfObjects;
  }

  /**
   * Private, use download() as a public
   * alternative.
   * 
   * @param toDownload 
   * 
   * @emits downloadStarted 
   * @emits downloadFinished 
   * @emits opfObjectsAdded
   */
  private uncheckedDownload(toDownload: Bbox) {
    this.downloading = true;
    let toDownloadBboxPolygon = bboxPolygon(toDownload);

    if (this.areaDownloaded === null) {
      this.areaDownloaded = toDownloadBboxPolygon;
    } else {
      this.areaDownloaded = union(this.areaDownloaded, toDownloadBboxPolygon);
    }

    Overpass.download(toDownload, ["phone", "contact:phone", "website", "contact:website"]).then(overpassObjects => {
      this.downloading = false;
      this.emit("downloadFinished", toDownload.slice());

      if (this.queuedDownload !== null) {
        this.uncheckedDownload(this.queuedDownload);
        this.queuedDownload = null;
      }

      this.addOpfObjects(overpassObjects.map(fromOverpassObject));
    });

    this.emit("downloadStarted", toDownload.slice());
  }

  QueuedDownload() {
    return this.queuedDownload == null ? null : this.queuedDownload.slice();
  }

  /**
   * 
   * @param toDownload 
   * 
   * @emits downloadQueued
   */
  private queueDownload(toDownload: Bbox) {
    this.queuedDownload = toDownload;
    this.emit("downloadQueued", this.QueuedDownload());
  }

  /**
   * 
   * @param toDownload 
   * 
   * @emits downloadQueued
   * @emits downloadStarted 
   * @emits downloadFinished 
   * @emits opfObjectsAdded
   */
  download(toDownload: object) {
    if (this.areaDownloaded !== null)
      toDownload = difference(toDownload, this.areaDownloaded);
    
    if (toDownload !== null) {
      let toDownloadBbox = bbox(toDownload);
      let toDownloadBboxPolygon = bboxPolygon(toDownloadBbox);
  
      if (area(toDownloadBboxPolygon) > Opf.maxAreaDownload * Math.pow(10, 3 * 2))
        throw new AreaToDownloadTooLargeException(`Area to download must be smaller or equal to ${Opf.maxAreaDownload} sqr km`);
      
      if (this.isDownloading()) {
        this.queueDownload(toDownloadBbox);
      } else {
        this.uncheckedDownload(toDownloadBbox);
      }
    }
  }
}
