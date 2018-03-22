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
    return null;
  }

  public toString(): string {
    let str = "Name\tType\tScope\tLine\n";
    let depth = 0;

    //Print this Symbol Table if its the root
    let keys = Object.keys(this.table);
    let entry;
    for (let i = 0; i < keys.length; i++) {
      entry = this.table[keys[i]];
      str += `${entry.nameTok.symbol}\t\t${entry.typeTok.name}\t\t` +
      `${depth}\t\t${entry.nameTok.line}\n`;
    }

    function printChildren(node: SymbolTable, depth: number) {
      //Print the SymbolTable's children in order
      depth++;
      str = "";
      let children = <SymbolTable[]>node.children;
      for (let i = 0; i < children.length; i++) {
        let keys = Object.keys(children[i].table);
        let entry;
        for (let j = 0; j < keys.length; j++) {
          entry = children[i].table[keys[j]];
          str += `${entry.nameTok.symbol}\t\t${entry.typeTok.name}\t\t` +
          `${depth}`;
          str += (children.length > 1) ? "-" + i : "";
          str += `\t\t${entry.nameTok.line}\n`;
        }
      }

      //Print each child's children in order
      for (let i = 0; i < children.length; i++) {
        str += printChildren(children[i], depth);
      }

      return str;
    }

    str += printChildren(this, depth);

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
