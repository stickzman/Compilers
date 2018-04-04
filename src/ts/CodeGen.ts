function genCode(AST: TNode, sTree: SymbolTable) {

  function parseBlock(node: TNode, sTable: SymbolTable) {
    sTable = <SymbolTable>sTable.nextChild();
    for (let child of node.children) {
      switch (child.name) {
        case "BLOCK":
          parseBlock(child, sTable);
          break;
        default:
          //Should not be called
      }
    }
  }
}
