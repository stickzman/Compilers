class SymbolTable {

  private table: HashTable = {};

  constructor() { }

  public insert(nameTok: Token, typeTok: Token) {
    this.table[nameTok.value] = {name:nameTok, type:typeTok,
                                  initialized:false, used:false};
  }

  public lookup(name: string) {
    return this.table[name];
  }

  public toString(): string {
    let str = "";
    let keys = Object.keys(this.table);
    let name: string = "";
    let type: string = "";
    for (let i = 0; i < keys.length; i++) {
      name = this.lookup(keys[i]).name.value;
      type = this.lookup(keys[i]).type;
      str += `[name: ${name}, type: ${type}]\n`;
    }
    return str;
  }

  public length() {
    return Object.keys(this.table).length;
  }
}
