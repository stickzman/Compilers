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

    Log.breakLine();
    Log.SemMsg("Checking for unused variables...");
    checkUnusedVars(sRoot);

    Log.breakLine();
    Log.SemMsg("Type checking bool expressions...");
    checkBoolExprs(root, sRoot);

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
    Log.print(`Analyzed Program ${pgrmNum} ` +
              `with ${numWarns} warnings and 0 errors`);

    return [root, sRoot];
  } catch (e) {
    if (e.name === "Semantic_Error") {
      Log.print(e, LogPri.ERROR);
      Log.print("");
      Log.print(`Analyzed Program ${pgrmNum} with ${numWarns} warnings and 1 errors.`);
      return null;
    } else {
      //If the error is not created by my analyzer, continue to throw it
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
          Log.SemMsg(`Variable '${entry.name}' on `+
                    `line: ${entry.nameTok.line} was initialized but never used`,
                    LogPri.WARNING);
        } else {
          Log.SemMsg(`Variable '${entry.name}' was `+
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

  function checkBoolExprs(node: TNode, sTable: SymbolTable) {
    for(let child of node.children) {
      if (child.name === "BOOL_EXPR") {
        let expr1 = child.children[0];
        let expr2 = child.children[2];
        if (getBoolType(expr1, sTable) === getBoolType(expr2, sTable)) {
          //Types match
          continue;
        }
        //Types do not match
        let tok = (<TNode>child.children[1]).token;
        throw boolTypeError(tok);
      } else if (child.name === "BLOCK") {
        checkBoolExprs(child, <SymbolTable>sTable.nextChild());
      } else if (child.hasChildren) {
        checkBoolExprs(child, sTable);
      }
    }
    return;

  }

  function getBoolType(node: BaseNode, sTable: SymbolTable): string {

    switch (node.name) {
      case "true":
        return "BOOLEAN";
      case "false":
        return "BOOLEAN";
      case "BOOL_EXPR":
        return "BOOLEAN";
      case "ADD":
        return "INT";
      case "CHARLIST":
        return "STRING";
      case "ID":
        return sTable.getType(node.children[0].name);
      case "ARRAY":
        let line: number;
        let col: number;
        if (node.children[0].name === "LEN") {
          line = (<TNode>node.children[0].children[0]).token.line;
          col = (<TNode>node.children[0].children[0]).token.col;
        } else {
          line = (<TNode>node.children[0]).token.line;
          col = (<TNode>node.children[0]).token.col;
        }
        throw error(`Cannot compare whole Arrays within BoolExpr on line: ` +
                    `${line} col: ${col}`);
    }
    if (/^[0-9]$/.test(node.name)) {
      //Single digit
      return "INT";
    }
  }

  function analyzeBlock(parent: TNode, scope: SymbolTable) {
    Log.SemMsg("Adding new Block to AST...")
    let node = branchNode("BLOCK", parent);
    Log.SemMsg("Creating new scope in SymbolTable...")
    let sTable = new SymbolTable(scope);
    discard(["{"]);
    analyzeStatements(node, sTable);
    discard(["}"]);
  }

  function analyzeStatements(parent: TNode, scope: SymbolTable) {
    Log.SemMsg("Analyzing Statement...");
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
    Log.SemMsg("Adding Print Statement to AST...");
    let node = branchNode("PRINT", parent);
    discard(["print","("]);
    analyzeExpr(node, scope);
    discard([")"]);
  }

  function analyzeExpr(parent: TNode, scope: SymbolTable) {
    switch (token.name) {
      case "LBRACK":
        analyzeArrayExpr(parent, scope);
        break;
      case "DIGIT":
        analyzeAddExpr(parent, scope);
        break;
      case "QUOTE":
        analyzeCharList(parent, scope);
        break;
      case "LPAREN":
        analyzeBoolExpr(parent, scope);
        break;
      case "BOOLVAL":
        analyzeBoolExpr(parent, scope);
        break;
      case "ID":
        analyzeIdExpr(parent, scope);
        break;
      default:
        //This should never be called.
        throw error(`Cannot start Expression with [${token.name}] `+
                    `at ${token.line}:${token.col}`);
    }
  }

  function analyzeCharList(parent: TNode, scope: SymbolTable) {
    Log.SemMsg("Adding CharList to AST...");
    discard(['"']);
    let node = branchNode("CHARLIST", parent);
    node.addChild(new TNode(token.symbol, token)); //CHARLIST
    token = token.next;
    discard(['"']);
  }

  function analyzeIdExpr(parent: TNode, scope: SymbolTable) {
    Log.SemMsg(`Scope-checking variable '${token.symbol}'...`);
    //SymbolTable lookup
    let symEntry = getSymEntry(token, scope);
    if (!symEntry.initialized) {
      numWarns++;
      Log.breakLine();
      Log.SemMsg(`Utilizing unintialized variable `+
                `'${token.symbol}' at line: ${token.line} col: ${token.col}`,
                LogPri.WARNING);
      Log.breakLine();
    }
    symEntry.used = true;
    Log.SemMsg(`Adding ${symEntry.typeTok.name} '${token.symbol}' to AST...`);
    let idNode = branchNode("ID", parent);
    idNode.addChild(new TNode(token.symbol, token));
    token = token.next;
    if (token.symbol === "[") {
      discard(["["]);
      if (!symEntry.isArray()) {
        throw error(`Variable '${symEntry.name}' cannot be used as an ` +
                    `array at line: ${token.line} col: ${token.col}`);
      }
      if (parseInt(token.symbol) > symEntry.arrLen - 1) {
        throw error(`Index out of bounds for array '${symEntry.name}' at ` +
                    `line: ${token.line} col: ${token.col}`);
      }
      idNode.addChild(new TNode(token.symbol, token));
      token = token.next;
      discard(["]"]);
    } else if (symEntry.isArray()) {
      throw error(`Cannot use entire ARRAY '${symEntry.name}' `+
                  `within Expression on line: ${token.line} col: ${token.col}.`);
    }
  }

  function analyzeArrayExpr(parent: TNode, scope: SymbolTable): string {
    Log.SemMsg("Adding Array Expr to AST...");
    let node = branchNode("ARRAY", parent);
    discard(["["]);
    let type = analyzeExprList(node, scope);
    discard(["]"]);
    return type;
  }

  function analyzeExprList(parent: TNode, scope: SymbolTable): string {
    Log.SemMsg("Adding ExprList to AST...");
    let type = getValType(token, scope);
    addToExprList();
    return type;

    function addToExprList() {
      if (token.symbol === "]") {
        return;
      }
      if (getValType(token, scope) !== type) {
        throw error(`Mixed array type found at line: ${token.line} col: ${token.col}. ` +
                    "All array elements must be of the same type.");
      }
      analyzeExpr(parent, scope);
      if (token.name === "COMMA") {
        discard([","]);
      }
      addToExprList();
    }
  }

  function analyzeAddExpr(parent: TNode, scope: SymbolTable) {
    if (token.next.symbol === "+") {
      Log.SemMsg("Adding Addition Expr to AST...");
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
        Log.SemMsg(`Type-checking ${symEntry.typeTok.name} '${symEntry.name}...'`);
        let type = symEntry.typeTok.name;
        if (type !== "INT") {
          throw error(`Type Mismatch: Attempted to add [${type}] ` +
                      `to [DIGIT] at line: ${token.line} col: ${token.col}`);
        } else if (symEntry.isArray() && token.next.symbol !== "[") {
          throw error(`Cannot add ARRAY '${token.symbol}' to Add Expr ` +
                      `at line: ${token.line} col: ${token.col}`);
        }
      } else if (token.name !== "DIGIT") {
        //Not a DIGIT or an integer variable
        throw error(`Type Mismatch: Attempted to add [${token.name}] ` +
                    `to [DIGIT] at line: ${token.line} col: ${token.col}`);
      }
      analyzeExpr(node, scope);

    } else {
      Log.SemMsg("Adding Digit to AST...");
      //Just a DIGIT
      parent.addChild(new TNode(token.symbol, token));
      token = token.next;
    }
  }

  function analyzeBoolExpr(parent: TNode, scope: SymbolTable) {
    if (token.symbol === "(") {
      Log.SemMsg("Adding BoolExpr to AST...");
      //BooleanExpr
      let node = branchNode("BOOL_EXPR", parent);
      discard(["("]);
      analyzeExpr(node, scope);
      node.addChild(new TNode(token.symbol, token)); //BoolOp (== or !=)
      token = token.next;
      analyzeExpr(node, scope);
      discard([")"]);
    } else {
      Log.SemMsg("Adding BoolVal to AST...");
      //BoolVal
      parent.addChild(new TNode(token.symbol, token));
      token = token.next;
    }
  }

  function analyzeAssign(parent: TNode, scope: SymbolTable) {
    Log.SemMsg("Adding Variable Assignment to AST...");
    let node = branchNode("ASSIGN", parent);
    //SymbolTable lookup
    Log.SemMsg(`Scope-checking variable '${token.symbol}'...`);
    let entry = getSymEntry(token, scope);
    //Check if array
    if (entry.isArray() && token.next.symbol !== "[") {
      //We are assigning an entire array
      analyzeArrayAssign(node, scope);
      return;
    }
    let type = entry.typeTok.name;
    //ID Name
    let idNode = new TNode(token.symbol, token);
    node.addChild(idNode);
    token = token.next;
    if (token.symbol === "[") {
      discard(["["]);
      if (parseInt(token.symbol) >= entry.arrLen) {
        throw error(`Index out of bounds for array '${entry.name}' ` +
                    `at line: ${token.line} col: ${token.col}`);
      }
      idNode.addChild(new TNode(token.symbol, token));
      token = token.next;
      discard(["]"]);
    }
    discard(["="]);
    //Type-checking
    if (token.symbol === "[") {
      throw error(`Cannot assign ARRAY to ${type} '${entry.name}'.`);
    }
    if (type !== getValType(token, scope)) {
      throw error(`Type Mismatch: Cannot assign ${getValType(token, scope)} ` +
                  `to ${type} '${entry.name}'`);
    }
    //VALUE
    analyzeExpr(node, scope);
    //Initialize variable
    entry.initialized = true;
  }

  function analyzeArrayAssign(parent: TNode, scope: SymbolTable) {
    parent.addChild(new TNode(token.symbol, token));
    let entry = scope.lookup(token.symbol);
    token = token.next;
    discard(["="]);
    let valType = getValType(token, scope);
    if (token.symbol !== "[") {
      throw error(`Cannot assign single element to ARRAY '${entry.name}' ` +
                  `at line: ${token.line} col: ${token.col}.`);
    }
    if (valType !== "EMPTY_ARR" && entry.typeTok.name !== valType) {
      throw error(`Type Mismatch: Cannot assign ${valType} to ${entry.typeTok.name} ` +
                  `'${entry.name}' at line: ${token.line} col: ${token.col}.`);
    }
    if (entry.arrLen < getArrLength(token, scope)) {
      throw error(`Cannot assign array of length ${getArrLength(token, scope)} ` +
                  `to ARRAY '${entry.name}' of length ${entry.arrLen} ` +
                  `at line: ${token.line} col: ${token.col}.'`)
    }
    analyzeArrayExpr(parent, scope);
    //Initialize variable
    entry.initialized = true;
  }

  function getArrLength(tok: Token, scope: SymbolTable) {
    let acc = 0;
    if (tok.next.symbol !== "]") {
      acc++;
      tok = tok.next;
    }
    while (tok.symbol !== "]") {
      if (tok.symbol === ",") {
        acc++;
      }
      tok = tok.next;
    }
    return acc;
  }

  function analyzeVarDecl(parent: TNode, scope: SymbolTable) {
    Log.SemMsg("Adding Variable Declaration to AST...");
    let node = branchNode("VAR_DECL", parent);
    //TYPE
    node.addChild(new TNode(token.symbol, token));
    let type = token;
    token = token.next;
    //ID
    node.addChild(new TNode(token.symbol, token));
    let name = token;
    token = token.next;
    Log.SemMsg(`Scope-checking variable '${name.symbol}'...`);
    if (scope.table[name.symbol] !== undefined) {
      throw error(`Attempted to redeclare variable '${name.symbol}' at `+
                  `line: ${name.line} col: ${name.col}`);
    }
    //Array Length (if any)
    let arrLength = -1;
    if (token.name === "LBRACK") {
      discard(["["]);
      node.addChild(new TNode(token.symbol, token));
      arrLength = parseInt(token.symbol);
      token = token.next;
      discard(["]"]);
    }
    Log.SemMsg(`Adding ${type.name} '${name.symbol}' to SymbolTable...`);
    scope.insert(name, type, arrLength);
  }

  function analyzeWhileStatement(parent: TNode, scope: SymbolTable) {
    Log.SemMsg("Adding While Loop to AST...");
    let node = branchNode("WHILE", parent);
    discard(["while"]);
    if (token.symbol === "true") {
      numWarns++;
      Log.SemMsg(`Infinite Loop defined at line: ${token.line} col: `+
                  `${token.col}`, LogPri.WARNING);
    } else if (token.symbol === "false") {
      let line = token.next.line;
      let col = token.next.col;
      numWarns++;
      Log.SemMsg("While Loop condition set to 'false', so the code block will "
                + `never run at line: ${line} col: ${col}`, LogPri.WARNING);
    }
    analyzeBoolExpr(node, scope);
    //Block to be run
    analyzeBlock(node, scope);
  }

  function analyzeIfStatement(parent: TNode, scope: SymbolTable) {
    Log.SemMsg("Adding If Statement to AST...");
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

  function getValType(tok: Token, sTable: SymbolTable) {
    switch (tok.name) {
      case "DIGIT":
        return "INT";
      case "QUOTE":
        return "STRING";
      case "BOOLVAL":
        return "BOOLEAN";
      case "LPAREN":
        return "BOOLEAN";
      case "LBRACK":
        return getValType(tok.next, sTable);
      case "RBRACK":
        return "EMPTY_ARR";
      case "ID":
        return sTable.getType(tok.symbol);
      default:
        return null;
    }
  }

  //Create custom Error object
  function error(msg: string) {
    let e = new Error(msg);
    e.name = "Semantic_Error";
    return e;
  }

  function boolTypeError(tok: Token) {
    return error(`Type Mismatch in boolean expression at line:${tok.line} col:${tok.col}`);
  }

  function typeError(assignEntry, valToken: Token, valType: string, displayVal: boolean = true) {
    let msg = `Type Mismatch: attempted to assign [${valType}`;
    msg += (displayVal) ? `, ${valToken.symbol}] ` : "] ";
    msg += `to [${assignEntry.typeTok.name}, ${assignEntry.name}] ` +
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
