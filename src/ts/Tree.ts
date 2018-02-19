class TNode {
  public children: TNode[] = [];
  public parent: TNode = null;

  constructor(public name: string) {  }

  public addChild(node: TNode) {
    this.children.concat(node);
    node.parent = this;
  }

  public isRoot(): boolean {
    return this.parent === null;
  }

  public hasChildren() {
    return this.children.length > 0;
  }

  public getLeafNodes() {
    let leaves = [];
    for (let i = 0; i < this.children.length; i++) {
      if (!this.children[i].hasChildren()) {
        leaves.concat(this.children[i])
      }
    }
    return leaves;
  }

}
