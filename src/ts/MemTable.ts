/// <reference path="Helper.ts"/>

class MemoryTable {
  public table: HashTable = {};
  private offset: number = 0;
  //Entries not true memory locations, only placeholders and offsets (in base 10)
  public dirty = true;

  constructor() {}

  //Allocate new memory. Return name of placeholder addr as byte code array
  public newLoc(len: number = 1): [string, string] {
    if (this.offset > 256) {
      throw new Error("Memory Overflow");
    }
    let memLoc = "T" + this.offset.toString().padStart(3, "0");
    memLoc = memLoc.substr(0, 2) + " " + memLoc.substr(2);
    this.table[memLoc] = this.offset;
    this.offset += len;
    return [memLoc.substr(0, 2), memLoc.substr(3)];
  }


  //Assuming beta and offsets are base 10
  //Will convert to base 16/memory addresses in function
  public correct(beta: number) {
    let keys = Object.keys(this.table);
    let hex;
    for (let key of keys) {
      this.table[key] += beta;
      hex = this.table[key].toString(16).padStart(4, "0");
      //Swap the order of bytes to reflect the addressing scheme in 6502a
      this.table[key] = hex.substr(2) + " " + hex.substr(0, 2);
    }
    this.dirty = false;
  }

  public backpatch(byteArr: string[]): string {
    let code = byteArr.join(" ");
    let keys = Object.keys(this.table);
    let regExp: RegExp;
    for (let key of keys) {
      regExp = new RegExp(key, 'g');
      code = code.replace(regExp, this.table[key]);
    }
    return code;
  }
}
