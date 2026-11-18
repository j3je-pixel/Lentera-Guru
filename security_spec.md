# Security Specification — Lentera Guru (Multi-User RBAC)

## Data Invariants
1. Every document across the 10 teaching data collections (`classes`, `subjects`, `students`, `gradingCategories`, `academicGrades`, `attitudeAssessments`, `teachingJournals`, `studentAttendance`, `lessonSlots`, `teachingSchedules`) MUST belong to an authenticated user (`ownerId == request.auth.uid`).
2. `ownerId` and `createdAt` are immutable once created (`incoming().ownerId == existing().ownerId`, `incoming().createdAt == existing().createdAt`).
3. All `createdAt` and `updatedAt` timestamps MUST equal `request.time`.
4. All document IDs MUST match `^[a-zA-Z0-9_-]+$` and be `<= 128` chars.
5. Multi-User RBAC (`/users/{userId}` and `/admins/{userId}`):
   - User profiles contain PII (`email`, `nip`) and MUST ONLY be readable (`get`) by the owning user (`request.auth.uid == userId`) or an Administrator (`isAdmin()`). Blanket `isSignedIn()` reads are forbidden.
   - Self-registration of `/users/{uid}` is strictly restricted to `role == 'guru'` and `status == 'active'` (except the bootstrap admin email or an existing Administrator provisioning another user).
   - Non-admin users can ONLY update non-privileged profile fields (`displayName`, `nip`, `subjectSpecialty`, `updatedAt`) on their own `/users/{uid}` document and CANNOT elevate `role` or modify `status`, `uid`, `email`, or `createdAt`.
   - Only Administrators (`isAdmin()`) may promote/demote roles, update account `status` (`active` / `inactive`), create other users' `/users/{userId}` documents, or manage `/admins/{userId}`.
6. Relational integrity:
   - `Student` requires existing owned `SchoolClass`.
   - `GradingCategory` requires existing owned `Subject`.
   - `AcademicGrade` requires existing owned `SchoolClass`, `Subject`, `GradingCategory`, and `Student`.
   - `AttitudeAssessment` requires existing owned `SchoolClass`, `Subject`, and `Student`.
   - `TeachingJournal` requires existing owned `SchoolClass` and `Subject`.
   - `StudentAttendance` requires existing owned `TeachingJournal` (via `getAfter`/`existsAfter`), `SchoolClass`, `Subject`, and `Student`.
   - `TeachingSchedule` requires existing owned `LessonSlot`, `SchoolClass`, and `Subject`.

## Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Creating `/classes/c1` or `/users/u1` with `request.auth == null`.
2. **Self-Assigned Admin Escalation**: Regular user creating `/users/{myUid}` with `role: "admin"` or writing to `/admins/{myUid}`.
3. **Role Tampering on Update**: Guru updating `/users/{myUid}` to change `role: "admin"` or `status: "active"` after deactivation.
4. **PII Cross-User Scraping**: Guru A calling `get` or `list` on `/users/{guruBUid}` or listing `/users` without `uid == request.auth.uid`.
5. **Identity Spoofing**: Creating `/classes/c1` with `ownerId: "victim_uid"` while signed in as `"attacker_uid"`.
6. **Shadow Field Injection**: Creating `/subjects/s1` or `/users/{myUid}` with an extra undeclared field `isVerified: true` or `superAdmin: true`.
7. **ID Poisoning**: Creating `/students/../../admin_override` or a 500-char document ID.
8. **Client Timestamp Forgery**: Creating `/classes/c1` with `createdAt` set to a forged past timestamp instead of `request.time`.
9. **Immutable Field Tampering**: Updating `/classes/c1` to change `ownerId` or `/users/u1` to change `uid` or `email`.
10. **Out-of-Bounds Grade Score**: Creating `/academicGrades/g1` with `score: 150` or `score: -10`.
11. **Orphaned Student Reference**: Creating `/students/st1` referencing a non-existent or foreign-owned `classId`.
12. **Blanket List Scraping**: Listing `/students` without a query filtering `ownerId == request.auth.uid`.
