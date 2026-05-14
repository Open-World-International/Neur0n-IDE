import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface LogEntry {
  timestamp: string;
  type: 'INFO' | 'ERROR' | 'WARN' | 'SYSTEM';
  message: string;
  details?: string;
}

export const exportLogsToExcel = (logs: LogEntry[], fileName: string = 'neur0n_mesh_logs.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet(logs);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveAs(data, fileName);
};

export const exportHandshakeReport = (token: string, status: string, error?: string) => {
  const report = [
    {
      Protocol: 'Neur0n Handshake v2.4',
      Timestamp: new Date().toISOString(),
      TokenSignature: token.substring(0, 8) + '...',
      Status: status,
      Details: error || 'Handshake handshake established successfully via AES-256 tunnel.'
    }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(report);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Handshake Report');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveAs(data, `handshake_report_${Date.now()}.xlsx`);
};
