export class HistoryManager {
  constructor(editor, maxHistory = 100) {
    this.editor = editor;
    this.maxHistory = maxHistory;
    this.undoStack = [];
    this.redoStack = [];
  }

  execute(command) {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
    this.editor.events.emit("history:changed", this.getState());
  }

  undo() {
    if (!this.canUndo()) return null;
    const command = this.undoStack.pop();
    command.undo();
    this.redoStack.push(command);
    this.editor.events.emit("history:changed", this.getState());
    this.editor.events.emit("toast", { message: `Undo: ${command.name}` });
    return command;
  }

  redo() {
    if (!this.canRedo()) return null;
    const command = this.redoStack.pop();
    command.execute();
    this.undoStack.push(command);
    this.editor.events.emit("history:changed", this.getState());
    this.editor.events.emit("toast", { message: `Redo: ${command.name}` });
    return command;
  }

  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.editor.events.emit("history:changed", this.getState());
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoName: this.canUndo()
        ? this.undoStack[this.undoStack.length - 1].name
        : null,
      redoName: this.canRedo()
        ? this.redoStack[this.redoStack.length - 1].name
        : null,
    };
  }
}

export class AddObjectCommand {
  constructor(editor, object) {
    this.editor = editor;
    this.object = object;
    this.name = `Add ${object.name || "Object"}`;
  }

  execute() {
    this.editor._attachObject(this.object);
    this.editor.select(this.object);
  }

  undo() {
    this.editor._detachObject(this.object);
  }
}

export class RemoveObjectCommand {
  constructor(editor, object) {
    this.editor = editor;
    this.object = object;
    this.name = `Delete ${object.name || "Object"}`;
  }

  execute() {
    this.editor._detachObject(this.object);
  }

  undo() {
    this.editor._attachObject(this.object);
    this.editor.select(this.object);
  }
}

export class TransformCommand {
  constructor(editor, object, before, after, label = "Transform") {
    this.editor = editor;
    this.object = object;
    this.before = before;
    this.after = after;
    this.name = label;
  }

  _apply(state) {
    this.object.position.copy(state.position);
    this.object.rotation.copy(state.rotation);
    this.object.scale.copy(state.scale);
    this.object.updateMatrixWorld(true);
    this.editor.updateLightHelper(this.object);
    this.editor.events.emit("object:changed", this.object);
  }

  execute() {
    this._apply(this.after);
  }

  undo() {
    this._apply(this.before);
  }
}

export class RenameObjectCommand {
  constructor(editor, object, newName) {
    this.editor = editor;
    this.object = object;
    this.oldName = object.name;
    this.newName = newName;
    this.name = `Rename to ${newName}`;
  }

  execute() {
    this.object.name = this.newName;
    this.editor.events.emit("scene:changed");
    this.editor.events.emit("object:changed", this.object);
  }

  undo() {
    this.object.name = this.oldName;
    this.editor.events.emit("scene:changed");
    this.editor.events.emit("object:changed", this.object);
  }
}

export class ToggleVisibilityCommand {
  constructor(editor, object, visible) {
    this.editor = editor;
    this.object = object;
    this.oldVisible = object.visible;
    this.newVisible = visible;
    this.name = visible ? `Show ${object.name}` : `Hide ${object.name}`;
  }

  execute() {
    this.object.visible = this.newVisible;
    this.editor.updateLightHelper(this.object);
    this.editor.events.emit("scene:changed");
    this.editor.events.emit("object:changed", this.object);
  }

  undo() {
    this.object.visible = this.oldVisible;
    this.editor.updateLightHelper(this.object);
    this.editor.events.emit("scene:changed");
    this.editor.events.emit("object:changed", this.object);
  }
}

export class ReplaceMaterialCommand {
  constructor(editor, object, oldMaterial, newMaterial, label = "Change Material") {
    this.editor = editor;
    this.object = object;
    this.oldMaterial = oldMaterial;
    this.newMaterial = newMaterial;
    this.name = label;
  }

  execute() {
    this.object.material = this.newMaterial;
    this.editor.events.emit("object:changed", this.object);
  }

  undo() {
    this.object.material = this.oldMaterial;
    this.editor.events.emit("object:changed", this.object);
  }
}
