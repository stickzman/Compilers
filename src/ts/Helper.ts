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
  //Add event listeners to whole page
  document.addEventListener("keydown", function (e) {
    //F2 compiles Program
    if (e.keyCode === 113) {
      e.preventDefault();
      updateDisplay();
    }
  });
  //Add event listeners to Console element
  let consoleElem = document.getElementById("source");
  consoleElem.addEventListener("keydown", function (e) {
    if ([33, 34, 37, 38, 39, 40].indexOf(e.keyCode) === -1) {
      //Reset selected program when edits are made
      progSel.selectedIndex = 0;
    }
    if (e.keyCode === 9) {
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

//Polyfill for padStart String function
if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength,padString) {
        targetLength = targetLength>>0; //truncate if number or convert non-number to 0;
        padString = String((typeof padString !== 'undefined' ? padString : ' '));
        if (this.length > targetLength) {
            return String(this);
        }
        else {
            targetLength = targetLength-this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
            }
            return padString.slice(0,targetLength) + String(this);
        }
    };
}
