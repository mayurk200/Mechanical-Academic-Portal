# Firestore Database Schema

## Collections

### `users`
| Field | Type | Description |
|-------|------|-------------|
| uid | string (doc ID) | Firebase Auth UID |
| name | string | Full name |
| email | string | Email address |
| role | string | `admin` \| `teacher` \| `student` |
| department | string | Department code |
| urn | string | Unique Registration Number (students) |
| rollNo | string | Roll number |
| phone | string | Phone number |
| profilePhoto | string | Photo URL |
| aggTotalClasses | number | Aggregate attendance counter |
| aggTotalPresent | number | Aggregate present counter |
| createdBy | string | UID of creator |
| createdAt | timestamp | Creation date |

### `courses`
| Field | Type | Description |
|-------|------|-------------|
| title | string | Course name |
| description | string | Course description |
| code | string | Course code |
| teacherId | string | Assigned teacher UID |
| teacherName | string | Teacher display name |
| category | string | Course category |
| createdAt | timestamp | Creation date |

### `enrollments`
| Field | Type | Description |
|-------|------|-------------|
| studentId | string | Student UID |
| courseId | string | Course document ID |
| teacherId | string | Teacher who assigned |
| assignedDate | timestamp | Assignment date |

### `attendance`
| Field | Type | Description |
|-------|------|-------------|
| studentId | string | Student UID |
| courseId | string | Course document ID |
| date | string | Date (YYYY-MM-DD) |
| status | string | `present` \| `absent` |
| studentName | string | Denormalized name |
| markedBy | string | Marker UID |
| createdAt | timestamp | Record creation |

### `tests`
| Field | Type | Description |
|-------|------|-------------|
| courseId | string | Course document ID |
| title | string | Test title |
| duration | number | Duration in minutes |
| attemptLimit | number | Max attempts allowed |
| negativeMarking | boolean | Enable negative marks |
| randomOrder | boolean | Shuffle questions |
| shuffleOptions | boolean | Shuffle answer options |
| disableCopy | boolean | Prevent copy/paste |
| tabSwitchLimit | number | Max tab switches |
| totalMarks | number | Total marks |
| questions | array | Question objects |
| showResultToStudents | boolean | Show results |
| createdBy | string | Creator UID |
| createdAt | timestamp | Creation date |

### `test_results`
| Field | Type | Description |
|-------|------|-------------|
| testId | string | Test document ID |
| studentId | string | Student UID |
| score | number | Score achieved |
| totalMarks | number | Out of total |
| percentage | number | Score percentage |
| correctCount | number | Correct answers |
| wrongCount | number | Wrong answers |
| answers | array | Student's answers |
| submittedAt | timestamp | Submission time |

### `notifications`
| Field | Type | Description |
|-------|------|-------------|
| userId | string | Target user UID |
| type | string | Notification type |
| title | string | Title |
| message | string | Body |
| read | boolean | Read status |
| createdAt | timestamp | Creation date |

### `activity_logs`
| Field | Type | Description |
|-------|------|-------------|
| userId | string | Actor UID |
| action | string | Action code |
| details | string | Description |
| timestamp | timestamp | When it happened |

## Recommended Indexes

| Collection | Fields | Order |
|-----------|--------|-------|
| `attendance` | `courseId`, `studentId`, `date` | ASC |
| `enrollments` | `studentId`, `courseId` | ASC |
| `test_results` | `testId`, `studentId` | ASC |
| `users` | `role`, `createdAt` | DESC |

## Performance Best Practices

- Use `aggTotalClasses` / `aggTotalPresent` on user docs for O(1) attendance percentages
- Use `getCountFromServer()` for counts instead of fetching full collections
- Batch writes in chunks of 500 documents
- Client-side sorting for queries that would require composite indexes
- Cache frequently accessed user and course data in-memory
