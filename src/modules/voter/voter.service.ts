import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import * as crypto from 'crypto';
import * as csv from 'csv-parser';
import * as stream from 'stream';
import { In, Repository } from 'typeorm';
import * as xlsx from 'xlsx';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '../../errors';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { Election } from '../election/entities/election.entity';
import { Voter } from '../voter/entities/voter.entity';

@Injectable()
export class VoterService {
  private logger = new Logger(VoterService.name);

  constructor(
    @InjectRepository(Voter) private voterRepository: Repository<Voter>,
    @InjectRepository(Election) private electionRepository: Repository<Election>,
  ) {}

  async findAll(
    page: number,
    pageSize: number,
    adminId: string,
    electionId: string,
  ): Promise<{
    status_code: number;
    message: string;
    data: {
      current_page: number;
      total_pages: number;
      total_results: number;
      election_id: string;
      voter_list: any;
      meta: any;
    };
  }> {
    if (!adminId) {
      throw new UnauthorizedError(SYS_MSG.UNAUTHORIZED_USER);
    }

    if (!isUUID(adminId)) {
      throw new BadRequestError(SYS_MSG.INCORRECT_UUID);
    }

    if (page < 1 || pageSize < 1) {
      throw new BadRequestError(SYS_MSG.PAGE_SIZE_ERROR);
    }

    const skip = (page - 1) * pageSize;

    const election = await this.electionRepository.findOne({
      where: { id: electionId },
    });

    if (!election) {
      throw new NotFoundError(SYS_MSG.ELECTION_NOT_FOUND);
    }

    const admin_created_election = await this.electionRepository.findOne({
      where: { created_by: adminId, id: electionId },
    });

    if (!admin_created_election) {
      throw new ForbiddenError(SYS_MSG.ERROR_VOTER_LIST_FORBBIDEN_ACCESS);
    }

    const [voter_list, total] = await this.voterRepository.findAndCount({
      where: { election: { id: electionId } },
      skip,
      take: pageSize,
      relations: ['election'],
    });

    if (total === 0) {
      throw new NotFoundError(SYS_MSG.ELECTION_VOTERS_NOT_FOUND);
    }

    const data = voter_list.map(voter => ({
      voter_id: voter.id,
      name: voter.name,
      email: voter.email,
    }));

    const total_pages = Math.ceil(total / pageSize);

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_ELECTION_VOTER_LIST,
      data: {
        current_page: page,
        total_pages,
        total_results: total,
        election_id: electionId,
        voter_list: data,
        meta: {
          hasNext: page < total_pages,
          total,
          nextPage: page < total_pages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
      },
    };
  }

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
      throw new BadRequestError(SYS_MSG.INVALID_VOTER_FILE_UPLOAD);
    }
  }

  async processCSV(
    fileBuffer: Buffer,
    electionId: string,
  ): Promise<{ status_code: number; message: string; data: any }> {
    try {
      const voters: {
        id: string;
        name: string;
        email: string;
        verification_token: string;
        election: { id: string };
      }[] = [];
      const emailOccurrences = new Map<string, number[]>();
      let rowIndex = 1;

      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);

      return await new Promise((resolve, reject) => {
        bufferStream
          .pipe(csv())
          .on('data', row => {
            try {
              const name = row.name || row.Name || row.NAME;
              const email = (row.email || row.Email || row.EMAIL)?.toLowerCase().trim();

              if (email) {
                if (emailOccurrences.has(email)) {
                  emailOccurrences.get(email)!.push(rowIndex);
                } else {
                  emailOccurrences.set(email, [rowIndex]);
                  voters.push({
                    id: crypto.randomUUID(),
                    name,
                    email,
                    verification_token: crypto.randomUUID(),
                    election: { id: electionId },
                  });
                }
              }
              rowIndex++;
            } catch (error) {
              console.log('Error:', error);
              reject(new InternalServerError(SYS_MSG.ERROR_CSV_PROCESSING));
            }
          })
          .on('end', async () => {
            try {
              const duplicates = Array.from(emailOccurrences.entries())
                .filter(([_, rows]) => rows.length > 1)
                .map(([email, rows]) => ({ email, rows }));
              if (duplicates.length > 0) {
                return reject(
                  new BadRequestError(
                    `Oops! The following emails are already in use: ${duplicates.map(d => d.email).join(', ')}. Please use unique emails.`,
                    duplicates.map(d => d.email).join(', '),
                  ),
                );
              }

              await this.saveVoters(voters);

              resolve({
                status_code: HttpStatus.CREATED,
                message: SYS_MSG.UPLOAD_VOTER_SUCCESS,
                data: null,
              });
            } catch (error) {
              reject(error instanceof AppError ? error : new InternalServerError(SYS_MSG.ERROR_CSV_PROCESSING));
            }
          })
          .on('error', error => {
            reject(error instanceof AppError ? error : new InternalServerError(SYS_MSG.ERROR_CSV_PROCESSING));
          });
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new InternalServerError(SYS_MSG.ERROR_CSV_PROCESSING);
    }
  }

  async processExcel(
    fileBuffer: Buffer,
    electionId: string,
  ): Promise<{ status_code: number; message: string; data: any }> {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) {
        throw new BadRequestError(SYS_MSG.ERROR_EXCEL_INVALID);
      }

      const rows = xlsx.utils.sheet_to_json(sheet);
      const emailOccurrences = new Map<string, number[]>();
      const voters: {
        id: string;
        name: string;
        email: string;
        verification_token: string;
        election: { id: string };
      }[] = [];

      rows.forEach((row: any, index: number) => {
        const name = row.name || row.Name || row.NAME;
        const email = (row.email || row.Email || row.EMAIL)?.toLowerCase();

        if (email) {
          if (emailOccurrences.has(email)) {
            emailOccurrences.get(email)!.push(index + 1);
          } else {
            emailOccurrences.set(email, [index + 1]);
            voters.push({
              id: crypto.randomUUID(),
              name,
              email,
              verification_token: crypto.randomUUID(),
              election: { id: electionId },
            });
          }
        }
      });

      const duplicates = Array.from(emailOccurrences.entries())
        .filter(([_, rows]) => rows.length > 1)
        .map(([email, rows]) => ({ email, rows }));

      if (duplicates.length > 0) {
        throw new BadRequestError(
          `Oops! The following emails are already in use: ${duplicates.map(d => d.email).join(', ')}. Please use unique emails.`,
        );
      }

      await this.saveVoters(voters);

      return {
        status_code: HttpStatus.CREATED,
        message: SYS_MSG.UPLOAD_VOTER_SUCCESS,
        data: null,
      };
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      if (error instanceof ConflictError) {
        throw error;
      }
      throw new InternalServerError(SYS_MSG.ERROR_EXCEL_PROCESSING);
    }
  }

  async saveVoters(
    data: {
      id: string;
      name: string;
      email: string;
      verification_token: string;
      election: { id: string };
    }[],
  ): Promise<any> {
    try {
      if (!data.length) {
        throw new BadRequestError(SYS_MSG.NO_VOTERS_DATA);
      }
      const electionId = data[0].election.id;
      const emails = data.map(voter => voter.email);

      const existingVoters = await this.voterRepository.find({
        where: { email: In(emails), election: { id: electionId } },
        select: ['email'],
      });

      if (existingVoters.length > 0) {
        const existingEmails = existingVoters.map(voter => voter.email);
        throw new ConflictError(SYS_MSG.DUPLICATE_EMAILS_ELECTION, existingEmails);
      }
      await this.voterRepository.save(data);
    } catch (error) {
      console.log('error from save voters', error);
      if (error instanceof ConflictError) {
        throw error;
      }
      throw new InternalServerError(SYS_MSG.VOTER_INSERTION_ERROR);
    }
  }
}
