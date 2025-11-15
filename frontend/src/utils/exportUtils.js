// frontend/src/utils/exportUtils.js
import * as XLSX from 'xlsx';

/**
 * Export data to CSV format
 */
export const exportToCSV = (data, filename, headers) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Create CSV content
  let csvContent = '';
  
  // Add headers if provided
  if (headers && headers.length > 0) {
    csvContent += headers.join(',') + '\n';
  }

  // Add data rows
  data.forEach((row) => {
    const values = Array.isArray(row) ? row : Object.values(row);
    const csvRow = values.map(value => {
      // Escape commas and quotes in values
      const stringValue = String(value || '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvContent += csvRow.join(',') + '\n';
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export data to Excel format
 */
export const exportToExcel = (data, filename, sheetName = 'Sheet1', headers = null) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    // Prepare worksheet data
    let worksheetData = [];
    
    // Add headers if provided
    if (headers && headers.length > 0) {
      worksheetData.push(headers);
    }

    // Add data rows
    data.forEach((row) => {
      if (Array.isArray(row)) {
        worksheetData.push(row);
      } else {
        worksheetData.push(Object.values(row));
      }
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Write file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Failed to export to Excel. Please try again.');
  }
};

/**
 * Print data as a formatted table
 */
export const printData = (title, data, headers, containerId = null) => {
  if (!data || data.length === 0) {
    alert('No data to print');
    return;
  }

  // Create print window content
  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @media print {
          @page {
            margin: 1cm;
          }
        }
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        h1 {
          color: #333;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .print-info {
          margin-bottom: 20px;
          color: #666;
          font-size: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="print-info">
        Generated on: ${new Date().toLocaleString()}<br>
        Total Records: ${data.length}
      </div>
      <table>
        <thead>
          <tr>
  `;

  // Add headers
  if (headers && headers.length > 0) {
    headers.forEach(header => {
      printContent += `<th>${header}</th>`;
    });
  } else if (data.length > 0 && typeof data[0] === 'object') {
    Object.keys(data[0]).forEach(key => {
      printContent += `<th>${key}</th>`;
    });
  }

  printContent += `
          </tr>
        </thead>
        <tbody>
  `;

  // Add data rows
  data.forEach((row) => {
    printContent += '<tr>';
    const values = Array.isArray(row) ? row : Object.values(row);
    values.forEach(value => {
      printContent += `<td>${String(value || '')}</td>`;
    });
    printContent += '</tr>';
  });

  printContent += `
        </tbody>
      </table>
      <div class="footer">
        BulSU Gate System - ${new Date().getFullYear()}
      </div>
    </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

