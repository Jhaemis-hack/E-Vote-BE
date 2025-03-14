import { BadRequestException, HttpCode, HttpStatus, Injectable } from '@nestjs/common';
import { Express } from 'express';
import * as csv from 'csv-parser';
import * as xlsx from 'xlsx';
import * as stream from 'stream';
import { InjectRepository } from '@nestjs/typeorm';
import { Voter } from '../voter/entities/voter.entity';
import { Repository } from 'typeorm';
import * as SYS_MSG from '../../shared/constants/systemMessages';

@Injectable()
export class VoterService {
  constructor(@InjectRepository(Voter) private voterRepository: Repository<Voter>) {}
  async processFile(
    file: Express.Multer.File,
    electionId: string,
  ): Promise<{ status_code: number; message: string; data: any }> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      return this.processCSV(file.buffer, electionId);
    } else if (ext === 'xlsx') {
      return this.processExcel(file.buffer, electionId);
    } else {
      throw new BadRequestException({
        status_code: HttpStatus.BAD_REQUEST,
        message: 'Invalid file format',
        data: null,
      });
    }
  }
  async processCSV(
    fileBuffer: Buffer,
    electionId: string,
  ): Promise<{ status_code: number; message: string; data: any }> {
    const voters: { name: string; email: string; election: { id: string } }[] = [];
    const emailOccurrences = new Map<string, number[]>();
    let rowIndex = 1;

    return new Promise((resolve, reject) => {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);

      bufferStream
        .pipe(csv())
        .on('data', row => {
          const name = row.name || row.Name || row.NAME;
          const email = (row.email || row.Email || row.EMAIL)?.toLowerCase();

          if (email) {
            if (emailOccurrences.has(email)) {
              emailOccurrences.get(email)!.push(rowIndex);
            } else {
              emailOccurrences.set(email, [rowIndex]);
              voters.push({ name, email, election: { id: electionId } });
            }
          }
          rowIndex++;
        })
        .on('end', async () => {
          const duplicates = Array.from(emailOccurrences.entries())
            .filter(([_, rows]) => rows.length > 1)
            .map(([email, rows]) => ({ email, rows }));

          if (duplicates.length > 0) {
            return reject(
              new BadRequestException({
                status_code: HttpStatus.BAD_REQUEST,
                message: `Duplicate emails found: ${JSON.stringify(duplicates, null, 2)}`,
                data: null,
              }),
            );
          }
          await this.saveVoters(voters);

          resolve({
            status_code: HttpStatus.CREATED,
            message: SYS_MSG.UPLOAD_VOTER_SUCCESS,
            data: null,
          });
        })
        .on('error', error => reject(new BadRequestException(`CSV processing error: ${error.message}`)));
    });
  }

  async processExcel(
    fileBuffer: Buffer,
    electionId: string,
  ): Promise<{ status_code: number; message: string; data: any }> {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    const emailOccurrences = new Map<string, number[]>();
    const voters: { name: string; email: string; election: { id: string } }[] = [];

    rows.forEach((row: any, index: number) => {
      const name = row.name || row.Name || row.NAME;
      const email = (row.email || row.Email || row.EMAIL)?.toLowerCase();

      if (email) {
        if (emailOccurrences.has(email)) {
          emailOccurrences.get(email)!.push(index + 1);
        } else {
          emailOccurrences.set(email, [index + 1]);
          voters.push({ name, email, election: { id: electionId } });
        }
      }
    });

    const duplicates = Array.from(emailOccurrences.entries())
      .filter(([_, rows]) => rows.length > 1)
      .map(([email, rows]) => ({ email, rows }));

    if (duplicates.length > 0) {
      throw new BadRequestException({
        status_code: HttpStatus.BAD_REQUEST,
        message: `Duplicate emails found: ${JSON.stringify(duplicates, null, 2)}`,
        data: null,
      });
    }

    await this.saveVoters(voters);

    return {
      status_code: HttpStatus.CREATED,
      message: SYS_MSG.UPLOAD_VOTER_SUCCESS,
      data: null,
    };
  }

  async saveVoters(data: { name: string; email: string; election: { id: string } }[]): Promise<any> {
    const voter = await this.voterRepository.insert(data);
  }
}
