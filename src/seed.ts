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
  port: parseInt(configService.get('DATABASE_PORT', '5432'), 10),
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

  // Create additional users
  const user2 = new User();
  user2.email = 'user2@example.com';
  user2.password = 'hashedPassword2';
  await userRepository.save(user2);

  const user3 = new User();
  user3.email = 'user3@example.com';
  user3.password = 'hashedPassword3';
  await userRepository.save(user3);

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

  // Create additional elections
  const election2 = new Election();
  election2.title = 'Senatorial Election';
  election2.description = 'Election for the next senator';
  election2.start_date = new Date('2023-02-01');
  election2.end_date = new Date('2023-02-02');
  election2.start_time = '09:00:00';
  election2.end_time = '17:00:00';
  election2.vote_link = 'http://example.com/vote2';
  election2.status = ElectionStatus.COMPLETED;
  election2.type = ElectionType.MULTICHOICE;
  election2.created_by_user = user2;
  await electionRepository.save(election2);

  // Create candidates
  const candidate1 = new Candidate();
  candidate1.name = 'Candidate 1';
  candidate1.election = election;
  await candidateRepository.save(candidate1);

  const candidate2 = new Candidate();
  candidate2.name = 'Candidate 2';
  candidate2.election = election;
  await candidateRepository.save(candidate2);

  // Create additional candidates
  const candidate3 = new Candidate();
  candidate3.name = 'Candidate 3';
  candidate3.election = election2;
  await candidateRepository.save(candidate3);

  const candidate4 = new Candidate();
  candidate4.name = 'Candidate 4';
  candidate4.election = election2;
  await candidateRepository.save(candidate4);

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

  // Create additional votes
  const vote3 = new Vote();
  vote3.election = election2;
  vote3.candidate = candidate3;
  vote3.candidate_id = [candidate3.id];
  await voteRepository.save(vote3);

  const vote4 = new Vote();
  vote4.election = election2;
  vote4.candidate = candidate4;
  vote4.candidate_id = [candidate4.id];
  await voteRepository.save(vote4);

  console.log('Database seeded successfully');
  await seedDataSource.destroy();
}

seed().catch(error => console.error('Error seeding database:', error));
