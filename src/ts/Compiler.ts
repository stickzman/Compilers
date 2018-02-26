function compile() {
  //Get source code
  let source = (<HTMLInputElement>document.getElementById("source")).value;

  Log.clear();

  let tokenLinkedList = lex(source);
  if (tokenLinkedList === null) {return;}
  let results = parse(tokenLinkedList);.
  let CSTs = results[0];
  if (CSTs === null) {return;}
  let symbolTables = results[1];

}
