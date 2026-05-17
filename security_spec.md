# Neur0n Mesh Security Specification

## Data Invariants
1. A User profile must be owned by the authenticated user (`uid` matches `request.auth.uid`).
2. User emails must be valid strings.
3. The health check is a public read-only sentinel.

## The Dirty Dozen Payloads (Rejection Targets)
1. Unauthorized profile creation (wrong UID).
2. Profile update changing immutable `uid`.
3. Health check write attempt.
4. Profile with massive string injection in `displayName`.
5. Profile missing `email` field.
6. Spoofed `lastLogin` (not server timestamp).
7. Profile with extra unknown fields (shadow fields).
8. Read attempt on private mesh nodes (default deny).
9. Update attempt by non-authenticated user.
10. Update attempt on another user's profile.
11. Large array injection (resource exhaustion).
12. Identity poisoning via special characters in ID.

## Implementation logic
- Use `isValidUser` helper.
- Enforce `affectedKeys().hasOnly()` on updates.
- Validate `request.time` for timestamps.
