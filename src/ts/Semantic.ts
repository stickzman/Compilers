function analyze(token: Token, pgrmNum: number): TNode {
  let numWarns: number = 0;

  //Initial parsing of Program
  try {
    let root = new TNode("Program");
    let sRoot = new SymbolTable(); //Placholder root SymbolTable
    analyzeBlock(root, sRoot);

    //Remove the placeholder "Program" node and make the root the first block
    root = root.children[0];

    Log.breakLine();
    Log.print("AST for Program " + pgrmNum + ":", LogPri.VERBOSE);
    Log.print(root.toString(), LogPri.VERBOSE);

    Log.breakLine();
    Log.print(`Semantic Analyzer processed Program ${pgrmNum} ` +
              `with ${numWarns} warnings and 0 errors`);

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

  function analyzeBlock(parent: TNode, scope: SymbolTable) {
    let node = branchNode("BLOCK", parent);
    let sTable = new SymbolTable(scope);
    discard(["{"]);
    analyzeStatements(node, sTable);
    discard(["}"]);
  }

  function analyzeStatements(parent: TNode, scope: SymbolTable) {
    switch (token.name) {
      case "PRINT":
        analyzePrint(parent, scope);
        break;
      case "ID":
        analyzeAssign(parent, scope);
        break;
      case "INT":
        analyzeVarDecl(parent, scope);
        break;
      case "STRING":
        analyzeVarDecl(parent, scope);
        break;
      case "BOOLEAN":
        analyzeVarDecl(parent, scope);
        break;
      case "WHILE":
        analyzeWhileStatement(parent, scope);
        break;
      case "IF":
        analyzeIfStatement(parent, scope);
        break;
      case "LBRACE":
        analyzeBlock(parent, scope);
        break;
      case "RBRACE":
        //Empty StatementList
        return;
      default:
        //This should never be run
        throw error(`Invalid token ${token.name} found at ${token.line}:${token.col}`);
    }
    //Look at the next statement in (possibly empty) list
    analyzeStatements(parent, scope);
  }

  function analyzePrint(parent: TNode, scope: SymbolTable) {
    let node = branchNode("PRINT", parent);
    discard(["print","("]);
    analyzeExpr(node, scope);
    discard([")"]);
  }

  function analyzeExpr(parent: TNode, scope: SymbolTable) {
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
          analyzeExpr(node, scope);
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
        analyzeBoolExpr(parent, scope);
        break;
      case "BOOLVAL":
        analyzeBoolExpr(parent, scope);
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

  function analyzeBoolExpr(parent: TNode, scope: SymbolTable) {
    if (token.symbol === "(") {
      //BooleanExpr
      let node = branchNode("BOOL_EXPR", parent);
      discard(["("]);
      analyzeExpr(node, scope);
      node.addChild(new TNode(token.symbol, token)); //BoolOp (== or !=)
      token = token.next;
      analyzeExpr(node, scope);
      discard([")"]);
    } else {
      //BoolVal
      parent.addChild(new TNode(token.symbol, token));
      token = token.next;
    }
  }

  function analyzeAssign(parent: TNode, scope: SymbolTable) {
    let node = branchNode("ASSIGN", parent);
    //ID
    node.addChild(new TNode(token.symbol, token));
    token = token.next;
    discard(["="]);
    //VALUE
    analyzeExpr(node, scope);
  }

  function analyzeVarDecl(parent: TNode, scope: SymbolTable) {
    let node = branchNode("VAR_DECL", parent);
    //TYPE
    node.addChild(new TNode(token.symbol, token));
    let type = token;
    token = token.next;
    //ID
    node.addChild(new TNode(token.symbol, token));
    let name = token;
    token = token.next;
    scope.insert(name, type);
  }

  function analyzeWhileStatement(parent: TNode, scope: SymbolTable) {
    let node = branchNode("WHILE", parent);
    discard(["while"]);
    analyzeBoolExpr(node, scope);
    //Block to be run
    analyzeBlock(node, scope);
  }

  function analyzeIfStatement(parent: TNode, scope: SymbolTable) {
    let node = branchNode("IF", parent);
    discard(["if"]);
    //Conditional
    analyzeBoolExpr(node, scope);
    //Block to be run if conditional TRUE
    analyzeBlock(node, scope);
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
