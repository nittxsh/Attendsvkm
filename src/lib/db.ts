import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc as fbUpdateDoc, 
  deleteDoc as fbDeleteDoc,
  getDocFromServer,
  addDoc
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { 
  User, 
  Course, 
  AttendanceSession, 
  LeaveRequest, 
  UserRole,
  AttendanceStatus,
  LeaveStatus
} from "../types";
import { 
  DEFAULT_USERS, 
  DEFAULT_COURSES, 
  DEFAULT_ATTENDANCE_SESSIONS, 
  DEFAULT_LEAVE_REQUESTS 
} from "../initialData";

// Firestore Error Information conforming to strict requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

// Global handleFirestoreError required by skill guidelines
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth ? auth.currentUser?.uid : "N/A",
      email: auth ? auth.currentUser?.email : "N/A",
      emailVerified: auth ? auth.currentUser?.emailVerified : false,
      isAnonymous: auth ? auth.currentUser?.isAnonymous : false,
    },
    operationType,
    path
  };
  console.error("Firestore Policy Alert: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Determine if real Firebase config is available
export const isCloudEnabled = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5);

let app: any = null;
export let db: any = null;
export let auth: any = null;

if (isCloudEnabled) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Validate connection on boot as demanded
    getDocFromServer(doc(db, "test", "connection")).catch((err) => {
      console.warn("Firebase testing database connected: fallback elements are live", err);
    });
  } catch (err) {
    console.warn("Could not initialze Google Firebase. Running local Sandbox instead.", err);
  }
}

// -----------------------------------------------------------------------------
// LOCALSTORAGE SANDBOX IMPLEMENTATION
// -----------------------------------------------------------------------------
const STORAGE_PREFIX = "colg_attn_";

function getLocalData<T>(key: string, defaultVal: T): T {
  const data = localStorage.getItem(STORAGE_PREFIX + key);
  if (!data) {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultVal;
  }
}

function setLocalData<T>(key: string, value: T): void {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}

// Dynamic state helpers for high-responsiveness
export const dbService = {
  // Check Mode
  isCloud() {
    return isCloudEnabled;
  },

  // Users Auth & Management
  async getCurrentUserProfile(uid: string): Promise<User | null> {
    if (isCloudEnabled && db) {
      const path = `users/${uid}`;
      try {
        const d = await getDoc(doc(db, "users", uid));
        return d.exists() ? (d.data() as User) : null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    } else {
      const users = getLocalData<User[]>("users", DEFAULT_USERS);
      return users.find(u => u.uid === uid) || null;
    }
  },

  async saveUserProfile(user: User): Promise<void> {
    if (isCloudEnabled && db) {
      const path = `users/${user.uid}`;
      try {
        await setDoc(doc(db, "users", user.uid), user);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const users = getLocalData<User[]>("users", DEFAULT_USERS);
      const filtered = users.filter(u => u.uid !== user.uid);
      filtered.push(user);
      setLocalData("users", filtered);
    }
  },

  async getAllUsersByRole(role: UserRole): Promise<User[]> {
    if (isCloudEnabled && db) {
      const path = "users";
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const results: User[] = [];
        querySnapshot.forEach((doc) => {
          results.push(doc.data() as User);
        });
        return results.filter(u => u.role === role);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      const users = getLocalData<User[]>("users", DEFAULT_USERS);
      return users.filter(u => u.role === role);
    }
  },

  // Courses
  async getCourses(): Promise<Course[]> {
    if (isCloudEnabled && db) {
      const path = "courses";
      try {
        const qs = await getDocs(collection(db, "courses"));
        const list: Course[] = [];
        qs.forEach((d) => list.push(d.data() as Course));
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      return getLocalData<Course[]>("courses", DEFAULT_COURSES);
    }
  },

  async saveCourse(course: Course): Promise<void> {
    if (isCloudEnabled && db) {
      const path = `courses/${course.id}`;
      try {
        await setDoc(doc(db, "courses", course.id), course);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const list = getLocalData<Course[]>("courses", DEFAULT_COURSES);
      const filtered = list.filter(c => c.id !== course.id);
      filtered.push(course);
      setLocalData("courses", filtered);
    }
  },

  // Attendance Sessions
  async getAttendanceSessions(): Promise<AttendanceSession[]> {
    if (isCloudEnabled && db) {
      const path = "attendance";
      try {
        const qs = await getDocs(collection(db, "attendance"));
        const list: AttendanceSession[] = [];
        qs.forEach((d) => list.push(d.data() as AttendanceSession));
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      return getLocalData<AttendanceSession[]>("attendance", DEFAULT_ATTENDANCE_SESSIONS);
    }
  },

  async saveAttendanceSession(session: AttendanceSession): Promise<void> {
    if (isCloudEnabled && db) {
      const path = `attendance/${session.id}`;
      try {
        await setDoc(doc(db, "attendance", session.id), session);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const list = getLocalData<AttendanceSession[]>("attendance", DEFAULT_ATTENDANCE_SESSIONS);
      const filtered = list.filter(s => s.id !== session.id);
      filtered.push(session);
      setLocalData("attendance", filtered);
    }
  },

  // Leave Requests
  async getLeaveRequests(): Promise<LeaveRequest[]> {
    if (isCloudEnabled && db) {
      const path = "leaveRequests";
      try {
        const qs = await getDocs(collection(db, "leaveRequests"));
        const list: LeaveRequest[] = [];
        qs.forEach((d) => list.push(d.data() as LeaveRequest));
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      return getLocalData<LeaveRequest[]>("leaveRequests", DEFAULT_LEAVE_REQUESTS);
    }
  },

  async saveLeaveRequest(req: LeaveRequest): Promise<void> {
    if (isCloudEnabled && db) {
      const path = `leaveRequests/${req.id}`;
      try {
        await setDoc(doc(db, "leaveRequests", req.id), req);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const list = getLocalData<LeaveRequest[]>("leaveRequests", DEFAULT_LEAVE_REQUESTS);
      const filtered = list.filter(r => r.id !== req.id);
      filtered.push(req);
      setLocalData("leaveRequests", filtered);
    }
  },

  // Utility to fully reset simulation to default state (excellent user control!)
  resetToDefaults() {
    localStorage.removeItem(STORAGE_PREFIX + "users");
    localStorage.removeItem(STORAGE_PREFIX + "courses");
    localStorage.removeItem(STORAGE_PREFIX + "attendance");
    localStorage.removeItem(STORAGE_PREFIX + "leaveRequests");
    window.location.reload();
  }
};
