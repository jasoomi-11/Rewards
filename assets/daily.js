// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBe3E2eSUaDH5rZHguezaHjbxKmRA5QVd4",
  authDomain: "rewards-b8f54.firebaseapp.com",
  projectId: "rewards-b8f54",
  storageBucket: "rewards-b8f54.firebasestorage.app",
  messagingSenderId: "588528777945",
  appId: "1:588528777945:web:6dc9600f1f230e3813dcc8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const spinner = document.getElementById("spinner");
const taskBox = document.getElementById("tasks");

// ---------------- SEQUENCE START ----------------

// 1️⃣ AUTH CHECK (runs once)
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  await prepareUserDoc(user.uid);
  await loadTasks(user.uid);
});

// ---------------- FUNCTIONS ----------------

async function prepareUserDoc(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  const today = new Date().toDateString();
  const now = new Date();

  if (!snap.exists()) {
    await setDoc(ref, {
      usedTasks: [],
      lastTaskDate: today,
      totalClicks: 0,
      weekClicks: 0,
      lastWeekReset: now.toDateString()
    });
    return;
  }

  const data = snap.data();

  // Daily reset
  if (data.lastTaskDate !== today) {
    await updateDoc(ref, {
      usedTasks: [],
      lastTaskDate: today
    });
  }

  // Weekly reset (Sunday 00:00)
  const day = now.getDay(); // 0 = Sunday
  if (day === 0 && data.lastWeekReset !== today) {
    await updateDoc(ref, {
      weekClicks: 0,
      lastWeekReset: today
    });
  }
}

// 2️⃣ FETCH TASKS
async function loadTasks(uid) {
  spinner.style.display = "block";

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const usedTasks = userSnap.data().usedTasks;

  const res = await fetch("../1.json");
  const tasks = await res.json();

  spinner.style.display = "none";

  tasks
    .filter(t => !usedTasks.includes(t.link))
    .forEach(task => createCard(task, uid));
}

// 3️⃣ CREATE CARD
function createCard(task, uid) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <span class="badge">${task.badge}</span>
    <h4>${task.title}</h4>

    <div class="progress">
      <div class="bar"></div>
    </div>

    <button>Go</button>
  `;

  taskBox.appendChild(card);

  startCountdown(card, task, uid);
}

// 4️⃣ COUNTDOWN
function startCountdown(card, task, uid) {
  const bar = card.querySelector(".bar");
  const btn = card.querySelector("button");

  let seconds = 15;
  const interval = setInterval(() => {
    seconds--;
    bar.style.width = `${((15 - seconds) / 15) * 100}%`;

    if (seconds <= 0) {
      clearInterval(interval);
      btn.style.display = "block";
    }
  }, 1000);

  btn.onclick = async () => {
    btn.disabled = true;

    // redirect first
    window.open(task.link, "_self");

    // store data
    const ref = doc(db, "users", uid);
    await updateDoc(ref, {
      usedTasks: arrayUnion(task.link),
      totalClicks: increment(1),
      weekClicks: increment(1)
    });

    // remove card instantly
    card.remove();
  };
}