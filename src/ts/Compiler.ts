function compile() {
  //Get source code
  let source = (<HTMLInputElement>document.getElementById("source")).value;

  Log.clear();

  //Split source code of programs
  let pgrms = source.split("$");
  for (let i = 0; i < pgrms.length; i++) {
    if (i == pgrms.length-1) {
      if (/^\s*$/.test(pgrms[i])) {
        //If the last program is whitespace, delete it
        pgrms.pop();
      }
    } else if (/.*\/\*((?!\*\/).)*$/.test(pgrms[i]) && /^(.(?!\/\*))*\*\//.test(pgrms[i+1])) {
      //If the last and next programs end and begin with unclosed comment blocks,
      //the '$' was inside a comment and the programs should be put back together
      pgrms[i] += "$"; //Add the missing '$'
      pgrms[i] = pgrms[i].concat(pgrms[i+1]);
      pgrms.splice(i+1, 1);
    } else {
      //Add '$' back at the end of the program
      pgrms[i] += "$";
    }
  }

  let lineCount = 1;
  let colCount = 0;
  for (let i = 0; i < pgrms.length; i++) {
    Log.breakLine();
    Log.print("Lexing Program " + (i+1) + "...");
    let results = lex(pgrms[i], lineCount, colCount, i+1);
    let tokenLinkedList = results[0];
    lineCount = results[1];
    colCount = results[2];
    if (tokenLinkedList === null) {continue;}
    Log.breakLine();
    Log.print("Parsing Program " + (i+1) + "...");
    let CST = parse(tokenLinkedList, i+1);
    if (CST === null) {continue;}
    Log.breakLine();
    Log.print("Analyzing Program " + (i+1) + "...");
    let res = analyze(tokenLinkedList, i+1);
    if (res === null) {continue;}
    let AST = res[0];
    let sTree = res[1];
  }

}
