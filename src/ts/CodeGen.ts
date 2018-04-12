function genCode(AST: TNode, sTree: SymbolTable, memManager: MemoryManager,
                  pgrmNum: number): string[] {
  //Array of machine instructions in hexadecimal code
  let byteCode: string[] = [];

  //Add an empty placeholder root for sTree (workaround for parseBlock)
  let tempRoot = new SymbolTable();
  tempRoot.addChild(sTree);

  resetSymTableInd(tempRoot);

  try{
    parseBlock(AST, tempRoot);

    Log.breakLine();
    if (byteCode.length === 0) {
      Log.print(`Program ${pgrmNum} has no machine code to generate.`, LogPri.INFO);
    } else {
      Log.print(`Program ${pgrmNum} compiled successfully with 0 errors.`, LogPri.INFO);
    }

    //Allow this program static memory to be overwrriten by future programs
    memManager.releaseAllStaticMem();


    return byteCode;
  } catch(e) {
    if (e.name === "Compilation_Error" || e.name === "Pgrm_Overflow") {
      Log.GenMsg(e, LogPri.ERROR);

      //Allow this program static memory to be overwrriten by future programs
      memManager.releaseAllStaticMem();

      return [];
    } else {
      throw e;
    }
  }

  function resetSymTableInd(sTable: SymbolTable) {
    sTable.resetSiblingIndex();
    for (let child of sTable.children) {
      resetSymTableInd(<SymbolTable>child);
    }
  }

  function parseBlock(node: TNode, sTable: SymbolTable) {
    if (!node.isRoot()) {
      Log.GenMsg("Descending Scope...");
    }
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
        case "IF":
          parseIfStatement(child, sTable);
          break;
        case "WHILE":
          parseWhileStatement(child, sTable);
          break;
        default:
          //Should not be called
      }
    }
    Log.GenMsg("Ascending Scope...");
  }

  function parseDecl(node: TNode, sTable: SymbolTable) {
    let addr = memManager.allocateStatic(false);
    Log.GenMsg(`Declaring ${node.children[0].name} '${node.children[1].name}' `
                + `at location [${addr}]`);
    sTable.setLocation(node.children[1].name, addr);
  }

  function parseAssign(node: TNode, sTable: SymbolTable) {
    Log.GenMsg(`Assigning value to variable '${node.children[0].name}'`);
    let varName = node.children[0].name;
    let varAddr = sTable.getLocation(varName);
    let assignNode = node.children[1];
    if (assignNode.name === "ADD") {
      //Perform addition, store result in varAddr
      let resAdd = parseAdd(assignNode, sTable);
      byteCode.push("AD",resAdd[0],resAdd[1],"8D",varAddr[0],varAddr[1]);
      memManager.allowOverwrite(resAdd);
      return;
    }
    if (assignNode.name === "CHARLIST") {
      //Load charlist into heap, store pointer in varAddr
      let pointer = parseCharList(assignNode);
      byteCode.push("A9",pointer,"8D",varAddr[0],varAddr[1]);
      return;
    }
    if (assignNode.name === "BOOL_EXPR") {
      //Evalulate the boolean expression, store result in addr
      let addr = evalStoreBool(assignNode, sTable);
      //Load bool result into Acc from memory, store in varAddr
      byteCode.push("AD",addr[0],addr[1],"8D",varAddr[0],varAddr[1]);
      memManager.allowOverwrite(addr);
      return;
    }
    if (/^[a-z]$/.test(assignNode.name)) {
      //Assigning to a variable. Look up variable value and store in varAddr
      let valAddr = sTable.getLocation(assignNode.name);
      byteCode.push("AD",valAddr[0],valAddr[1],"8D",varAddr[0],varAddr[1]);
      return;
    }
    if (/[0-9]/.test(assignNode.name)) {
      //Store single digit in varAddr
      byteCode.push("A9","0"+assignNode.name,"8D",varAddr[0],varAddr[1]);
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

  function parseIfStatement(node: BaseNode, sTable: SymbolTable) {
    Log.GenMsg("Parsing If Statement...");
    let condNode = node.children[0];
    let block = node.children[1];
    let preBlock_PostBlock: string;
    let preBlockPos: number;
    if (condNode.name === "false") {
      //Simply return because the block will never be run
      return;
    } else if (condNode.name === "BOOL_EXPR") {
      //Evaluate the boolExpr, so the Z flag contains the answer
      let isEqualOp = evalBoolExpr(condNode, sTable);
      if (isEqualOp) {
        //If not equal, branch to end of block
        preBlock_PostBlock = memManager.newJumpPoint();
        byteCode.push("D0",preBlock_PostBlock);
        preBlockPos = byteCode.length;
      } else {
        //If the operator is !=, BNE to beginning of If Block
        byteCode.push("D0","07");
        //Add unconditional branch to end of If Block
        preBlock_PostBlock = memManager.newJumpPoint();
        addUnconditionalBranch(preBlock_PostBlock);
        preBlockPos = byteCode.length;
      }
    }
    parseBlock(block, sTable);
    if (condNode.name === "BOOL_EXPR") {
      memManager.setJumpPoint(preBlock_PostBlock, preBlockPos, byteCode.length);
    }
  }

  function parseWhileStatement(node: BaseNode, sTable: SymbolTable) {
    Log.GenMsg("Parsing While Statement...");
    let condNode = node.children[0];
    let block = node.children[1];
    let preBlock_PostBlock: string;
    let preEvalPos: number;
    let preBlockPos: number;
    if (condNode.name === "false") {
      //Simply return because the block will never be run
      return;
    } else if (condNode.name === "BOOL_EXPR") {
      preEvalPos = byteCode.length;
      //Evaluate the boolExpr, so the Z flag contains the answer
      let isEqualOp = evalBoolExpr(condNode, sTable);
      if (isEqualOp) {
        //Conditional is ==
        preBlock_PostBlock = memManager.newJumpPoint();
        //If BNE, jump to end of block
        byteCode.push("D0",preBlock_PostBlock);
        preBlockPos = byteCode.length;
      } else {
        //Conditional is !=
        //If BNE, jump to start of block
        byteCode.push("D0","07");
        //Otherwise, unconditionally branch to end of While Block
        preBlock_PostBlock = memManager.newJumpPoint();
        addUnconditionalBranch(preBlock_PostBlock);
        preBlockPos = byteCode.length;
      }
    } else if (condNode.name === "true") {
      //Unconditional branch back here infinitely
      preEvalPos = byteCode.length;
    }
    //Add Block to hexCode
    parseBlock(block, sTable);
    //Unconditionally branch to beginning of conditional
    let postBlock_preEval = memManager.newJumpPoint();
    addUnconditionalBranch(postBlock_preEval);
    memManager.setJumpPoint(postBlock_preEval, byteCode.length, preEvalPos);
    if (condNode.name === "BOOL_EXPR") {
      memManager.setJumpPoint(preBlock_PostBlock, preBlockPos, byteCode.length);
    }
  }

  //evalulate BoolVal, Z flag will be set in byteCode after running
  function evalBoolVal(val: string) {
    Log.GenMsg(`Evaluating single boolVal '${val}'...`);
    let addr = memManager.getFalseVal();
    if (val === "true") {
      //Store "00" in X and compare with defualt "00" in memory
      byteCode.push("A2","00","EC",addr[0],addr[1]);
    }
    if (val === "false") {
      //Store "01" in X and compare with defualt "00" in memory
      byteCode.push("A2","01","EC",addr[0],addr[1]);
    }
  }

  //evalulate Bool_Expr, Z flag will be set in byteCode after running
  //Nested Bool_Expr not currently supported
  function evalBoolExpr(node: TNode, sTable: SymbolTable): boolean {
    Log.GenMsg("Evaulating Bool_Expr...");
    let expr1 = node.children[0];
    let boolOp = node.children[1];
    let expr2 = node.children[2];
    let addr = null;
    let addr2 = null;
    if (expr1.name === "BOOL_EXPR") {
      addr = evalStoreBool(expr1, sTable);
    }
    if (expr2.name === "BOOL_EXPR") {
      addr2 = evalStoreBool(expr2, sTable);
    }
    //Check there are no strings in expression
    //TODO: Implement string comparison
    //----------------------------------
    if (expr1.name === "CHARLIST" || expr2.name === "CHARLIST") {
      throw error("String comparison not currently supported.");
    }
    if (/^[a-z]$/.test(expr1.name)) {
      let type = sTable.getType(expr1.name);
      if (type === "STRING") {
        throw error("String comparison not currently supported.");
      }
    }
    if (/^[a-z]$/.test(expr2.name)) {
      let type = sTable.getType(expr2.name);
      if (type === "STRING") {
        throw error("String comparison not currently supported.");
      }
    }
    //-----------------------------------
    //Continue with expression evaluation
    if (addr === null && addr2 === null) {
      //No nested boolExpr, carry on as usual
      if (/^[0-9]$/.test(expr1.name) || expr1.name === "true") {
        loadX(expr1, sTable);
        addr = getSetMem(expr2, sTable);
      } else {
        addr = getSetMem(expr1, sTable);
        loadX(expr2, sTable);
      }
    } else {
      if (addr === null) {
        //Expr1 is not a boolExpr, load its value into X
        loadX(expr1, sTable);
        if (addr2 === null) {
          addr = getSetMem(expr2, sTable);
        } else {
          addr = addr2;
        }
      } else {
        if (addr2 === null) {
          //Expr1 is a BoolExpr, but not Expr2
          loadX(expr2, sTable);
        } else {
          //Both Exprs are BoolExprs
          //Load result of second BoolExpr into X from memory
          byteCode.push("AE",addr2[0],addr2[1]);
        }
        //Allow result of sub-boolean expressions to be overwrriten
        memManager.allowOverwrite(addr);
      }
      //Allow result of sub-boolean expressions to be overwrriten
      memManager.allowOverwrite(addr2);
    }
    //Compare X and memory location, setting Z with answer
    byteCode.push("EC",addr[0],addr[1]);
    //Return if the boolOperation was "equals" (otherwise "not equals")
    return boolOp.name === "==";
  }

  //Evaluate the boolean expression, then store the result in memory
  //and return the address
  function evalStoreBool(node: TNode, sTable: SymbolTable): string[] {
    let val1: string;
    let val2: string;
    if (evalBoolExpr(node, sTable)) {
      val1 = "01";
      val2 = "00";
    } else {
      val1 = "00";
      val2 = "01";
    }
    Log.GenMsg("Storing boolean expression result...");
    let addr = memManager.allocateStatic();
    //If not equal, jump to writing val2 into memory, otherwise right val1
    byteCode.push("D0","0C","A9",val1,"8D",addr[0],addr[1]);
    //Add unconditional branch to skip writing val2 into memory
    addUnconditionalBranch("05");
    //Write val2 into memory
    byteCode.push("A9",val2,"8D",addr[0],addr[1]);
    return addr;
  }

  function addUnconditionalBranch(jumpAmt: string) {
    //Set X to "01", compare with "false" value (00) in memory, compare, then BNE
    let addr = memManager.getFalseVal();
    byteCode.push("A2","01","EC",addr[0],addr[1],"D0",jumpAmt);
  }

  //Load the X register with the digit/boolean value in expr1 Node
  function loadX(node: BaseNode, sTable: SymbolTable) {
    if (/^[0-9]$/.test(node.name)) {
      //Load single digit into X
      byteCode.push("A2","0"+node.name);
    } else if (node.name === "ADD") {
      let addr = parseAdd(node, sTable);
      //Load result into X
      byteCode.push("AE",addr[0],addr[1]);
      memManager.allowOverwrite(addr);
    } else if (node.name === "true") {
      //Load true (01) into X
      byteCode.push("A2","01");
    } else if (node.name === "false") {
      //Load false (00) into X
      byteCode.push("A2","00");
    } else if (/^[a-z]$/.test(node.name)) {
      //Load value of variable into X
      let addr = sTable.getLocation(node.name);
      byteCode.push("AE",addr[0],addr[1]);
    }
  }

  //Store value in memory if not already there, then return location address
  function getSetMem(node: BaseNode, sTable: SymbolTable): string[] {
    if (/^[0-9]$/.test(node.name)) {
      //Load single digit into Acc, then store
      let addr = memManager.allocateStatic();
      byteCode.push("A9","0"+node.name,"8D",addr[0],addr[1]);
      return addr;
    } else if (node.name === "ADD") {
      //Calculate addition, return the location of result
      return parseAdd(node, sTable);
    } else if (node.name === "true") {
      //Load true (01) into Acc, then store
      let addr = memManager.allocateStatic();
      byteCode.push("A9","01","8D",addr[0],addr[1]);
      return addr;
    } else if (node.name === "false") {
      //Location of default "00" (false)
      return memManager.getFalseVal();
    } else if (/^[a-z]$/.test(node.name)) {
      //Return location of variable value
      return sTable.getLocation(node.name);
    }
  }

  function parseCharList(node: TNode): string {
    let str = node.children[0].name;
    Log.GenMsg(`Allocating memory in Heap for string "${str}"...`);
    let hexData = "";
    //Convert string into series of hexCodes
    for (let i = 0; i < str.length; i++) {
      hexData += str.charCodeAt(i).toString(16) + " ";
    }
    //Add NULL string terminator
    hexData += "00";
    //Allocate heap space and return placeholder addr
    return memManager.allocateHeap(hexData);
  }

  //Assuming Z is set with result of evaulation, prints "true"/"false"
  //isEqual denotes whether the boolOp was == or not
  function printEvalResult(isEqual: boolean = true) {
    let truAddr = memManager.getTrueString();
    let falseAddr = memManager.getFalseString();
    byteCode.push("D0","0D","A2","02","AC");
    if (isEqual) {
      byteCode.push(truAddr[0],truAddr[1]);
    } else {
      byteCode.push(falseAddr[0],falseAddr[1]);
    }
    byteCode.push("FF");
    //Jump to rest of program
    addUnconditionalBranch("06");
    byteCode.push("A2","02","AC");
    if (isEqual) {
      byteCode.push(falseAddr[0],falseAddr[1]);
    } else {
      byteCode.push(truAddr[0],truAddr[1]);
    }
    byteCode.push("FF");
  }

  function parsePrint(node: TNode, sTable: SymbolTable) {
    Log.GenMsg("Parsing Print Statement...");
    let child = <TNode>node.children[0];
    if (child.hasChildren()) {
      //Evalulate Expr
      if (child.name === "ADD"){
        let addr = parseAdd(child, sTable);
        //Load Y register with result of ADD stored in addr
        //Set X to 01, call SYS to print
        byteCode.push("AC",addr[0],addr[1],"A2","01","FF");
        memManager.allowOverwrite(addr);
      } else if (child.name === "CHARLIST") {
          //Print CharList
          let addr = parseCharList(child);
          //Load addr into Y register, set X to 02 and call SYS to print
          byteCode.push("A0",addr,"A2","02","FF");
      } else if (child.name === "BOOL_EXPR") {
        //Evaulate BoolExpr
        let isEqual = evalBoolExpr(child, sTable);
        //Print result
        printEvalResult(isEqual);
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
            {
              //Evaulate Boolean, print result
              //Compare val of variable with "true"
              byteCode.push("A2","01","EC",addr[0],addr[1]);
              printEvalResult(true);
              break;
            }
          }
          break;
        case "BOOLVAL":
          //Print true/false
          if (child.token.symbol === "true") {
            let addr = memManager.getTrueString();
            byteCode.push("AC",addr[0],addr[1],"A2","02","FF");
          } else {
            let addr = memManager.getFalseString();
            byteCode.push("AC",addr[0],addr[1],"A2","02","FF");
          }
          break;
        default:
          //Should not be called
      }
    }
  }

  function parseAdd(node: TNode, sTable: SymbolTable): string[] {
    Log.GenMsg("Parsing Add subtree...");
    let results = optimizeAdd(0, node);
    if (results[0] > 255) {
      throw error("Integer Overflow: result of calculation exceeds maximum " +
                  "storage for integer (1 byte)");
    }
    if (/^[a-z]$/.test(results[1])) {
      //The last element is an ID
      let varLoc = sTable.getLocation(results[1]);
      let resLoc = memManager.allocateStatic();
      //Load accumulated num into Acc, then add value stored in the variable
      byteCode.push("A9",results[0].toString(16).padStart(2, "0"),"6D",varLoc[0],varLoc[1]);
      //Store the result in memory, return the location
      byteCode.push("8D",resLoc[0],resLoc[1]);
      return resLoc;
    } else {
      //The last element is a digit wrapped in a string
      let num: number = results[0] + parseInt(results[1]);
      if (num > 255) {
        throw error("Integer Overflow: result of calculation exceeds maximum " +
                    "storage for integer (1 byte)");
      }
      let addr = memManager.allocateStatic();
      //Load the result into Acc, store in memory, return the location
      byteCode.push("A9",num.toString(16).padStart(2, "0"),"8D",addr[0],addr[1]);
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
