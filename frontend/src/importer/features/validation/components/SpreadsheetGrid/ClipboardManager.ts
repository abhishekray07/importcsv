interface Selection {
  start: { row: number; col: number };
  end: { row: number; col: number };
}

export class ClipboardManager {
  private clipboardData: string[] = [];
  private clipboardSelection: Selection | null = null;

  copy(data: string[], selection: Selection): void {
    this.clipboardData = data;
    this.clipboardSelection = selection;
    
    // Create tab-separated values for system clipboard
    const rows = this.formatAsTable(data, selection);
    const text = rows.join('\n');
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(err => {
        console.error('Failed to copy to clipboard:', err);
      });
    }
  }

  async paste(): Promise<string | null> {
    if (!navigator.clipboard) {
      return this.getInternalClipboard();
    }

    try {
      const text = await navigator.clipboard.readText();
      return text;
    } catch (err) {
      console.error('Failed to read from clipboard:', err);
      return this.getInternalClipboard();
    }
  }

  private formatAsTable(data: string[], selection: Selection): string[] {
    if (!selection) return data;

    const numCols = Math.abs(selection.end.col - selection.start.col) + 1;
    const numRows = Math.abs(selection.end.row - selection.start.row) + 1;
    
    const rows: string[] = [];
    let dataIndex = 0;

    for (let r = 0; r < numRows; r++) {
      const rowData: string[] = [];
      for (let c = 0; c < numCols; c++) {
        rowData.push(data[dataIndex] || '');
        dataIndex++;
      }
      rows.push(rowData.join('\t'));
    }

    return rows;
  }

  private getInternalClipboard(): string | null {
    if (this.clipboardData.length === 0) return null;
    
    if (this.clipboardSelection) {
      const rows = this.formatAsTable(this.clipboardData, this.clipboardSelection);
      return rows.join('\n');
    }
    
    return this.clipboardData.join('\n');
  }

  clear(): void {
    this.clipboardData = [];
    this.clipboardSelection = null;
  }
}