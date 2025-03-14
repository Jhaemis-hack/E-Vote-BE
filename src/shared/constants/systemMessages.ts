export const UNAUTHENTICATED_MESSAGE = 'Not an authenticated user';
export const LOGIN_MESSAGE = 'Login successful';
export const SIGNUP_MESSAGE = 'Signup successful';
export const DELETE_ELECTION = `Election deleted successfully`;
export const ERROR_DELETING_ELECTION = 'Cannot delete active election';
export const FETCH_USER = 'User fetched successfully';
export const DELETE_USER = 'User deleted successfully';
export const USER_NOT_FOUND = 'User not found';
export const EMAIL_NOT_FOUND = 'User with this email not found';
export const INCORRECT_PASSWORD = 'Incorrect credentials';
export const INVALID_EMAIL_FORMAT = 'Invalid email format';
export const EMAIL_IN_USE = 'Email already in use';
export const INVALID_PASSWORD_FORMAT =
  'Password must be at least 8 characters long and include a number and special character';
export const PASSWORD_RESET_LINK_SENT = 'Email sent successfully';
export const INCORRECT_UUID = 'Not a valid uuid';
export const VOTELINK_CREATED = 'Vote link creation successful';
export const ELECTION_CREATED = 'Election creation successful';
export const FETCH_ELECTIONS = 'Elections fetched successfully';
export const FETCH_ELECTION = 'Election fetched successfully';
export const ELECTION_UPDATED = 'Election updated successfully';
export const ELECTION_DELETED = 'Election deleted successfully';
export const FETCH_ELECTION_BY_VOTER_LINK = 'Fetched election successfully by the voter link';
export const ELECTION_NOT_FOUND = 'Election not found';
export const ELECTION_ENDED_VOTE_NOT_ALLOWED = 'The election has ended and voting is no longer allowed';
export const ELECTION_ACTIVE_CANNOT_DELETE = 'Election is active and cannot be deleted';
export const EEROR_DELETING_ELECTION = 'Error occured while deleting election';
export const UNAUTHORIZED_USER = 'Authorization is required to access this route.';
export const EMAIL_NOT_VERIFIED = 'Email not verified. Verification email sent, verify email and try again.';
export const EMAIL_VERIFICATION_FAILED = 'Email verification failed. Please try again.';
export const VOTE_CREATION_MESSAGE = 'Thank you for voting! Your vote has been recorded.';
export const CANDIDATE_NOT_FOUND = 'Candidate not found';
export const ELECTION_START_DATE_BEFORE_END_DATE = 'start_date must be before end_date';
export const INTERNAL_SERVER_ERROR = 'Internal Server Error';
export const BAD_REQUEST = 'Bad Request';
export const UNAUTHORIZED_ACCESS = 'Unauthorized Access';
export const USER_UPDATED = 'User Updated Successfully';
export const ELECTION_START_TIME_BEFORE_END_TIME = 'start_time must be before end_time';
export const ELECTION_HAS_NOT_STARTED = 'Election has not started.';
export const ELECTION_HAS_ENDED = 'Election has ended';
export const ERROR_START_DATE_PAST = 'Start date cannot be in the past.';
export const ERROR_START_DATE_AFTER_END_DATE = 'Start date must be before the end date.';
export const ERROR_START_TIME_AFTER_END_TIME = 'Start time must be before the end time.';
export const ERROR_START_TIME_PAST = 'Start time cannot be in the past.';
export const ERROR_START_TIME_AFTER_OR_EQUAL_END_TIME =
  'End time must be greater than start time for elections on the same day.';
export const ERROR_VOTER_ACCESS = 'You are not allowed to vote currently.';
export const ERROR_TOTAL_CANDIDATES = 'Total candidates must exceed the maximum choices.';
export const PASSWORD_RESET_REQUEST_NOT_FOUND = 'pasword reset request not found';
export const PASSWORD_UPDATED_SUCCESSFULLY = 'Admin Password Updated Successfully,please proceed to login';
export const EMAIL_VERIFICATION_SUCCESS = 'Email has been verified';
export const EMAIL_ALREADY_VERIFIED = 'Email already verified';
export const INVALID_VERIFICATION_TOKEN = 'Invalid verification token';
export const VERIFICATION_TOKEN_EXPIRED = 'Verification token has expired';
export const WELCOME_EMAIL_FAILED = 'Welcome email failed to send';
export const FAILED_TO_SEND_VOTING_LINK = 'Failed to send voting link to all voters';
export const FAILED_TO_RETRIEVE_VOTERS = 'Failed to retrieve voters';
export const RETRIEVED_VOTERS_SUCCESSFULLY = 'Retrieved voters successfully';
