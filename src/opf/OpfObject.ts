import { OverpassObject } from "./overpass/OverpassObject";
import { cloneDeep } from 'lodash';

type PhoneNumbers = {
  key: string,
  origial: string,
  formatted: string,
  corrected: string,
  checked: boolean
}

export interface OpfObject extends OverpassObject {
  phoneNumbers: Array<PhoneNumbers>;
}

export function fromOverpassObject(overpassObject: OverpassObject) {
  let opfObject: OpfObject = cloneDeep(overpassObject as OpfObject);
  opfObject.phoneNumbers = [];
  return opfObject;
}