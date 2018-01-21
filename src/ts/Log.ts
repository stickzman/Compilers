/// <reference path="Helper.ts"/>
class Log {
  private static level: LogPri = LogPri.WARNING;
  public static logElem: HTMLInputElement;

  public static init() {
    Log.logElem = <HTMLInputElement>document.getElementById("log");
  }

  public static print(msg: string, priority: LogPri = LogPri.VERBOSE) {
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
      case "WARNING":
        Log.level = LogPri.WARNING;
        break;
      case "ERROR":
        Log.level = LogPri.ERROR;
        break;
    }
  }

}
