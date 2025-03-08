import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from './modules/user/entities/user.entity';
import { Election, ElectionStatus, ElectionType } from './modules/election/entities/election.entity';
import { Candidate } from './modules/candidate/entities/candidate.entity';
import { Vote } from './modules/votes/entities/votes.entity';

config();

const configService = new ConfigService();

const seedDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST'),
  port: parseInt(configService.get('DATABASE_PORT', '5433'), 10),
  username: configService.get('DATABASE_USERNAME'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME'),
  entities: [__dirname + '/modules/**/entities/*.entity{.ts,.js}'],
  migrations: ['dist/db/migrations/*.js'],
  synchronize: true, // Add this line to enable schema synchronization
});

async function seed() {
  await seedDataSource.initialize();

  const userRepository = seedDataSource.getRepository(User);
  const electionRepository = seedDataSource.getRepository(Election);
  const candidateRepository = seedDataSource.getRepository(Candidate);
  const voteRepository = seedDataSource.getRepository(Vote);

  // Check if the user already exists
  let user = await userRepository.findOne({ where: { email: 'admin@example.com' } });
  if (!user) {
    // Create a user
    user = new User();
    user.email = 'admin@example.com';
    user.password = 'hashedPassword';
    await userRepository.save(user);
  } else {
    console.log('User already exists, skipping user creation');
  }

  // Create an election
  const election = new Election();
  election.title = 'Presidential Election';
  election.description = 'Election for the next president';
  election.start_date = new Date('2023-01-01');
  election.end_date = new Date('2023-01-02');
  election.start_time = '09:00:00';
  election.end_time = '17:00:00';
  election.vote_link = 'http://example.com/vote';
  election.status = ElectionStatus.ONGOING;
  election.type = ElectionType.SINGLECHOICE;
  election.created_by_user = user;
  await electionRepository.save(election);

  // Create candidates
  const candidate1 = new Candidate();
  candidate1.name = 'Candidate 1';
  candidate1.election = election;
  await candidateRepository.save(candidate1);

  const candidate2 = new Candidate();
  candidate2.name = 'Candidate 2';
  candidate2.election = election;
  await candidateRepository.save(candidate2);

  // Create votes
  const vote1 = new Vote();
  vote1.election = election;
  vote1.candidate = candidate1;
  vote1.candidate_id = [candidate1.id];
  await voteRepository.save(vote1);

  const vote2 = new Vote();
  vote2.election = election;
  vote2.candidate = candidate2;
  vote2.candidate_id = [candidate2.id];
  await voteRepository.save(vote2);

  console.log('Database seeded successfully');
  await seedDataSource.destroy();
}

seed().catch(error => console.error('Error seeding database:', error));
