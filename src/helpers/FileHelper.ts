import { Workbook } from 'exceljs';
import { loadEsm } from 'load-esm';
import fs from 'fs';
const xlsx = require('xlsx');


enum FILE_MIME_TYPES {
  TEXT_CSV = 'test/csv',
  EXCEL = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  
}

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv"
]
export class FileHelper { 
  async readFile(filePath: string) { 
    const fileType = await this.detecFileTypeFromFile(filePath);
    if(!ALLOWED_FILE_TYPES.includes(fileType.mime)) {
      throw new Error("File Type is not supported");
    }
    switch(fileType.mime) {
      // case FILE_MIME_TYPES.TEXT_CSV:
      //   return await this.readCSVFile(filePath);
        //@comeback to this later excel do have different variants.
        case FILE_MIME_TYPES.EXCEL:
          return await this.readExcelFile(filePath);
          default:
        return await this.readCSVFile(filePath);
        break;
    }
  }
  async readCSVFile<T>(filePath: string) { 
    const xbook = xlsx.readFile(filePath);
    const xsheets = xbook.SheetNames;
    const csvs = xlsx.utils.sheet_to_json(xbook.Sheets[xsheets[0]], {
      defval: null,
    })

    return csvs as T;
 }

  async readExcelFile(filePath: string){
    const workBook = xlsx.readFile(filePath);
    const sheetName = workBook.SheetNames[0]; // Assume data is in the first sheet
    const sheet = workBook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" }); // Convert sheet to JSON

    if (rows.length === 0) {
      throw new Error('Sheet contains no data.')
    }
    console.log("[ROWS] ", rows);
    console.log(rows)

  }

  async fileToBuffer(filePath: string): Promise<Buffer> {
    return await fs.promises.readFile(filePath);
  }

  async detecFileTypeFromFile(filePath: string) { 
    const { fileTypeFromFile } = await this.loadESModule();
    const fileType = await fileTypeFromFile(filePath);
    return fileType;
  }

  async detectFileTypeFromBuffer(filePath: string) {
    const { fileTypeFromBuffer } = await this.loadESModule();
    const buffer = await this.fileToBuffer(filePath);

    return await fileTypeFromBuffer(buffer);
  }

  private async loadESModule() {
    return await loadEsm<typeof import('file-type')>('file-type');
  }

  static async readExcelFile() { 

  }


  static getFileExtension(filePath: string) { 
    const parts = filePath.split('.');
    const ext = parts[parts.length - 1];
    return ext;
  }

}