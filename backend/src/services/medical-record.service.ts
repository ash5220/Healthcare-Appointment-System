import PDFDocument from 'pdfkit';
import { MedicalRecord } from '../models';
import { medicalRecordRepository } from '../repositories/medical-record.repository';

class MedicalRecordService {
  async findAllByPatientId(patientId: string): Promise<MedicalRecord[]> {
    return medicalRecordRepository.findAllByPatientId(patientId);
  }

  convertToCsv(records: MedicalRecord[]): string {
    const headers = [
      'Record ID',
      'Date',
      'Type',
      'Doctor',
      'Diagnosis',
      'Lab Results',
      'Prescriptions',
      'Notes',
    ];

    const rows = records.map(record => {
      const doctorName = record.doctor?.user
        ? `Dr. ${record.doctor.user.firstName} ${record.doctor.user.lastName}`
        : 'Unknown';

      const labResultsSummary =
        record.labResults?.map(r => `${r.testName}: ${r.result} ${r.unit}`).join('; ') || '';

      const prescriptionsSummary =
        record.prescriptions?.map(p => `${p.medication} (${p.dosage})`).join('; ') || '';

      return [
        record.id,
        record.createdAt.toISOString().split('T')[0],
        record.recordType,
        doctorName,
        record.diagnosis || '',
        labResultsSummary,
        prescriptionsSummary,
        // Escape quotes in notes if present
        `"${(record.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  generatePdf(records: MedicalRecord[], patientName: string, res: NodeJS.WritableStream): void {
    const doc = new PDFDocument({ margin: 50 });

    doc.pipe(res);

    doc.fontSize(20).text(`Medical Records - ${patientName}`, { align: 'center' });
    doc.moveDown(2);

    if (records.length === 0) {
      doc.fontSize(12).text('No medical records found.', { align: 'center' });
      doc.end();
      return;
    }

    records.forEach((record, index) => {
      const doctorName = record.doctor?.user
        ? `Dr. ${record.doctor.user.firstName} ${record.doctor.user.lastName}`
        : 'Unknown';

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`Record Date: ${record.createdAt.toISOString().split('T')[0]}`);
      doc.fontSize(12).font('Helvetica').text(`Type: ${record.recordType}`);
      doc.text(`Doctor: ${doctorName}`);

      if (record.diagnosis) {
        doc.text(`Diagnosis: ${record.diagnosis}`);
      }

      if (record.labResults && record.labResults.length > 0) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Lab Results:');
        doc.font('Helvetica');
        record.labResults.forEach(r => {
          doc.text(`- ${r.testName}: ${r.result} ${r.unit}`);
        });
      }

      if (record.prescriptions && record.prescriptions.length > 0) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Prescriptions:');
        doc.font('Helvetica');
        record.prescriptions.forEach(p => {
          doc.text(`- ${p.medication} (${p.dosage})`);
        });
      }

      if (record.notes) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Notes:');
        doc.font('Helvetica');
        doc.text(record.notes);
      }

      if (index < records.length - 1) {
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(1);
      }
    });

    doc.end();
  }
}

export const medicalRecordService = new MedicalRecordService();
