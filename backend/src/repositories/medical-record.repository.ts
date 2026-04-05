import { MedicalRecord, Doctor, User } from '../models';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../config/constants';

class MedicalRecordRepository {
  async findAllByPatientId(
    patientId: string,
    page = 1,
    limit: number = DEFAULT_PAGE_SIZE
  ): Promise<{ records: MedicalRecord[]; total: number }> {
    const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
    const offset = (page - 1) * safeLimit;

    const { rows: records, count: total } = await MedicalRecord.findAndCountAll({
      where: { patientId },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: safeLimit,
      offset,
    });

    return { records, total };
  }
}

export const medicalRecordRepository = new MedicalRecordRepository();
