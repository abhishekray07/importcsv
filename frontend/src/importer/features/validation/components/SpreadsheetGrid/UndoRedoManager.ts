export interface Action {
  type: string;
  data: any;
}

export class UndoRedoManager {
  private undoStack: Action[] = [];
  private redoStack: Action[] = [];
  private maxStackSize = 50;

  addAction(action: Action): void {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): Action | null {
    const action = this.undoStack.pop();
    if (action) {
      this.redoStack.push(action);
      return action;
    }
    return null;
  }

  redo(): Action | null {
    const action = this.redoStack.pop();
    if (action) {
      this.undoStack.push(action);
      return action;
    }
    return null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}