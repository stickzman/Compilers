/// <reference path="Tree.ts"/>
class SymbolTable extends BaseNode {

  private table: HashTable = {};

  constructor(parent?: SymbolTable) {
    super(null)
    if (parent !== undefined) {
      parent.addChild(this);
    }
  }

  public insert(nameTok: Token, typeTok: Token) {
    this.table[nameTok.symbol] = {nameTok:nameTok, typeTok:typeTok,
                                  initialized:false, used:false};
  }

  public lookup(name: string) {
    let node: SymbolTable = this;
    let entry;
    //Search in this scope first, then search up the tree
    while (node !== null) {
      entry = node.table[name];
       if (entry === null) {
         node = <SymbolTable>node.parent;
       } else {
         return entry;
       }
    }
    return null;
  }

  public toString(): string {
    let str = "";
    let keys = Object.keys(this.table);
    let name: string = "";
    let type: string = "";
    for (let i = 0; i < keys.length; i++) {
      name = this.lookup(keys[i]).nameTok.symbol;
      type = this.lookup(keys[i]).typeTok.name;
      str += `[name: ${name}, type: ${type}]\n`;
    }
    return str;
  }

  public length() {
    return Object.keys(this.table).length;
  }
}
