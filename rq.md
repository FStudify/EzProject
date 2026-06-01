# BUG FIX TASK: GROUP STILL APPEARS AFTER LEAVING AND RELOADING

## BUG DESCRIPTION

Current behavior:

1. User joins a group.
2. User clicks "Leave Group".
3. Group disappears immediately from sidebar.
4. User refreshes page.
5. Group appears again in sidebar.

This is incorrect.

Expected behavior:

After a user leaves a group:

* Membership must be removed from database.
* User must no longer belong to that group.
* Sidebar must not show the group.
* API must not return the group.
* Refreshing page must not restore the group.
* Re-login must not restore the group.

The leave operation must be permanent.

---

# IMPORTANT

Do NOT patch the UI only.

Do NOT hide the group with frontend filtering.

Find and fix the root cause.

---

# ROOT CAUSE ANALYSIS REQUIRED

Before changing code:

Analyze:

1. Leave Group API
2. Group Membership table
3. Group queries
4. Sidebar queries
5. React Query cache
6. Socket updates
7. Backend services
8. Database transactions

Determine:

* Is membership actually deleted?
* Is membership soft deleted?
* Is membership restored accidentally?
* Is query returning all groups instead of joined groups?
* Is cache stale?
* Is General sync logic recreating memberships?
* Is group membership filtering broken?

Document findings before fixing.

---

# DATABASE VALIDATION

Verify GroupMember records.

Example:

Before leave:

GroupMember

{
groupId: 1
userId: 10
role: MEMBER
}

After leave:

Record must be removed
OR

marked inactive according to existing architecture.

Verify database state directly.

Do not assume.

---

# BACKEND VALIDATION

Audit:

Leave Group endpoint.

Possible issues:

* Membership not deleted.
* Transaction rollback.
* Wrong userId.
* Wrong groupId.
* Soft delete not respected.
* Cache layer issue.

Fix root cause.

---

# GROUP QUERY VALIDATION

Audit all group-fetching APIs.

Common bug:

Current query:

SELECT * FROM ChatGroup

Expected:

Only return groups where:

Current user is active member.

Pseudo:

SELECT groups
FROM ChatGroup
JOIN GroupMember
ON ...
WHERE userId = currentUser
AND membership is active

Verify all APIs.

---

# SIDEBAR VALIDATION

Sidebar must use:

Current user's memberships.

Never use:

All project groups.

Never use:

Groups created by project.

Never use:

Unfiltered group lists.

Verify query source.

---

# REACT QUERY VALIDATION

After leave:

Must:

* Invalidate group queries
* Invalidate sidebar queries
* Refresh memberships

Verify:

query keys

cache invalidation

optimistic updates

stale data handling

---

# SOCKET VALIDATION

If sockets exist:

After leave emit:

group.member.left

Clients must:

Remove group from sidebar immediately.

Verify socket flow.

---

# GENERAL GROUP EXCEPTION

General group rules remain unchanged.

Do NOT break:

Automatic membership sync.

Do NOT break:

Project member synchronization.

Only fix normal groups.

---

# TEST CASES

Case 1

User joins group.

User leaves group.

Refresh page.

Expected:

Group does not return.

---

Case 2

Leave group.

Logout.

Login.

Expected:

Group does not return.

---

Case 3

Leave group.

Open another browser.

Expected:

Group not visible.

---

Case 4

Leave group.

Check database.

Expected:

Membership removed.

---

Case 5

Leave group.

Call group list API.

Expected:

Group not returned.

---

Case 6

Leave group.

Socket update received.

Expected:

Sidebar updates instantly.

---

# FINAL VALIDATION

Before finishing:

1. Verify database state.
2. Verify API response.
3. Verify sidebar state.
4. Verify React Query cache.
5. Verify refresh behavior.
6. Verify re-login behavior.
7. Verify socket behavior.
8. Verify no regression in chat module.

Provide:

* Root cause found
* Files modified
* Why each file changed
* Evidence that membership no longer returns after reload
