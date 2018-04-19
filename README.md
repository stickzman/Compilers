# Daniel Ahl's Repository for Design of Compilers

**All code to be graded is found under the master branch**

The language I have chosen to write my compiler in is Typescript.

Typescript can be downloaded from https://www.typescriptlang.org/#download-links

It can be installed from Node.js using the command `npm install -g typescript`

After the Typescript compiler is installed, simply navigate to the root folder of this repository and run `tsc`. The generated javascript can be found in the bin folder and will be linked to in the HTML.

# Array Grammar

The  grammar provided by Alan Labouseur is functional within this compiler. I've added syntax for array declaration and manipulation on top of the existing grammar.

### Array Declaration

`VarDecl ::== type Id [digit]` Where "digit" represents the size of the array. **Array sizes are *fixed.***

Ex: `int a[5]`

### Array Element Accessor

`ID ::== char[digit]` Where the digit represents the 0-based index of the element to be accessed or assigned.

Ex: `a[0] = 3` or `1 + 2 + a[3]`

### Array Expression

`ArrExpr ::== [ExprList]`  
`ExprList ::== Expr, ExprList`  
`         ::== Expr`

**Arrays are one-dimensional**

### Array Assignment

`Id = ArrExpr` The ArrExpr must have equal or less length than the length of the array variable being assigned.  If ArrExpr length _n_ is less than the length of the array variable, then it will assign elements 0-n of the array variable to the corresponding elements in the ArrExpr.

Ex: `a = [3, 5, 2]`
