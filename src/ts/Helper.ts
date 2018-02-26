/// <reference path="tests.ts"/>

//Level of priority for a log message
enum LogPri {VERBOSE, INFO, WARNING, ERROR};

interface HashTable {
  [key: string]: any;
}

function countLines(str: string): number {
  return str.split(/[\n\r]/).length-1;
}

function lastIndexOfNewLine(str): number {
  return Math.max(str.lastIndexOf('\n'), str.lastIndexOf('\r'));
}

function init() {
  //Initialize the Log
  Log.init();
  //Initialize the Program Select
  let progSel = <HTMLSelectElement>document.getElementById("progSel");
  let names = Object.getOwnPropertyNames(tests);
  let opt;
  for (let i = 0; i < names.length; i++) {
    opt = document.createElement("option");
    opt.text = names[i];
    opt.value = names[i];
    progSel.add(opt);
  }
  //Add event listeners to Console element
  let consoleElem = document.getElementById("source");
  consoleElem.addEventListener("keydown", function (e) {
    if (e.keyCode === 113) {
      //F2 compiles Program
      compile();
    }
    if ([33, 34, 37, 38, 39, 40].indexOf(e.keyCode) === -1) {
      //Reset selected program when edits are made
      progSel.selectedIndex = 0;
    } else if (e.keyCode === 9) {
      //Allow tabs in Console
      e.preventDefault();
      let elem = <HTMLInputElement>this;
      let start = elem.selectionStart;
      let end = elem.selectionEnd;
      elem.value = elem.value.substring(0, start) + "\t" + elem.value.substring(end);
      elem.selectionStart = start+1;
      elem.selectionEnd = start+1;
    }
  });

}

function loadProgram(name: string) {
  if (name === "Select One") {return;}
  let source = <HTMLInputElement>document.getElementById("source");
  source.value = tests[name];
}
