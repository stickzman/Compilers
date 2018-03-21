function analyze(token: Token, pgrmNum: number): TNode {
  let numWarns: number = 0;

  //Initial parsing of Program
  try {
    let root = new TNode("Program");
    analyzeBlock(root);

    //Remove the placeholder "Program" node and make the root the first block
    root = root.children[0];

    Log.breakLine();
    Log.print(root.toString());

    return root;
  } catch (e) {
    if (e.name === "Semantic_Error") {
      Log.print(e, LogPri.ERROR);
      Log.print("");
      Log.print(`Analyzed Program ${pgrmNum} with ${numWarns} warnings and 1 errors.`);
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
        /*
      case "WHILE":
        analyzeWhileStatement(parent);
        break;
      case "IF":
        analyzeIfStatement(parent);
        break;
        */
      case "LBRACE":
        analyzeBlock(parent);
        break;
      case "RBRACE":
        //Empty StatementList
        return;
      default:
        //This should never be run
        throw error(`Invalid token ${token.name} found at ${token.line}:${token.col}`);
    }
    analyzeStatements(parent);
  }

  function analyzePrint(parent: TNode) {
    let node = branchNode("Print", parent);
    discard(["print","("]);
    analyzeExpr(node);
    discard([")"]);
  }

  function analyzeExpr(parent: TNode) {
    switch (token.name) {
      case "DIGIT":
        if (token.next.symbol === "+") {
          //ADD Operation
          let node = new TNode(token.next.name, token.next);
          parent.addChild(node);
          //1st DIGIT
          node.addChild(new TNode(token.symbol, token));
          //2nd DIGIT/rest of EXPR
          token = token.next.next;
          analyzeExpr(node);
        } else {
          //Just a DIGIT
          parent.addChild(new TNode(token.symbol, token));
          token = token.next;
        }
        break;
      case "QUOTE":
        discard(['"']);
        parent.addChild(new TNode(token.symbol, token)); //CHARLIST
        token = token.next;
        discard(['"']);
        break;
      case "LPAREN":
        //BooleanExpr
        let node = branchNode("BooleanExpr", parent);
        discard(["("]);
        analyzeExpr(node);
        //BoolOp (== or !=)
        parent.addChild(new TNode(token.symbol, token));
        token = token.next;
        analyzeExpr(node);
        discard([")"]);
        break;
      case "BOOLEAN":
        //BoolVal
        parent.addChild(new TNode(token.symbol, token));
        token = token.next;
        break;
      case "ID":
        parent.addChild(new TNode(token.symbol, token));
        token = token.next;
        break;
      default:
        //This should never be called.
        throw error(`Cannot start Expression with [${token.name}] `+
                    `at ${token.line}:${token.col}`);
    }
  }

  function analyzeAssign(parent: TNode) {
    let node = branchNode("Assign", parent);
    //ID
    node.addChild(new TNode(token.symbol, token));
    token = token.next;
    discard(["="]);
    //VALUE
    analyzeExpr(node);
  }

  function analyzeVarDecl(parent: TNode) {
    let node = branchNode("VarDecl", parent);
    //TYPE
    node.addChild(new TNode(token.symbol, token));
    token = token.next;
    //ID
    node.addChild(new TNode(token.symbol, token));
    token = token.next;
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
