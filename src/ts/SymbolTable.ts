class SymbolTable {

  private table: HashTable = {};

  constructor() { }

  public insert(nameTok: Token, typeTok: Token) {
    this.table[nameTok.value] = {name.nameTok, type.typeTok};
  }

  public lookup(name: string) {
    return this.table[name];
  }

  public toString(): string {
    let str = "";
    let keys = Object.keys(this.table);
    for (let i = 0; i < keys.length; i++) {
      str += `[name: ${this.table[keys[i]].name}, type: ${this.table[keys[i]].type}]`;
    }
    return str;
  }

  public isEmpty() {
    return Object.keys(this.table).length <= 0;
  }
}
