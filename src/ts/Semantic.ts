function analyze(token: Token, pgrmNum: number): TNode {
  let numWarns: number = 0;

  //Initial parsing of Program
  try {
    let root = new TNode("Program");
    analyzeBlock(root);

    return root;
  } catch (e) {
    if (e.name === "Parse_Error") {
      Log.print(e, LogPri.ERROR);
      Log.print("");
      Log.print(`Parsed Program ${pgrmNum} with ${numWarns} warnings and 1 errors.`);
      return null;
    } else {
      //If the error is not created by my parser, continue to throw it
      throw e;
    }
  }

  function analyzeBlock(parent: TNode) {
    let node = branchNode("Block", parent);
    discard(["{"]);
    analyzeStatements(node);
    discard(["}"]);
  }

  function analyzeStatements(parent: TNode) {
    let possibleTerminals = ["PRINT", "ID", "INT", "STRING", "BOOLEAN", "WHILE",
                             "IF", "LBRACE"];
    switch (token.name) {
      case "PRINT":
        analyzePrint(parent);
        break;
      case "ID":
        analyzeAssign(parent);
        break;
      case "INT":
        analyzeVarDecl(parent);
        break;
      case "STRING":
        analyzeVarDecl(parent);
        break;
      case "BOOLEAN":
        analyzeVarDecl(parent);
        break;
      case "WHILE":
        analyzeWhileStatement(parent);
        break;
      case "IF":
        analyzeIfStatement(parent);
        break;
      case "LBRACE":
        analyzeBlock(parent);
        break;
      default:
        //This should never be run
        throw error(`Invalid token ${token.name} found at ${token.line}:${token.col}`);
    }
  }

  //Create custom Error object
  function error(msg: string) {
    let e = new Error(msg);
    e.name = "Semantic_Error";
    return e;
  }

  function discard(tList: string[]) {
    for (let char of tList) {
      if (token.symbol === char) {
        //Discard the current token and move to the next
        token = token.next;
      } else {
        //This should not be called.
        throw error(`Expected '${char}' found '${token.symbol}'` +
          ` at line: ${token.line} col: ${token.col}.`);
      }
    }
  }
}
