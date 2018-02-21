function parse(token: Token) {

  let numWarns = 0;

  Log.print("");
  Log.ParseMsg("parse()");

  //Initial parsing of Program
  try {
    let root = new TNode("Program");
    parseBlock(root);
    match(["$"], root);

    //Display results
    Log.print("");
    Log.print(`Parser completed with ${numWarns} warnings and 0 errors.`)
    Log.print("");
    Log.print("CST for Program:");
    Log.print(root.toString());
    //Return CST
    return root;
  } catch (e) {
    if (e.name === "Parse_Error") {
      Log.print(e);
      Log.print("");
      Log.print(`Parser completed with ${numWarns} warnings and 1 errors.`)
      return null;
    } else {
      //If the error is not created by my parser, continue to throw it
      throw e;
    }
  }

  function parseBlock(parent: TNode) {
    Log.ParseMsg("parseBlock()");
    let node = branchNode("Block", parent);
    match(["{"], node);
    parseStatementList(node);
    match(["}"], node);
  }

  function parseStatementList(parent: TNode) {
    Log.ParseMsg("parseStatementList()");
    let node = branchNode("StatementList", parent);
    if (token.name === "PRINT" || token.name === "ID" || token.name === "TYPE" ||
        token.name === "WHILE" || token.name === "IF" || token.symbol === "{") {
          parseStatement(node);
          parseStatementList(node);
    }
  }

  function parseStatement(parent: TNode) {
    Log.ParseMsg("parseStatement()");
    let node = branchNode("Statement", parent);
    switch(token.name) {
      case "PRINT":
        break;
      case "ID":
        break;
      case "TYPE":
        break;
      case "WHILE":
        break;
      case "IF":
        break;
      case "LBRACE":
        break;
      default:
        throw error(`Unexpected token '${token.symbol}' found at line:${token.line} col:${token.col}`);
    }
    nextToken();
  }

  function branchNode(name: string, parent: TNode) {
    let node = new TNode(name);
    parent.addChild(node);
    return node;
  }

  function nextToken() {
    token = token.next;
  }

  //Create custom Error object
  function error(msg: string) {
    let e = new Error(msg);
    e.name = "Parse_Error";
    return e;
  }

  //Matches list of tokens by characters
  //formatted as an array of strings.
  //Prints error if match not found.
  function match(tList: string[], parent: TNode, symbol: boolean = true) {
    let tokenSym;
    for (let char of tList) {
      tokenSym = (symbol) ? token.symbol : token.name;
      if (char === tokenSym) {
        parent.addChild(new TNode(token.symbol));
        nextToken();
      } else {
        throw error(`Expected '${char}' found '${tokenSym}'` +
          ` at line: ${token.line} col: ${token.col}.`);
      }
    }
  }
}
