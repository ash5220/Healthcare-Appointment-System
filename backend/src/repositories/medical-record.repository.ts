import { MedicalRecord, Doctor, User } from '../models';

class MedicalRecordRepository {
  async findAllByPatientId(patientId: string): Promise<MedicalRecord[]> {
    return MedicalRecord.findAll({
      where: { patientId },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }
}

export const medicalRecordRepository = new MedicalRecordRepository();
