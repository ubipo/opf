export type OsmType = "node" | "way" | "relation";

export const osmTypeStrings = {
  node: "node",
  way: "way",
  relation: "relation"
}

export type Bbox = Array<number>;

export interface SerializedOverpassObject {
  [key:string]: any; // Add index signature
}

export type OsmRelationMember = {
  type: string,
  id: number,
  role: string
}

export type Tag = {
  key: string,
  val: string
}