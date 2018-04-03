//All test cases names and source code to be displayed in console panel
let tests = {
  "Alan Test Case":
    "/*  Provided By \n  - Alan G Labouseur\n*/\n{}$\t\n{{{{{{}}}}}}$\t\n{{{{{{}}}}}}}$\t\n{int\t@}$",
  "Simple Test 1":
    "/* Simple Program - No Operations */\n{}$",
  "Simple Test 2":
    "/* Print Operation */\n{\n\tprint(\"the cake is a lie\")\n}$",
  "Simple Test 3":
    "{\n    int a \n    boolean b \n    {\n        string c\n        a = 5 \n        b = true \n        c = \"inta\"\n        print(c)\n    }\n    string c\n    c = \" \"\n    print(c)\n    print(b) \n    print(\" \")\n    print(a)\n}$",
  "Long Test Case":
    "/* Long Test Case */\n{\n\t/* Int Declaration */\n\tint a\n\tint b\n\n\ta = 0\n\tb = 0\n\n\t/* While Loop */\n\twhile (a != 3) {\n    \tprint(a)\n    \twhile (b != 3) {\n        \t\tprint(b)\n        \t\tb = 1 + b\n        \t\tif (b == 2) {\n\t\t\t        /* Print Statement */\n            \t\tprint(\"there is no spoon\"/* This will do nothing */)\n        \t\t}\n    \t}\n\n    \tb = 0\n    \ta = 1 + a\n\t}\n}$",
  "Long Test Case - ONE LINE":
    "/*LongTestCase*/{/*IntDeclaration*/intaintba=0b=0/*WhileLoop*/while(a!=3){print(a)while(b!=3){print(b)b=1+bif(b==2){/*PrintStatement*/print(\"there is no spoon\"/*Thiswilldonothing*/)}}b=0a=1+a}}$",
  "Invalid String":
    "/* This will fail because strings\n - can't contain numbers */\n{\n\tprint(\"12\")\n}$",
  "New Line in String":
    "/* Invalid Break Line in String */\n{\"two\nlines\"}$",
  "Comment \\n in String":
    "/* Valid because break line wrapped in comment*/\n{\"two/*\n*/lines\"}$",
  "Multiple Comments in String":
    "/* All comments removed from string*/\n{\"one/*1234*/ /*test*/lin/**/e/**/\"}$",
  "Missing $":
    "/*Missing \'$\' from end of program*/\n/*Lexer throws warning and fixes*/\n\n{print(\"test\")}",
  "Keywords and Special Chars, No Whitespace":
    "{}print()whileif\"\"intstringbooleanabc123==!=falsetrue+/**/=$",
  "Undeclared Variable":
    "/*Variable used before declaration.  Results in error.*/\n{\n\ta = \"asdf\"\n\tprint (a)\n}$",
  "Re-declared Variable":
    "/*Variable re-declared on line 6.  Results in error.*/\n{\n\tstring a\n\ta = \"asdf\"\n\tprint (a)\n\tstring a\n\ta = \"test\"\n}$",
  "Type Mismatch":
    "/*Attempts to assign integer value to string variable.\nResults in type mismatch error.*/\n{\n\tstring a\n\tint b\n\tb = 9\n\ta = b\n}$",
  "Unused Variables":
    "/*Variables are declared and unused or initialized and unused.\nBoth result in different warnings.*/\n{\n\tstring a\n\tint b\n\tb = 9\n}$",
  "Unintialized Variables":
    "/*Uninitialized variables being used within the program.\nResults in warnings.*/\n{\n\tint a\n\tint b\n\tprint(a)\n\ta = 3 + b\n}$"
};
