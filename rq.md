# TASK: IMPLEMENT COMPLETE PROJECT MEMBER MANAGEMENT SYSTEM

## Objective

Implement a complete Project Member Management System for EzProject.

The implementation must include:

* Backend
* Database
* API
* Frontend
* State Management
* Socket Events (if used)
* Permission System
* UI/UX
* Integration Testing

The solution must be production-ready.

Do NOT create mock implementations.

Do NOT leave TODO/FIXME comments.

Do NOT break existing modules.

Before making changes, analyze the current architecture and reuse existing patterns whenever possible.

---

# IMPORTANT REQUIREMENTS

Before coding:

1. Analyze current database schema.
2. Analyze current project module.
3. Analyze authentication and authorization flow.
4. Analyze current API patterns.
5. Analyze frontend state management.
6. Analyze current member/project relationship.
7. Analyze notification system if available.

After analysis:

* Reuse existing architecture.
* Avoid duplicate logic.
* Avoid creating parallel systems.
* Maintain backward compatibility.

---

# FEATURE OVERVIEW

Implement a full member management system for projects.

Roles:

```ts
enum ProjectRole {
    OWNER = "OWNER",
    SUPERVISOR = "SUPERVISOR",
    MEMBER = "MEMBER"
}
```

---

# OWNER RULES

The creator of a project automatically becomes OWNER.

There must always be exactly ONE OWNER.

OWNER permissions:

* Edit project
* Delete project
* Invite members
* Generate invite links
* Revoke invitations
* Change member roles
* Promote member to supervisor
* Demote supervisor to member
* Remove members
* Transfer ownership
* Leave project after transferring ownership

---

# SUPERVISOR RULES

SUPERVISOR permissions:

* View all project data
* Create tasks
* Edit tasks
* Assign tasks
* Manage task workflow
* View reports

SUPERVISOR cannot:

* Delete project
* Change member roles
* Remove owner
* Transfer ownership
* Edit project permissions

---

# MEMBER RULES

MEMBER permissions:

* View project
* View assigned tasks
* Update own tasks
* Upload files
* Comment
* Participate in discussions

MEMBER cannot:

* Manage members
* Manage permissions
* Delete project

---

# DATABASE DESIGN

Review existing schema first.

If necessary, create migrations.

Required structure:

```ts
Project
{
    id
    name
    description
    ownerId
    createdAt
    updatedAt
}
```

```ts
ProjectMember
{
    id
    projectId
    userId
    role
    joinedAt
}
```

```ts
enum ProjectRole {
    OWNER,
    SUPERVISOR,
    MEMBER
}
```

Enforce:

* One OWNER per project.
* No duplicate memberships.
* ownerId must match OWNER role.

---

# INVITATION SYSTEM

Implement two invitation methods.

---

## METHOD 1: INVITE LINK

### Create Invite Link

Only OWNER.

API:

```http
POST /projects/:projectId/invite-links
```

Response:

```json
{
    "inviteLink": "https://domain.com/invite/xxxxx"
}
```

---

Invite link table:

```ts
ProjectInviteLink
{
    id
    projectId
    token
    createdBy
    expiresAt
    maxUses
    currentUses
    isActive
}
```

Requirements:

* Unique token.
* Expiration support.
* Usage limit support.
* Ability to revoke.

---

### Join By Invite Link

API:

```http
POST /projects/invite/:token/join
```

Requirements:

* User must be authenticated.
* Cannot join twice.
* Expired links rejected.
* Revoked links rejected.

Default role:

```ts
MEMBER
```

---

# METHOD 2: MANUAL INVITATION

Only OWNER.

Owner can invite by:

* Username
* Email

---

API:

```http
POST /projects/:projectId/invitations
```

Request:

```json
{
    "username": "abc"
}
```

or

```json
{
    "email": "abc@gmail.com"
}
```

---

Invitation table:

```ts
ProjectInvitation
{
    id
    projectId
    invitedBy
    invitedUserId
    invitedEmail
    status
    expiresAt
    createdAt
}
```

```ts
enum InvitationStatus {
    PENDING,
    ACCEPTED,
    DECLINED,
    EXPIRED
}
```

---

# ACCEPT INVITATION

API:

```http
POST /project-invitations/:id/accept
```

Requirements:

* Add user to project.
* Create ProjectMember.
* Set role MEMBER.
* Update invitation status.

---

# DECLINE INVITATION

API:

```http
POST /project-invitations/:id/decline
```

---

# MEMBER MANAGEMENT

Owner can access:

```text
Project Settings
→ Members
```

Display:

* Avatar
* Name
* Email
* Role
* Join Date

---

# CHANGE ROLE

Only OWNER.

API:

```http
PATCH /projects/:projectId/members/:memberId/role
```

Request:

```json
{
    "role": "SUPERVISOR"
}
```

or

```json
{
    "role": "MEMBER"
}
```

Rules:

* Cannot assign OWNER.
* Cannot demote current OWNER.
* Cannot create multiple owners.

---

# REMOVE MEMBER

Only OWNER.

API:

```http
DELETE /projects/:projectId/members/:memberId
```

Rules:

* Cannot remove OWNER.
* Cannot remove non-member.
* Remove access immediately.

After removal:

* Project disappears from sidebar.
* User cannot access project routes.
* API returns 403.

---

# TRANSFER OWNERSHIP

Only OWNER.

API:

```http
POST /projects/:projectId/transfer-ownership
```

Request:

```json
{
    "newOwnerId": "..."
}
```

Rules:

* New owner must already be a member.
* New owner cannot be current owner.
* Transfer must be atomic.

After transfer:

```text
Old Owner → SUPERVISOR
New Owner → OWNER
Project.ownerId updated
```

---

# LEAVE PROJECT

Implement complete leave flow.

---

## MEMBER leaves

Remove membership.

Project disappears immediately.

---

## SUPERVISOR leaves

Remove membership.

Project disappears immediately.

---

## OWNER leaves

If other members exist:

Show modal:

```text
Select a new project owner before leaving.
```

Require ownership transfer first.

Do not allow leave until transfer completed.

---

## OWNER is last member

Show warning:

```text
You are the last member.
Leaving will permanently delete this project.
```

After confirmation:

* Delete project
* Delete memberships
* Delete invite links
* Delete invitations

Handle related records safely.

Use existing cascade strategy if available.

---

# FRONTEND REQUIREMENTS

Create complete UI.

---

## Members Page

Display:

```text
Name
Email
Role
Joined Date
Actions
```

---

## Owner Actions

* Invite Member
* Generate Invite Link
* Copy Invite Link
* Change Role
* Remove Member
* Transfer Ownership

---

## Supervisor Actions

No member-management actions.

Read-only.

---

## Member Actions

Read-only.

---

# INVITATION UI

Create:

```text
Invite Member Modal
```

Tabs:

```text
Invite by Username
Invite by Email
Invite Link
```

---

# INVITATIONS PAGE

Display:

* Pending invitations
* Accepted invitations
* Declined invitations
* Expired invitations

Allow owner to revoke pending invitations.

---

# PROJECT SIDEBAR

After:

* Leave
* Remove member
* Ownership transfer

Refresh state immediately.

No page reload required.

---

# API INTEGRATION

Connect all frontend screens to real backend APIs.

No mock data.

No fake success messages.

All mutations must:

* Update cache
* Refresh affected queries
* Update sidebar state
* Handle errors correctly

---

# AUTHORIZATION

Enforce permissions BOTH:

* Frontend
* Backend

Backend is the source of truth.

Never trust frontend role values.

---

# SOCKET SUPPORT

If socket architecture exists:

Emit events:

```text
project.member.joined
project.member.left
project.member.removed
project.member.role_changed
project.owner.changed
project.invitation.created
```

Update UI in realtime.

If socket module does not exist, do not introduce unnecessary complexity.

---

# TESTING REQUIREMENTS

Verify:

1. Create project.
2. Owner assignment.
3. Invite by username.
4. Invite by email.
5. Invite by link.
6. Accept invitation.
7. Decline invitation.
8. Change role.
9. Remove member.
10. Transfer ownership.
11. Leave project.
12. Delete project when last owner leaves.
13. Sidebar updates.
14. Authorization rules.
15. Existing modules remain functional.

---

# FINAL VALIDATION

Before finishing:

1. Run application.
2. Test all APIs.
3. Test all UI flows.
4. Test permissions.
5. Test project sidebar.
6. Test database updates.
7. Test ownership transfer.
8. Test leave project flow.
9. Ensure no regression in existing modules.

Provide a summary of all modified files and explain why each change was made.
