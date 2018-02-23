class SymbolEntry {
  constructor(public name?: string, public type?: string) { }

  public toString(): string {
    return `[name: ${this.name}, type: ${this.type}]`;
  }
}
