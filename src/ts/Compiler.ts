function compile() {
  //Get source code
  let source = (<HTMLInputElement>document.getElementById("source")).value;

  Log.clear();

  let tokenLinkedList = lex(source);
  if (tokenLinkedList === null) {return;}
  let results = parse(tokenLinkedList);
  if (results === null) {return;}
  let CSTs = <TNode[]> results[0];
  let symbolTables = <SymbolTable[]> results[1];
  
}
