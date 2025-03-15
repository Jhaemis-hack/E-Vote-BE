import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { Election } from '../election/entities/election.entity';
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
      throw new HttpException(
        { status_code: 401, message: SYS_MSG.UNAUTHORIZED_USER, data: null },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!isUUID(adminId)) {
      throw new HttpException(
        { status_code: 400, message: SYS_MSG.INCORRECT_UUID, data: null },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (page < 1 || pageSize < 1) {
      throw new HttpException(
        {
          status_code: 400,
          message: 'Invalid pagination parameters. Page and pageSize must be greater than 0.',
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const skip = (page - 1) * pageSize;

    const election = await this.electionRepository.findOne({
      where: { id: electionId },
    });

    if (!election) {
      throw new HttpException(
        { status_code: 404, message: SYS_MSG.ELECTION_NOT_FOUND, data: null },
        HttpStatus.NOT_FOUND,
      );
    }

    const admin_created_election = await this.electionRepository.findOne({
      where: { created_by: adminId, id: electionId },
    });

    if (!admin_created_election) {
      throw new HttpException(
        { status_code: 403, message: `No election associated with Admin ID: ${adminId} could be found.`, data: null },
        HttpStatus.FORBIDDEN,
      );
    }

    const [voter_list, total] = await this.voterRepository.findAndCount({
      where: { election: { id: electionId } },
      skip,
      take: pageSize,
      relations: ['election'],
    });

    if (total === 0) {
      throw new HttpException(
        { status_code: 404, message: SYS_MSG.ELECTION_VOTERS_NOT_FOUND, data: null },
        HttpStatus.NOT_FOUND,
      );
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
      throw new BadRequestException({
        status_code: HttpStatus.BAD_REQUEST,
        message: SYS_MSG.INVALID_VOTER_FILE_UPLOAD,
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
              new HttpException(
                {
                  status_code: HttpStatus.BAD_REQUEST,
                  message: `Oops! The following emails are already in use: ${duplicates.map(d => d.email).join(', ')}. Please use unique emails.`,
                  data: duplicates.map(d => d.email).join(', '),
                },
                HttpStatus.BAD_REQUEST,
              ),
            );
          }
          await this.saveVoters(voters);

          resolve({
            status_code: HttpStatus.CREATED,
            message: SYS_MSG.UPLOAD_VOTER_SUCCESS,
            data: null,
          });
        })
        .on('error', error =>
          reject(
            new InternalServerErrorException({
              status_code: HttpStatus.INTERNAL_SERVER_ERROR,
              message: SYS_MSG.ERROR_CSV_PROCESSING,
              data: null,
            }),
          ),
        );
    });
  }

  async processExcel(
    fileBuffer: Buffer,
    electionId: string,
  ): Promise<{ status_code: number; message: string; data: any }> {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) {
        throw new BadRequestException({
          status_code: HttpStatus.BAD_REQUEST,
          message: SYS_MSG.ERROR_EXCEL_INVALID,
          data: null,
        });
      }

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
        throw new HttpException(
          {
            status_code: HttpStatus.BAD_REQUEST,
            message: `Oops! The following emails are already in use: ${duplicates.map(d => d.email).join(', ')}. Please use unique emails.`,
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.saveVoters(voters);

      return {
        status_code: HttpStatus.CREATED,
        message: SYS_MSG.UPLOAD_VOTER_SUCCESS,
        data: null,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException({
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: SYS_MSG.ERROR_EXCEL_PROCESSING,
        data: null,
      });
    }
  }

  async saveVoters(data: { name: string; email: string; election: { id: string } }[]): Promise<any> {
    try {
      await this.voterRepository.insert(data);
    } catch (error) {
      throw new InternalServerErrorException({
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: SYS_MSG.VOTER_INSERTION_ERROR,
        data: null,
      });
    }
  }
}
