function genCode(AST: TNode, sTree: SymbolTable, memTable: MemoryTable): string[] {
  //Array of machine instructions in hexadecimal code
  let byteCode: string[] = [];

  //Add an empty placeholder root for sTree (workaround for parseBlock)
  let tempRoot = new SymbolTable();
  tempRoot.addChild(sTree);

  try{
    parseBlock(AST, tempRoot);
    return byteCode;
  } catch(e) {
    if (e.name === "Compilation_Error" || e.name === "Pgrm_Overflow") {
      Log.print(e, LogPri.ERROR);
      return [];
    } else {
      throw e;
    }
  }


  function parseBlock(node: TNode, sTable: SymbolTable) {
    sTable = <SymbolTable>sTable.nextChild();
    for (let child of node.children) {
      switch (child.name) {
        case "BLOCK":
          parseBlock(child, sTable);
          break;
        case "VAR_DECL":
          parseDecl(child, sTable);
          break;
        case "ASSIGN":
          parseAssign(child, sTable);
          break;
        case "PRINT":
          parsePrint(child, sTable);
          break;
        default:
          //Should not be called
      }
    }
  }

  function parseDecl(node: TNode, sTable: SymbolTable) {
    let addr = memTable.allocateStatic();
    sTable.setLocation(node.children[1].name, addr);
  }

  function parseAssign(node: TNode, sTable: SymbolTable) {
    let varName = node.children[0].name;
    let varAddr = sTable.getLocation(varName);
    let assignNode = node.children[1];
    if (assignNode.name === "ADD") {
      //Perform addition, store result in varAddr
      let resAdd = parseAdd(assignNode, sTable);
      byteCode.push("AD",resAdd[0],resAdd[1],"8D",varAddr[0],varAddr[1]);
      return;
    }
    if (assignNode.name === "CHARLIST") {
      //Load charlist into heap, store pointer in varAddr
      let pointer = parseCharList(assignNode);
      byteCode.push("A9",pointer,"8D",varAddr[0],varAddr[1]);
      return;
    }
    if (assignNode.name === "BOOL_EXPR") {
      //Evaulate the boolean expression, store result in varAddr
      return;
    }
    if (/$[a-z]^/.test(assignNode.name)) {
      //Assigning to a variable. Look up variable value and store in varAddr
      let valAddr = sTable.getLocation(assignNode.name);
      byteCode.push("AD",valAddr[0],valAddr[1],"8D",varAddr[0],varAddr[1]);
      return;
    }
    if (/[0-9]/.test(assignNode.name)) {
      //Store single digit in varAddr
      byteCode.push("A9",assignNode.name.padStart(2,"0"),"8D",varAddr[0],varAddr[1]);
      return;
    }
    if (assignNode.name === "true") {
      //Save 01 for 'true' in varAddr
      byteCode.push("A9","01","8D",varAddr[0],varAddr[1]);
      return;
    }
    //Save 00 for 'false' in varAddr
    byteCode.push("A9","00","8D",varAddr[0],varAddr[1]);
  }

  function parseExpr(node: TNode, sTable: SymbolTable) {
    let child = node.children[0];
    if (child.name === "ADD") {
      return parseAdd(child, sTable);
    }
    if (child.name === "CHARLIST") {
      return parseCharList(child);
    }
    if (/$[a-z]^/.test(child.name)) {
      //It's an ID
      return sTable.getLocation(child.name);
    }
    return null;
  }

  function parseCharList(node: TNode): string {
    let str = node.children[0].name;
    let hexData = "";
    //Convert string into series of hexCodes
    for (let i = 0; i < str.length; i++) {
      hexData += str.charCodeAt(i).toString(16) + " ";
    }
    //Add NULL string terminator
    hexData += "00";
    //Allocate heap space and return placeholder addr
    return memTable.allocateHeap(hexData);
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
      } else if (child.name === "CHARLIST") {
          //Print CharList
          let addr = parseCharList(child);
          //Load addr into Y register, set X to 02 and call SYS to print
          byteCode.push("A0",addr,"A2","02","FF");
      }
    } else {
      switch (child.token.name) {
        case "DIGIT":
          //Load digit into Y register, set X to 01 and call SYS to print
          byteCode.push("A0",`0${child.name}`,"A2","01","FF");
          break;
        case "ID":
          //Print variable value
          let addr = sTable.getLocation(child.name);
          switch (sTable.getType(child.name)) {
            case "STRING":
              //Load addr into Y register, set X to 02 and call SYS to print
              byteCode.push("AC",addr[0],addr[1],"A2","02","FF");
              break;
            case "INT":
              //Load digit into Y register, set X to 01 and call SYS to print
              byteCode.push("AC",addr[0],addr[1],"A2","01","FF");
              break;
            case "BOOLEAN":
              //Load bool into Y register, set X to 01 and call SYS to print
              byteCode.push("AC",addr[0],addr[1],"A2","01","FF");
              break;
          }
          break;
        case "BOOLVAL":
          //Print true/false
          if (child.token.symbol === "true") {
            byteCode.push("A0","01","A2","01","FF");
          } else {
            byteCode.push("A0","00","A2","01","FF");
          }
          break;
        default:
          //Should not be called
      }
    }
  }

  function parseAdd(node: TNode, sTable: SymbolTable): string[] {
    let results = optimizeAdd(0, node);
    if (results[0] > 255) {
      throw error("Integer Overflow: result of calculation exceeds maximum " +
                  "storage for integer (1 byte)");
    }
    if (/$[a-z]^/.test(results[1])) {
      //The last element is an ID
      let varLoc = sTable.getLocation(results[1]);
      let resLoc = memTable.allocateStatic();
      //Load accumulated num into Acc, then add value stored in the variable
      byteCode.push("A9",results[0].toString(16),"6D",varLoc[0],varLoc[1]);
      //Store the result in memory, return the location
      byteCode.push("8D",resLoc[0],resLoc[1]);
      return resLoc;
    } else {
      //The last element is a digit wrapped in a string
      let num = results[0] + parseInt(results[1]);
      if (num > 255) {
        throw error("Integer Overflow: result of calculation exceeds maximum " +
                    "storage for integer (1 byte)");
      }
      let addr = memTable.allocateStatic();
      //Load the result into Acc, store in memory, return the location
      byteCode.push("A9",num.toString(16),"8D",addr[0],addr[1]);
      return addr;
    }

    //Recursive helper func traverses ADD subtrees, returns rightmost child and
    //the summation of all other children
    function optimizeAdd(acc: number, addNode: TNode): [number, string] {
      let num = parseInt(addNode.children[0].name);
      if (addNode.children[1].name === "ADD") {
        return optimizeAdd(acc + num, addNode.children[1]);
      } else {
        return [acc + num, addNode.children[1].name];
      }
    }
  }

  function error(msg: string) {
    let e = new Error(msg);
    e.name = "Compilation_Error";
    return e;
  }
}
