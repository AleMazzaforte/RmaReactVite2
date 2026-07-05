const kits: Record<string, { sku: string | string[] }> = {
  "KIT GI190 345ML": {
    sku: ["GI190 N 135ML", "GI190 C 70ML", "GI190 M 70ML", "GI190 A 70ML"],
  },
  "KIT EP544 280ML": { sku: ["EP544 N 70ML", "EP544-EP504 C 70ML", "EP544-EP504 M 70ML", "EP544-EP504 A 70ML"] },
  "KIT EP664 400ML": {
    sku: [
      "EP664-EP673 N 100ML", "EP664-EP673 C 100ML",
      "EP664-EP673 M 100ML", "EP664-EP673 A 100ML",
    ],
  },
  
  "KIT EP673 600ML": {
    sku: [
      "EP664-EP673 N 100ML", "EP664-EP673 C 100ML",
      "EP664-EP673 M 100ML", "EP664-EP673 A 100ML",
      "EP673 LC 100ML", "EP673 LM 100ML",
    ],
  },
  "KIT H901XL": { sku: ["H901XL N", "H901XL C"] },
  "KIT EP73-EP117": { sku: ["EP117 N", "EP73 C", "EP73 M", "EP73 A"] },
  "KIT EP544-EP664 4L": { sku: ["EP544-EP664-EP673 N", "EP544-EP664-EP673 C", "EP544-EP664-EP673 M", "EP544-EP664-EP673 A"] },
  "KIT EP73-EP115": { sku: ["EP115 N", "EP73 C", "EP73 M", "EP73 A"] },
  "KIT EP73-EP90": { sku: ["EP90 N", "EP73 C", "EP73 M", "EP73 A"] },
  "KIT EP196-EP197":{
    sku: ["EP197 N", "EP196 C", "EP196 M", "EP196 A"],
  },
  "KIT EP206": {
    sku: ["EP206 N", "EP206 C", "EP206 M", "EP206 A"],
  },
  "KIT EP296-EP297": {
    sku: ["EP297 N", "EP296 C", "EP296 M", "EP296 A"],
  },
};

export default kits;