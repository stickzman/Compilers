function analyze(token: Token, pgrmNum: number): [TNode, SymbolTable] {
  let numWarns: number = 0;

  //Initial parsing of Program
  try {
    let root = new TNode("Program");
    let sRoot = new SymbolTable(); //Placholder root SymbolTable
    analyzeBlock(root, sRoot);

    //Remove the intial placeholder root nodes
    root = root.children[0];
    root.parent = null;
    sRoot = <SymbolTable>sRoot.children[0];
    sRoot.parent = null;

    checkUnusedVars(sRoot);

    Log.breakLine();
    Log.print("AST for Program " + pgrmNum + ":", LogPri.VERBOSE);
    Log.print(root.toString(), LogPri.VERBOSE);

    if (!sRoot.isEmpty()) {
      Log.breakLine();
      Log.print(`Program ${pgrmNum} Symbol Table`, LogPri.VERBOSE);
      Log.dottedLine(LogPri.VERBOSE);
      Log.print(sRoot.toString(), LogPri.VERBOSE);
    }

    Log.breakLine();
    Log.print(`Semantic Analyzer processed Program ${pgrmNum} ` +
              `with ${numWarns} warnings and 0 errors`);

    return [root, sRoot];
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

  function checkUnusedVars(sNode: SymbolTable) {
    let keys = Object.keys(sNode.table);
    for (let key of keys) {
      let entry = sNode.table[key];
      if (!entry.used) {
        numWarns++;
        if (entry.initialized) {
          Log.print(`Semantic_Warning: Variable '${entry.nameTok.symbol}' on `+
                    `line: ${entry.nameTok.line} was initialized but never used`,
                    LogPri.WARNING);
        } else {
          Log.print(`Semantic_Warning: Variable '${entry.nameTok.symbol}' was `+
                    `declared on line: ${entry.nameTok.line} but never used`,
                    LogPri.WARNING);
        }
      }
    }
    let children = <SymbolTable[]>sNode.children;
    for (let node of children) {
      checkUnusedVars(node);
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
        analyzeAddExpr(parent, scope);
        break;
      case "QUOTE":
        discard(['"']);
        let node = branchNode("CHARLIST", parent);
        node.addChild(new TNode(token.symbol, token)); //CHARLIST
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
        //SymbolTable lookup
        let symEntry = getSymEntry(token, scope);
        if (!symEntry.initialized) {
          numWarns++;
          Log.print(`Semantic_Warning: Utilizing unintialized variable `+
                    `'${token.symbol}' at line: ${token.line} col: ${token.col}`,
                    LogPri.WARNING);
        }
        symEntry.used = true;
        parent.addChild(new TNode(token.symbol, token));
        token = token.next;
        break;
      default:
        //This should never be called.
        throw error(`Cannot start Expression with [${token.name}] `+
                    `at ${token.line}:${token.col}`);
    }
  }

  function analyzeAddExpr(parent: TNode, scope: SymbolTable) {
    if (token.next.symbol === "+") {
      //ADD Operation
      let node = new TNode(token.next.name, token.next);
      parent.addChild(node);
      //1st DIGIT
      node.addChild(new TNode(token.symbol, token));
      //2nd DIGIT/rest of EXPR
      token = token.next.next;
      if (token.name === "ID") {
        //Type-Check
        let symEntry = getSymEntry(token, scope);
        let type = symEntry.typeTok.name;
        if (type !== "INT") {
          throw error(`Type Mismatch: Attempted to add [${type}] ` +
                      `to [DIGIT] at line: ${token.line} col: ${token.col}`);
        }
      } else if (token.name !== "DIGIT") {
        //Not a DIGIT or a integer variable
        throw error(`Type Mismatch: Attempted to add [${token.name}] ` +
                    `to [DIGIT] at line: ${token.line} col: ${token.col}`);
      }
      analyzeExpr(node, scope);
    } else {
      //Just a DIGIT
      parent.addChild(new TNode(token.symbol, token));
      token = token.next;
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
    //SymbolTable lookup
    let symEntry = getSymEntry(token, scope);
    //Type-checking
    let type = symEntry.typeTok.name;
    let value = token.next.next;
    switch (value.name) {
      case "DIGIT":
        //IntExpr
        if (type !== "INT") {
          throw typeError(symEntry, value, "INT");
        }
        break;
      case "QUOTE":
        //StringExpr
        if (type !== "STRING") {
          throw typeError(symEntry, value.next, "STRING");
        }
        break;
      case "BOOLVAL":
        //BooleanExpr
        if (type !== "BOOLEAN") {
          throw typeError(symEntry, value, "BOOLEAN");
        }
        break;
      case "LPAREN":
        //BooleanExpr
        if (type !== "BOOLEAN") {
          throw typeError(symEntry, value, "BOOLEAN", false);
        }
        break;
      case "ID":
        let valEntry = getSymEntry(value, scope);
        if (valEntry.typeTok.name !== type) {
          throw typeError(symEntry, value, valEntry.typeTok.name);
        }
        break;
    }
    //Initialize variable
    symEntry.initialized = true;
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
    if (scope.table[name.symbol] !== undefined) {
      throw error(`Attempted to redeclare variable '${name.symbol}' at `+
                  `line: ${name.line} col: ${name.col}`);
    }
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

  function getSymEntry(tok: Token, scope: SymbolTable) {
    let symEntry = scope.lookup(tok.symbol);
    if (symEntry === undefined) {
      //Cannot find ID in this/higher scope, therefore it is undeclared.
      throw error(`Undeclared variable '${tok.symbol}' `+
                  `found at line: ${tok.line} col: ${tok.col}`);
    }
    return symEntry;
  }

  //Create custom Error object
  function error(msg: string) {
    let e = new Error(msg);
    e.name = "Semantic_Error";
    return e;
  }

  function typeError(assignEntry, valToken: Token, valType: string, displayVal: boolean = true) {
    let msg = `Type Mismatch: attempted to assign [${valType}`;
    msg += (displayVal) ? `, ${valToken.symbol}] ` : "] ";
    msg += `to [${assignEntry.typeTok.name}, ${assignEntry.nameTok.symbol}] ` +
            `at line: ${assignEntry.nameTok.line} col: ${assignEntry.nameTok.col}`;
    return error(msg);
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
