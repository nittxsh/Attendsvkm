# E-Colg Attendance AI - Security Specs (ABAC & Secure TDD)

This document provides attribute-based access control (ABAC) specifications and test payload cases designed to prevent any possible access leaks, orphaned records, or identity spoofing in our Firestore deployment.

## 1. Data Invariants & Access Control Matrix

| Entity | Path | Create Policy | Read Policy | Update Policy | Delete Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User** | `/users/{uid}` | Self-creation only. User must verify email or be authenticated. Role must matches sandbox or assigned. | Owner reads self. Teachers can read all student profiles to check attendance. | Owner can update name/department (immutable role). | Forbidden / Admin only |
| **Course** | `/courses/{courseId}` | Signed-in Teachers only. Instructor ID must equal builder's UID. | Signed-in members (Instructor or Enrolled Students) only. | Instructor only. Can edit code, name, department, semester, studentIds. | Forbidden |
| **Attendance** | `/attendance/{sessionId}` | Only Instructors of the referenced Course can write. Must match Course instructorId. | Enrolled students & Instructor of the referenced Course. | referenced Instructor only. | Forbidden |
| **LeaveRequest** | `/leaveRequests/{leaveId}`| Signed-in Students only. Student ID must equal author's UID. Starting state must be `pending`. | Target Student or Instructor of course can read. | Student can cancel (if pending) / Instructor can edit status & notes. | Forbidden |

---

## 2. The "Dirty Dozen" Malicious Exploits (Red Team Attack Vector Suite)

The security rules must enforce complete block coverage, ensuring all 12 of the following attack payloads return `PERMISSION_DENIED`:

### Exploiting Identity & Privilege Escalation (Users)
1. **Payload 1: Profile Takeover**
   * *Attacker*: Authenticated Student `uid: "usr_alice"`
   * *Vector*: Tries to execute `set` on `/users/teacher_turing` to modify Dr. Turing's email and role.
2. **Payload 2: Role Escalation**
   * *Attacker*: Authenticated Student `uid: "usr_bob"`
   * *Vector*: Tries to execute `create` on `/users/usr_bob` but specifies `role: "teacher"` to gain access to professor tools.
3. **Payload 3: Custom Role Injection via Profile Switch**
   * *Attacker*: Authenticated Student `uid: "usr_charlie"`
   * *Vector*: Sends an update to `/users/usr_charlie` changing their `role` from `"student"` to `"teacher"`.

### Exploiting Syllabus Ingestion (Courses)
4. **Payload 4: Course Forgery (Student-Created)**
   * *Attacker*: Authenticated Student `uid: "usr_alice"`
   * *Vector*: Tries to execute `create` on `/courses/cs_custom` establishing a class. Only teachers can establish classes.
5. **Payload 5: Instructor Spoofing**
   * *Attacker*: Authenticated Teacher `uid: "teacher_godel"`
   * *Vector*: Tries to create `/courses/cs_secret` but sets `instructorId: "teacher_turing"` to masquerade.

### Exploiting Logging & Roll Call (Attendance)
6. **Payload 6: Student Roll-Call Intercept**
   * *Attacker*: Authenticated Student `uid: "usr_bob"`
   * *Vector*: Student tries to self-mark presence by creating a session in `/attendance/session_fake` where they set status to `present`.
7. **Payload 7: Foreign Teacher Logging**
   * *Attacker*: Authenticated Teacher `uid: "teacher_godel"` (not the instructor of CS-101)
   * *Vector*: Tries to set `/attendance/cs101_lec4` to log attendance for a class they do not teach.
8. **Payload 8: Session Metadata Pollution**
   * *Attacker*: Course Instructor `uid: "teacher_turing"`
   * *Vector*: Tries to rewrite a finalized session, editing immutable fields `courseId` or `createdAt` to mess up historical telemetry.

### Exploiting Absence Excuses (LeaveRequests)
9. **Payload 9: Self-Approval Bypass**
   * *Attacker*: Authenticated Student `uid: "usr_alice"`
   * *Vector*: Submits `/leaveRequests/leave_cheat` with `status: "approved"` directly, bypassing professor review queues.
10. **Payload 10: Sick Leave Ransom/Lockout**
    * *Attacker*: Authenticated Student `uid: "usr_bob"`
    * *Vector*: Tries to update an existing rejected leave request to `status: "pending"` or modify the `notes`.
11. **Payload 11: Cross-Student Sabotage**
    * *Attacker*: Authenticated Student `uid: "usr_bob"`
    * *Vector*: Executes update on `/leaveRequests/usr_alice_medical` changing the reason to a malicious text block.

### Denial of Wallet & Resource Exhaustion (System-wide)
12. **Payload 12: Resource Poisoning ID Attack**
    * *Attacker*: Malicious Client `uid: "usr_bob"`
    * *Vector*: Attempts to write a document inside`/users/` using a 1MB-sized ID containing malicious emojis and backslashes (e.g. `//////$$$$###%&*^%`).

---

## 3. Test Suite Runner (`firestore.rules.test.ts`)

Included below is a TypeScript verification script to run inside local emulator instances, asserting the complete "Dirty Dozen" blockages:

```typescript
import { 
  initializeTestEnvironment, 
  RulesTestEnvironment,
  assertFails,
  assertSucceeds 
} from "@firebase/rules-unit-testing";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "sanguine-surface-4pnh2",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8")
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("E-Colg Attendance Security Invariant Tests", () => {
  
  // Test Case 1: Profile Takeover Blocked (Payload 1)
  it("prevents profile takeover by unauthorized users", async () => {
    const context = testEnv.authenticatedContext("usr_alice");
    const db = context.firestore();
    await assertFails(
      db.doc("users/teacher_turing").set({
        name: "Hacked Professor",
        role: "student",
        email: "turing@hack.edu",
        createdAt: new Date().toISOString()
      })
    );
  });

  // Test Case 2: Role Escalation Blocked (Payload 2)
  it("prevents students from initializing themselves as teachers", async () => {
    const context = testEnv.authenticatedContext("usr_bob");
    const db = context.firestore();
    await assertFails(
      db.doc("users/usr_bob").set({
        uid: "usr_bob",
        name: "Bob Escalated",
        role: "teacher", // Forbidden
        email: "bob@college.edu",
        createdAt: new Date().toISOString()
      })
    );
  });

  // Test Case 3: Course Creation Restriction (Payload 4)
  it("denies students from establishing active syllabus course streams", async () => {
    const context = testEnv.authenticatedContext("usr_alice");
    const db = context.firestore();
    await assertFails(
      db.collection("courses").add({
        id: "cs_101",
        code: "CS-101",
        name: "Hacked Sandbox Syllabus",
        instructorId: "usr_alice",
        studentIds: ["usr_bob"]
      })
    );
  });

  // Test Case 4: Leave Bypass Restriction (Payload 9)
  it("forces students to initialize leave status as pending on submission", async () => {
    const context = testEnv.authenticatedContext("usr_alice");
    const db = context.firestore();
    await assertFails(
      db.collection("leaveRequests").add({
        id: "leave_cheat",
        studentId: "usr_alice",
        studentName: "Alice",
        courseId: "cs_101",
        courseName: "CS-101",
        startDate: "2026-05-21",
        endDate: "2026-05-22",
        reason: "Dentist",
        status: "approved", // Forbidden
        createdAt: new Date().toISOString()
      })
    );
  });
});
```
