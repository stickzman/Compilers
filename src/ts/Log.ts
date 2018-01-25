/// <reference path="Helper.ts"/>
class Log {
  private static level: LogPri;
  public static logElem: HTMLInputElement;

  public static init() {
    Log.logElem = <HTMLInputElement>document.getElementById("log");
    let prioityElem = <HTMLInputElement>document.getElementById("prioritySelect");
    Log.updateLevel(prioityElem.value);
  }

  public static print(msg: string, priority: LogPri = LogPri.INFO) {
    if (priority >= Log.level) {
      Log.logElem.value = Log.logElem.value + msg + "\n";
    }
  }

  public static clear() {
    Log.logElem.value = "";
  }

  public static updateLevel(level: string) {
    switch (level) {
      case "VERBOSE":
        Log.level = LogPri.VERBOSE;
        break;
      case "INFO":
        Log.level = LogPri.INFO;
        break;
      case "WARNING":
        Log.level = LogPri.WARNING;
        break;
      case "ERROR":
        Log.level = LogPri.ERROR;
        break;
    }
  }

  public static LexMsg(msg: string, line: number, col: number,
      priority: LogPri = LogPri.INFO, hint?: string) {
    let str = "LEXER: ";
    switch (priority) {
      case LogPri.ERROR:
        str += "ERROR: ";
        break;
      case LogPri.WARNING:
        str += "WARNING: ";
        break;
    }
    str += msg + ` at line: ${line} col: ${col}.`;
    if (hint !== undefined) {
      str += " " + hint;
    }
    Log.print(str, priority);
  }

  public static isClear(): boolean {
    return Log.logElem.value == "";
  }

}
