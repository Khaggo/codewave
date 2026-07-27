import { Injectable } from '@nestjs/common';

const PDFDocument = require('pdfkit');

@Injectable()
export class JobOrderTechnicianChecklistPdfService {
  async renderChecklist(payload: {
    technicianName: string;
    technicianCode: string | null;
    specialty: string;
    jobOrderReference: string;
    vehicleLabel: string;
    customerLabel: string;
    createdAt: string;
    workItems: Array<{ name: string; description?: string | null }>;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const document = new PDFDocument({
        size: 'A4',
        margin: 48,
      });

      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      document.fontSize(20).text('AUTOCARE Technician Checklist');
      document.moveDown(0.5);
      document.fontSize(11).text(`Job order: ${payload.jobOrderReference}`);
      document.fontSize(11).text(`Vehicle: ${payload.vehicleLabel}`);
      document.fontSize(11).text(`Customer: ${payload.customerLabel}`);
      document.fontSize(11).text(`Technician: ${payload.technicianName}`);
      document.fontSize(11).text(`Profile code: ${payload.technicianCode || 'Not assigned'}`);
      document.fontSize(11).text(`Specialty: ${payload.specialty}`);
      document.fontSize(11).text(`Printed: ${payload.createdAt}`);
      document.moveDown();

      document.fontSize(13).text('Workshop stages');
      ;['Received', 'Diagnosis', 'In Repair', 'Quality Check', 'Ready'].forEach((stage, index) => {
        document.fontSize(10).text(`[ ] ${index + 1}. ${stage}`);
      });

      document.moveDown();
      document.fontSize(13).text('Assigned work items');
      document.moveDown(0.3);
      payload.workItems.forEach((item, index) => {
        document.fontSize(10).text(`[ ] ${index + 1}. ${item.name}`);
        if (item.description) {
          document.fillColor('#666666').text(`    ${item.description}`);
          document.fillColor('#000000');
        }
      });

      document.moveDown();
      document.fontSize(12).text('Technician notes');
      document.moveDown(0.4);
      for (let row = 0; row < 8; row += 1) {
        document.text('____________________________________________________________');
      }

      document.end();
    });
  }
}
