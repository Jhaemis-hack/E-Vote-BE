import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';

import { Repository } from 'typeorm';
import { Candidate } from './entities/candidate.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import { Express } from 'express';
import * as SYS_MSG from '../../shared/constants/systemMessages';

@Injectable()
export class CandidateService {
  private readonly supabase;
  private readonly bucketName = process.env.SUPABASE_BUCKET;
  constructor(
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
  ) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_BUCKET) {
      throw new Error('Supabase environment variables are not set.');
    }

    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    this.bucketName = process.env.SUPABASE_BUCKET;
  }

  async updatePhoto(id: string, file: Express.Multer.File): Promise<Candidate> {
    const candidate = await this.candidateRepository.findOne({ where: { id } });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    // If no file is provided, use the default placeholder photo
    if (!file) {
      candidate.photo_url = process.env.DEFAULT_PHOTO_URL || 'https://default-photo-url.com';
      return this.candidateRepository.save(candidate);
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new HttpException(
        {
          status_code: HttpStatus.BAD_REQUEST,
          message: SYS_MSG.INVALID_FILE_TYPE,
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate file size (limit: 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new HttpException(
        { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.PHOTO_SIZE_LIMIT, data: null },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Upload file to Supabase
    const { buffer, originalname, mimetype } = file;
    const fileExt = path.extname(originalname);
    const fileName = `${Date.now()}${fileExt}`;

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(`candidate-photos/${fileName}`, buffer, { contentType: mimetype });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new HttpException(
        { status_code: HttpStatus.INTERNAL_SERVER_ERROR, message: SYS_MSG.FAILED_PHOTO_UPDATE, data: null },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Get the public URL of the uploaded file
    const { data: publicUrlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(`candidate-photos/${fileName}`);

    // Update the candidate's photo URL
    candidate.photo_url = publicUrlData.publicUrl;
    return this.candidateRepository.save(candidate);
  }
  // findAll() {
  //   return `This action returns all candidate`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} candidate`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} candidate`;
  // }
}
