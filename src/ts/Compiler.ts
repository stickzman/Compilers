function compile() {
  //Get source code
  let source = (<HTMLInputElement>document.getElementById("source")).value;

  Log.clear();

  let tokenLinkedList = lex(source);
  if (tokenLinkedList === null) {return;}
  let CST = parse(tokenLinkedList);
  if (CST === null) {return;}
  
}
