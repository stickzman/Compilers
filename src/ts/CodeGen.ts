function genCode(AST: TNode, sTree: SymbolTable, memTable: MemoryTable): string[] {
  //Array of machine instructions in hexadecimal code
  let byteCode: string[] = [];

  //Add an empty placeholder root for sTree (workaround for parseBlock)
  let tempRoot = new SymbolTable();
  tempRoot.addChild(sTree);

  parseBlock(AST, tempRoot);

  return byteCode;

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
      if (child.name === "ADD"){
        let addr = parseAdd(child, sTable);
        //Load Y register with result of ADD stored in addr
        //Set X to 01, call SYS to print
        byteCode.push("AC",addr[0],addr[1],"A2","01","FF");
      }
    } else {
      switch (child.token.name) {
        case "DIGIT":
          //Load digit into Y register, set X to 01 and call SYS to print
          byteCode.push("A0",`0${child.name}`,"A2","01","FF");
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

  function parseAdd(node: TNode, sTable: SymbolTable): [string, string] {
    let firstDigit = node.children[0].name;
    if (node.children[1].name === "ADD") {
      //Perform addition first
      let addr = parseAdd(<TNode>node.children[1], sTable);
      //Load firstDigit to Acc, add contents of addr
      byteCode.push("A9",`0${firstDigit}`,"6D",addr[0],addr[1]);
      //Store result in memory (overwriting result of previous addition)
      byteCode.push("8D",addr[0],addr[1]);
      //Return address of result
      return addr;
    }
    if (/[a-z]/.test(node.children[1].name)) {
      //TODO: Handle variables in addition
      //Second child is a variable
      return null;
    }
    //Second child is a digit, add two digits
    let addr = memTable.newLoc(); //Allocate storage for result
    //Load firstDigit in Acc and store in memory
    byteCode.push("A9",`0${firstDigit}`,"8D",addr[0],addr[1]);
    //Load secondDigit in Acc and add firstDigit from memory
    byteCode.push("A9",`0${node.children[1].name}`,"6D",addr[0],addr[1]);
    //Store the result in memory
    byteCode.push("8D",addr[0],addr[1]);
    //Return address of result
    return addr;
  }
}
