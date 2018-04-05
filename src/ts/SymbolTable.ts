/// <reference path="Tree.ts"/>
class SymbolTable extends BaseNode {

  public table: HashTable = {};

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

  public setLocation(varName: string, loc: string[]) {
    this.table[varName].memLoc = loc;
  }

  public getLocation(varName: string) {
    return this.table[varName].memLoc;
  }

  public getType(varName: string) {
    let entry = this.table[varName];
    if (entry === undefined) {
      return null;
    }
    return entry.typeTok.name;
  }

  public lookup(name: string) {
    let node: SymbolTable = this;
    let entry;
    //Search in this scope first, then search up the tree
    while (node !== null) {
      entry = node.table[name];
       if (entry === undefined) {
         node = <SymbolTable>node.parent;
       } else {
         return entry;
       }
    }
    return undefined;
  }

  public toString(): string {
    let str = "";
    let depth = 0;

    //Print this Symbol Table if its the root
    let keys = Object.keys(this.table);
    let entry;
    for (let i = 0; i < keys.length; i++) {
      entry = this.table[keys[i]];
      str += `[Name: ${entry.nameTok.symbol}, Type: ${entry.typeTok.name},` +
              ` Scope: ${depth}, Line: ${entry.nameTok.line}]\n`;
    }

    function printChildren(node: SymbolTable, depth: number) {
      //Print the SymbolTable's children in order
      depth++;
      let children = <SymbolTable[]>node.children;
      for (let i = 0; i < children.length; i++) {
        let keys = Object.keys(children[i].table);
        let entry;
        for (let j = 0; j < keys.length; j++) {
          entry = children[i].table[keys[j]];
          str += `[Name: ${entry.nameTok.symbol}, Type: ${entry.typeTok.name}, Scope: `;
          str += (children.length > 1) ? depth + "-" + i : depth;
          str += `, Line: ${entry.nameTok.line}]\n`;
        }
      }

      //Print each child's children in order
      for (let i = 0; i < children.length; i++) {
        printChildren(children[i], depth);
      }
    }

    printChildren(this, depth);

    return str;
  }

  public length() {
    return Object.keys(this.table).length;
  }

  public isEmpty(): boolean {
    if (this.length() > 0) {return false;}
    if (!this.hasChildren()) {return true;}
    for (let sTable of <SymbolTable[]>this.children) {
      if (!sTable.isEmpty()) {
        return false;
      }
    }
    return true;
  }
}
