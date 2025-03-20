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
export const ELECTION_IS_LIVE = 'Election is live. Vote now!';
export const ELECTION_HAS_ENDED = 'Election has ended.';
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
export const INVALID_NOTIFICATION_SETTINGS = 'Enable or Disable email notifications';
export const EMAIL_NOTIFICATION_UPDATED = 'Email notification settings updated successfully';
export const ERROR_MAX_CHOICES = 'Maximum choices for single election must be 1';
export const ELECTION_VOTERS_NOT_FOUND = 'No voters found for this election';
export const FETCH_ELECTION_VOTER_LIST = 'Election voters fetched successfully';
export const UPLOAD_VOTER_SUCCESS = 'Voters uploaded successfully';
export const VALID_PHOTO_URL = 'Valid photo url';
export const UPLOAD_FAILED = 'Upload failed';
export const NO_PHOTO_URL = 'No photo url';
export const INVALID_PHOTO_URL = 'Invalid photo url';
export const FETCH_PROFILE_URL = 'successfully stored profile URL';
export const FAILED_PHOTO_UPLOAD = 'Failed to upload photo to Supabase.';
export const PHOTO_SIZE_LIMIT = 'File size exceeds 2MB limit.';
export const INVALID_FILE_TYPE = 'Invalid file type. Only JPEG and PNG are allowed.';
export const NO_FILE_UPLOADED = 'No file uploaded';
export const DEFAULT_PROFILE_URL = 'default profile photo assigned';
export const INVALID_VOTER_FILE_UPLOAD = 'Invalid file format. Only Excel and CSV are allowed';
export const ERROR_CSV_PROCESSING =
  'CSV processing error: Failed to parse the CSV file. Ensure the file contains valid data.';
export const ERROR_EXCEL_INVALID = 'Invalid or empty Excel file';
export const ERROR_EXCEL_PROCESSING =
  'EXCEL processing error: Failed to parse the excel file. Ensure the file contains valid data.';
export const VOTER_INSERTION_ERROR = 'Error insertion voters';
export const EMAIL_NOTIFICATION_ENABLED = 'Email notifications have been enabled for this election.';
export const EMAIL_NOTIFICATION_DISABLED = 'Email notifications have been disabled for this election.';
export const INVALID_VOTE_LINK = 'Invalid vote link';
export const ALREADY_VOTED = 'You have already voted';

export const VOTER_VERIFIED = 'Voter verified, proceed to cast your vote';
export const VOTER_UNVERIFIED = 'Voter unverified, your not allowed to vote in this election';

export const NO_VOTERS_DATA = 'No voter data provided.';
export const DUPLICATE_EMAILS_ELECTION =
  'Duplicate Voter Registration Detected: The email(s) are already registered for this election.';
export const FETCH_ADMINS = 'Admins fetched successfully';
export const ERROR_VOTER_LIST_FORBBIDEN_ACCESS = "Only Election Creator can view Voter's list.";
export const ELECTION_CREATED_EMAIL_FAILED = 'Election created email failed to send';


export const INVALID_CREDENTIALS = 'Invalid credentials';
export const SERVER_ERROR = 'Sorry a server error occured';
export const GOOGLE_AUTH_RESPONSE = 'Authentication successful';


export const INVALID_FIRST_NAME= 'First name must be a valid non-empty string.';
export const FIRST_NAME_TOO_SHORT= 'First name must be at least 2 characters long.';
export const FIRST_NAME_TOO_LONG= 'First name cannot exceed 50 characters.';
export const FIRST_NAME_INVALID_CHARACTERS= 'First name can only contain letters and spaces.';

export const INVALID_LAST_NAME = 'Last name must be a string';
export const LAST_NAME_TOO_SHORT= 'Last name must be at least 2 characters long.';
export const LAST_NAME_TOO_LONG= 'Last name cannot exceed 50 characters.';
export const LAST_NAME_INVALID_CHARACTERS= 'Last name can only contain letters and spaces.';

