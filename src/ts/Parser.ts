function parse(token: Token) {

  let root = new TNode("Program");
  parseBlock(root);
  match(["$"], root);

  function parseBlock(parent: TNode) {
    let blockNode = new TNode("Block");
    parent.addChild(blockNode);
    match(["{"], blockNode);
    parseStatementList(blockNode);
    match(["}"], blockNode);
  }

  function nextToken() {
    token = token.next;
  }

  //Matches list of tokens by characters
  //formatted as an array of strings.
  //Prints error if match not found.
  function match(tList: string[], parent: TNode) {
    for (let char of tList) {
      if (char === token.char) {
        parent.addChild(new TNode(token.name));
        nextToken();
      } else {
        Log.print(`Error: Expected ${char} found ${token.char}` +
          ` at line: ${token.line} col: ${token.col}.`);
        return;
      }
    }
  }
}
