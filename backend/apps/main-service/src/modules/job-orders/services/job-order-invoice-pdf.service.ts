import { Injectable } from '@nestjs/common';

const PDFDocument = require('pdfkit');

@Injectable()
export class JobOrderInvoicePdfService {
  async renderInvoice(payload: {
    serviceCenterName: string;
    customerName: string;
    customerContact: string;
    vehicleLabel: string;
    jobOrderReference: string;
    invoiceReference: string;
    officialReceiptReference: string;
    serviceDate: string;
    summary: string;
    workItems: Array<{ name: string; description?: string | null }>;
    paymentMethodLabel: string;
    paymentReference: string | null;
    reservationFeeDeductionLabel: string;
    subtotalLabel: string;
    totalLabel: string;
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

      document.fontSize(20).text(payload.serviceCenterName, { align: 'left' });
      document.moveDown(0.25);
      document.fontSize(11).text('AUTOCARE service invoice');
      document.moveDown();

      document.fontSize(12).text(`Customer: ${payload.customerName}`);
      document.fontSize(11).text(`Contact: ${payload.customerContact}`);
      document.fontSize(11).text(`Vehicle: ${payload.vehicleLabel}`);
      document.fontSize(11).text(`Job order: ${payload.jobOrderReference}`);
      document.fontSize(11).text(`Invoice ref: ${payload.invoiceReference}`);
      document.fontSize(11).text(`Official receipt: ${payload.officialReceiptReference}`);
      document.fontSize(11).text(`Date of service: ${payload.serviceDate}`);
      document.moveDown();

      document.fontSize(13).text('Completed Work');
      document.moveDown(0.4);
      payload.workItems.forEach((item, index) => {
        document.fontSize(11).text(`${index + 1}. ${item.name}`);
        if (item.description) {
          document.fontSize(10).fillColor('#555555').text(`   ${item.description}`);
          document.fillColor('#000000');
        }
      });

      document.moveDown();
      document.fontSize(12).text('Summary');
      document.fontSize(10).text(payload.summary || 'No work summary supplied.');
      document.moveDown();

      document.fontSize(12).text('Charges');
      document.fontSize(10).text(`Subtotal: ${payload.subtotalLabel}`);
      document.fontSize(10).text(`Reservation fee deduction: ${payload.reservationFeeDeductionLabel}`);
      document.fontSize(11).text(`Total amount: ${payload.totalLabel}`);
      document.moveDown();

      document.fontSize(12).text('Payment');
      document.fontSize(10).text(`Method: ${payload.paymentMethodLabel}`);
      document.fontSize(10).text(`Reference: ${payload.paymentReference || 'No external reference recorded'}`);
      document.moveDown(2);

      document.fontSize(11).text('Customer acknowledgment signature: ______________________________');
      document.end();
    });
  }
}
