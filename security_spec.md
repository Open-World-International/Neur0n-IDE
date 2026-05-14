# Neur0n IDE Security Specification

## 1. Data Invariants
- A user can only read and write their own profile in the `/users/` collection.
- The `uid` and `email` fields are immutable after creation.
- Only verified users can write to the mesh database.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a user profile with a different UID.
2. **Email Hijacking**: Attempt to update a user's email field.
3. **Ghost Field Injection**: Attempt to add `isAdmin: true` to a user profile.
4. **Unauthorized Read**: Attempt to read another user's profile.
5. **Unauthorized Write**: Attempt to write to the `users` collection without being signed in.
6. **Path Variable Poisoning**: Using a 1MB string as a `userId` in the document path.
7. **Size Exhaustion**: Sending a 1MB string in the `displayName` field.
8. **Unverified Write**: Attempt to write before email verification.
9. **Mutation after creation**: Attempt to change `uid` on update.
10. **Timestamp Forgery**: Providing a client-side timestamp for `lastLogin`.
11. **Relational Sync Break**: Writing to a user profile that doesn't match the auth token.
12. **Blanket List Query**: Attempting to list all users without a specialized filter.

## 3. Test Runner (Conceptual)
The following tests verify that all the above payloads return `PERMISSION_DENIED`.
- `auth.uid != userId` -> Deny
- `incoming().keys().hasOnly(['field1', ...])` -> Enforce strict schema
- `incoming().email == existing().email` -> Immutability
