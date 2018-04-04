function genCode(AST: TNode, sTree: SymbolTable) {
  let hexCode: string[] = [];
  //Add an empty placeholder root for sTree (workaround for parseBlock)
  let tempRoot = new SymbolTable();
  tempRoot.addChild(sTree);

  parseBlock(AST, tempRoot);

  //Add BRK to end of program for safety.
  hexCode.push("00");

  //Return completed machine code as string
  return hexCode.join(" ");

  function parseBlock(node: TNode, sTable: SymbolTable) {
    sTable = <SymbolTable>sTable.nextChild();
    for (let child of node.children) {
      switch (child.name) {
        case "BLOCK":
          parseBlock(child, sTable);
          break;
        case "PRINT":
          parsePrint(child, sTable);
          break;
        default:
          //Should not be called
      }
    }
  }

  function parsePrint(node: TNode, sTable: SymbolTable) {
    let child = <TNode>node.children[0];
    if (child.hasChildren()) {
      //Evaulate Expr
    } else {
      switch (child.token.name) {
        case "DIGIT":
          //Load digit into Y register, set X to 01 and call SYS to print
          hexCode.push("A0",`0${child.name}`,"A2","01","FF");
          break;
        case "ID":
          //Print variable value
          break;
        case "BOOLVAL":
          //Print true/false
          break;
        default:
          //Should not be called
      }
    }

  }
}
