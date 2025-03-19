import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'The email associated with the Google account',
    example: 'user@example.com',
    readOnly: true,
  })
  email: string;

  @ApiProperty({
    description: 'Google ID of the authenticated user',
    example: '10987654321',
    readOnly: true,
  })
  googleId: string;

  @ApiProperty({
    description: "User's first name from Google",
    example: 'John',
    readOnly: true,
  })
  firstName?: string;

  @ApiProperty({
    description: "User's last name from Google",
    example: 'Doe',
    readOnly: true,
  })
  lastName?: string;

  @ApiProperty({
    description: "User's profile picture URL from Google",
    example: 'https://lh3.googleusercontent.com/photo.jpg',
    readOnly: true,
  })
  profilePicture?: string;

  @ApiProperty({
    description: 'Indicates whether the user is verified',
    example: true,
    readOnly: true,
  })
  isVerified: boolean;
}
