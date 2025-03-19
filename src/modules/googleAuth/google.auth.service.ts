import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
@Injectable()
export class GoogleService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async validateUser(details: any): Promise<User> {
    const { googleId, email, firstName, lastName, profilePicture } = details;

    let user = await this.usersRepository.findOne({ where: { email } });

    if (user) {
      user.is_verified = true;
      user.google_id = googleId;
      user.profile_picture = profilePicture;
      await this.usersRepository.save(user);
      return user;
    }

    // Create a new user if they don't exist
    const newUser = this.usersRepository.create({
      email,
      first_name: firstName,
      last_name: lastName,
      google_id: googleId,
      profile_picture: profilePicture,
      is_verified: true,
    });

    return this.usersRepository.save(newUser);
  }
}
