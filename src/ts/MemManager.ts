/// <reference path="Helper.ts"/>

class MemoryManager {
  private heap: HashTable = {};
  private dirtyMemory: string[] = [];
  private staticTable: HashTable = {};
  private jumpTable: HashTable = {};
  private jumpTableLen = 0;
  private staticLength = 0;
  private heapLength = 0;

  constructor() {
    //Initialize a static memory address that will hold a 00
    //Used as a "false" value for unconditional branching
    this.staticTable["FV XX"] = "";
  }

  //Allocate new static memory. Return name of placeholder addr
  public allocateStatic(allowDirty: boolean = true): string[] {
    if (allowDirty && this.dirtyMemory.length > 0) {
      let addr = this.dirtyMemory.shift();
      return addr.split(" ");
    }
    //Create placeholder address
    let addr = "S" + this.staticLength.toString().padStart(3, "0");
    this.staticLength++;
    addr = addr.substr(0, 2) + " " + addr.substr(2);
    this.staticTable[addr] = "";
    return addr.split(" ");
  }

  //Allocate new heap memory. Return name of placeholder addr
  public allocateHeap(hexData: string): string {
    let addr = "H" + this.heapLength++; //Create placeholder address
    this.heap[addr] = {data: hexData, loc: ""};
    return addr;
  }

  public newJumpPoint() {
    let jp = "J" + this.jumpTableLen++; //Create placeholder address
    this.jumpTable[jp] = "";
    return jp;
  }

  public setJumpPoint(jumpPoint: string, jumpAmt: number) {
    if (this.jumpTable[jumpPoint] === undefined) {
      this.jumpTableLen++;
    }
    this.jumpTable[jumpPoint] = jumpAmt.toString(16).padStart(2, "0").toUpperCase();
  }

  public allowOverwrite(addr: string[]) {
    if (addr !== null && addr.length === 2) {
      let loc = addr.join(" ");
      if (this.dirtyMemory.indexOf(loc) === -1) {
        this.dirtyMemory.push(loc);
      }
    }
  }

  public releaseAllStaticMem() {
    //Set the entire contents of static memory to be marked for re-use
    let keys = Object.keys(this.staticTable);
    this.dirtyMemory = this.dirtyMemory.concat(keys);
  }


  //Assuming beta and offsets are base 10
  //Will convert to base 16/memory addresses in function
  public correct(alpha: number) {
    let keys = Object.keys(this.staticTable);
    let beta = alpha + keys.length;
    if (beta > 256) {
      throw this.error();
    }
    //Convert memory locations of static table
    let hex;
    for (let i = 0; i < keys.length; i++) {
      hex = (alpha + i).toString(16).padStart(4, "0").toUpperCase();
      //Swap the order of bytes to reflect the addressing scheme in 6502a
      this.staticTable[keys[i]] = hex.substr(2) + " " + hex.substr(0, 2);
    }
    //Convert memory locations of heap
    keys = Object.keys(this.heap);
    let offset = 0;
    for (let key of keys) {
      this.heap[key].loc = (beta + offset).toString(16).padStart(2, "0").toUpperCase();
      offset += this.heap[key].data.split(" ").length;
    }
    if (beta + offset > 256) {
      throw this.error();
    }
  }

  public backpatch(byteArr: string[]): string {
    //Pad byteArr with zeros for static locations
    let staticKeys = Object.keys(this.staticTable);
    for (let key of staticKeys) {
      byteArr.push("00");
    }
    //Add heap data to end of byteArr
    let heapKeys = Object.keys(this.heap);
    for (let key of heapKeys) {
      byteArr = byteArr.concat(this.heap[key].data.split(" "));
    }
    let code = byteArr.join(" ");
    //Backpatch static locations
    let regExp: RegExp;
    for (let key of staticKeys) {
      Log.print(`Backpatching '${key}' to '${this.staticTable[key]}'...`, LogPri.VERBOSE);
      regExp = new RegExp(key, 'g');
      code = code.replace(regExp, this.staticTable[key]);
    }
    //Backpatch static locations
    for (let key of heapKeys) {
      Log.print(`Backpatching '${key}' to '${this.heap[key].loc}'...`, LogPri.VERBOSE);
      regExp = new RegExp(key, 'g');
      code = code.replace(regExp, this.heap[key].loc);
    }
    //Backpatch Jump Points
    let jumpKeys = Object.keys(this.jumpTable);
    for (let key of jumpKeys) {
      Log.print(`Backpatching '${key}' to '${this.jumpTable[key]}'...`, LogPri.VERBOSE);
      regExp = new RegExp(key, 'g');
      code = code.replace(regExp, this.jumpTable[key]);
    }
    return code;
  }

  private error() {
    let e = new Error("Program exceeds 256 bytes!");
    e.name = "Pgrm_Overflow";
    return e;
  }
}
