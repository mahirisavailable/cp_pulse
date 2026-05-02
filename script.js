const STORAGE_KEY = "cp-pulse-state";
const DEFAULT_TOPIC_TARGET = "Add a fresh revision note after your next practice block.";
const DEFAULT_DIFFICULTIES = ["1000", "1200", "1400", "1600", "1800", "Medium"];

const defaultState = {
  weeklyGoal: 30,
  ratingGoal: 1000,
  contestGoal: 3,
  sessions: [
    {
      name: "Grid BFS Refresh",
      date: "2026-05-02",
      overallTime: "1h 50m",
      note: "Revised BFS on grids and finally got more comfortable with multi-source traversal.",
      problems: [
        { name: "Labyrinth Escape", platform: "Codeforces", difficulty: "1200", topics: ["graphs", "bfs", "grids"] },
        { name: "Signal Relay", platform: "Codeforces", difficulty: "1400", topics: ["graphs", "shortest path"] },
        { name: "Array Paint", platform: "Codeforces", difficulty: "1000", topics: ["implementation"] }
      ]
    },
    {
      name: "AtCoder Search Practice",
      date: "2026-05-01",
      overallTime: "1h 25m",
      note: "Solved one answer-space binary search problem after two failed attempts.",
      problems: [
        { name: "Cut the Wood", platform: "AtCoder", difficulty: "1300", topics: ["binary search", "sorting"] },
        { name: "Prefix Threshold", platform: "AtCoder", difficulty: "1500", topics: ["binary search", "prefix sums"] }
      ]
    }
  ],
  topics: [
    { name: "Graphs", mastery: 72, target: "Revise shortest path templates" },
    { name: "Dynamic Programming", mastery: 61, target: "Practice state compression" },
    { name: "Binary Search", mastery: 78, target: "Push more answer-space questions" },
    { name: "Greedy", mastery: 66, target: "Spot proof patterns faster" },
    { name: "Number Theory", mastery: 49, target: "Rebuild modular arithmetic basics" },
    { name: "Trees", mastery: 58, target: "Practice rerooting and LCA" },
    { name: "Strings", mastery: 43, target: "Start prefix-function practice" }
  ]
};

const dashboard = document.getElementById("dashboard");
const heroStats = document.getElementById("heroStats");
const topicGrid = document.getElementById("topicGrid");
const sessionFeed = document.getElementById("sessionFeed");
const goalGrid = document.getElementById("goalGrid");
const goalForm = document.getElementById("goalForm");
const revisionList = document.getElementById("revisionList");
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataBtn = document.getElementById("importDataBtn");
const importFileInput = document.getElementById("importFileInput");
const statCardTemplate = document.getElementById("statCardTemplate");
const practiceLog = document.getElementById("practiceLog");
const saveSessionBtn = document.getElementById("saveSessionBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const focusTopic = document.getElementById("focusTopic");
const focusMessage = document.getElementById("focusMessage");
const focusMeter = document.getElementById("focusMeter");
const focusPercent = document.getElementById("focusPercent");
const streakBadge = document.getElementById("streakBadge");
const problemEntries = document.getElementById("problemEntries");

const formFields = {
  sessionName: document.getElementById("sessionName"),
  sessionDate: document.getElementById("sessionDate"),
  overallTime: document.getElementById("overallTime"),
  problemCount: document.getElementById("problemCount"),
  sessionNote: document.getElementById("sessionNote")
};

const goalFields = {
  weeklyGoal: document.getElementById("weeklyGoalInput"),
  ratingGoal: document.getElementById("ratingGoalInput"),
  contestGoal: document.getElementById("contestGoalInput")
};

let editingSessionId = null;

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTag(tag) {
  return tag.trim().replace(/\s+/g, " ").toLowerCase();
}

function titleizeTag(tag) {
  return tag
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseTopics(rawValue) {
  return [...new Set(rawValue.split(",").map(normalizeTag).filter(Boolean))];
}

function getSessionProblemCount(session) {
  if (Array.isArray(session.problems) && session.problems.length) {
    return session.problems.length;
  }

  return Number(session.problemsSolved) || 0;
}

function normalizeSession(session) {
  if (Array.isArray(session.problems) && session.problems.length) {
    return {
      id: session.id || createSessionId(),
      name: session.name || "Practice Session",
      date: session.date,
      overallTime: session.overallTime || "",
      note: session.note || "",
      problems: session.problems.map((problem) => ({
        name: String(problem.name || "").trim() || "Untitled Problem",
        platform: problem.platform || session.platform || "Other",
        difficulty: String(problem.difficulty || "").trim() || "Unspecified",
        topics: Array.isArray(problem.topics)
          ? [...new Set(problem.topics.map(normalizeTag).filter(Boolean))]
          : parseTopics(String(problem.topic || session.topic || ""))
      }))
    };
  }

  const fallbackTopic = normalizeTag(session.topic || "general practice");
  const fallbackDifficulty = String(session.difficulty || "Unspecified").trim() || "Unspecified";
  const problemCount = Math.max(1, Number(session.problemsSolved) || 1);

  return {
    id: session.id || createSessionId(),
    name: session.name || "Practice Session",
    date: session.date,
    overallTime: session.overallTime || "",
    note: session.note || "",
    problems: Array.from({ length: problemCount }, (_, index) => ({
      name: `Problem ${index + 1}`,
      platform: session.platform || "Other",
      difficulty: fallbackDifficulty,
      topics: [fallbackTopic]
    }))
  };
}

function normalizeState(rawState) {
  return {
    weeklyGoal: rawState.weeklyGoal ?? defaultState.weeklyGoal,
    ratingGoal: rawState.ratingGoal ?? defaultState.ratingGoal,
    contestGoal: rawState.contestGoal ?? defaultState.contestGoal,
    sessions: (rawState.sessions || defaultState.sessions).map(normalizeSession),
    topics: (rawState.topics || defaultState.topics).map((topic) => ({
      name: topic.name,
      mastery: Number(topic.mastery) || 0,
      target: topic.target || DEFAULT_TOPIC_TARGET
    }))
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return normalizeState(structuredClone(defaultState));

  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return normalizeState(structuredClone(defaultState));
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getExportPayload() {
  return {
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    data: state
  };
}

function getLocalDateValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().split("T")[0];
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function sortSessions() {
  state.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getCurrentWeekSolved() {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);

  return state.sessions
    .filter((session) => new Date(session.date) >= start)
    .reduce((sum, session) => sum + getSessionProblemCount(session), 0);
}

function getCurrentMonthSolved() {
  const now = new Date();
  return state.sessions
    .filter((session) => {
      const date = new Date(session.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, session) => sum + getSessionProblemCount(session), 0);
}

function getStreak() {
  const uniqueDates = [...new Set(state.sessions.map((session) => session.date))].sort((a, b) => new Date(b) - new Date(a));
  if (!uniqueDates.length) return 0;

  let streak = 0;
  const cursor = new Date(uniqueDates[0]);
  cursor.setHours(0, 0, 0, 0);

  for (const dateString of uniqueDates) {
    const current = new Date(dateString);
    current.setHours(0, 0, 0, 0);
    if (current.getTime() === cursor.getTime()) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (current.getTime() < cursor.getTime()) {
      break;
    }
  }

  return streak;
}

function getTopTopic() {
  return [...state.topics].sort((a, b) => b.mastery - a.mastery)[0];
}

function getAverageMastery() {
  if (!state.topics.length) return 0;
  const total = state.topics.reduce((sum, topic) => sum + topic.mastery, 0);
  return Math.round(total / state.topics.length);
}

function getEstimatedRating() {
  const totalSolved = state.sessions.reduce((sum, session) => sum + getSessionProblemCount(session), 0);
  const estimate = 800 + totalSolved * 18 + getAverageMastery() * 4;
  return Math.min(state.ratingGoal, estimate);
}

function getContestSessions() {
  return state.sessions.filter((session) =>
    session.problems.some((problem) => /contest/i.test(problem.difficulty))
  ).length;
}

function ensureTopicExists(topicName) {
  const existing = state.topics.find((topic) => topic.name.toLowerCase() === topicName.toLowerCase());
  if (existing) return existing;

  const newTopic = {
    name: titleizeTag(topicName),
    mastery: 35,
    target: DEFAULT_TOPIC_TARGET
  };

  state.topics.push(newTopic);
  return newTopic;
}

function buildStatCard({ label, value, detail }) {
  const fragment = statCardTemplate.content.cloneNode(true);
  fragment.querySelector(".stat-label").textContent = label;
  fragment.querySelector(".stat-value").textContent = value;
  fragment.querySelector(".stat-detail").textContent = detail;
  return fragment;
}

function buildTagList(tags, className = "tag-pill") {
  if (!tags.length) return `<span class="${className}">No Tags</span>`;
  return tags.map((tag) => `<span class="${className}">${titleizeTag(tag)}</span>`).join("");
}

function renderHeroStats() {
  heroStats.innerHTML = "";

  const totalSolved = state.sessions.reduce((sum, session) => sum + getSessionProblemCount(session), 0);
  const totalSessions = state.sessions.length;
  const currentWeekSolved = getCurrentWeekSolved();
  const streak = getStreak();

  [
    {
      label: "Problems Solved",
      value: totalSolved,
      detail: "Total accepted problems in your tracker"
    },
    {
      label: "Practice Logs",
      value: totalSessions,
      detail: "Sessions recorded across your journey"
    },
    {
      label: "This Week",
      value: currentWeekSolved,
      detail: `Chasing your ${state.weeklyGoal}-problem weekly target`
    },
    {
      label: "Active Streak",
      value: `${streak}d`,
      detail: "Consecutive practice days"
    }
  ].forEach((item) => heroStats.appendChild(buildStatCard(item)));
}

function renderDashboard() {
  dashboard.innerHTML = "";
  const totalSolved = state.sessions.reduce((sum, session) => sum + getSessionProblemCount(session), 0);
  const contestSessions = getContestSessions();
  const averagePerSession = state.sessions.length ? (totalSolved / state.sessions.length).toFixed(1) : "0.0";
  const monthSolved = getCurrentMonthSolved();

  [
    {
      label: "Avg / Session",
      value: averagePerSession,
      detail: "Solved problems per logged session"
    },
    {
      label: "Monthly Solves",
      value: monthSolved,
      detail: "Problems tracked this month"
    },
    {
      label: "Contest Reps",
      value: contestSessions,
      detail: `Sessions tagged as contest toward ${state.contestGoal}`
    },
    {
      label: "Best Topic",
      value: getTopTopic().name,
      detail: `${getTopTopic().mastery}% confidence right now`
    }
  ].forEach((item) => dashboard.appendChild(buildStatCard(item)));
}

function renderSessions() {
  sortSessions();
  sessionFeed.innerHTML = "";

  state.sessions.slice(0, 6).forEach((session) => {
    const item = document.createElement("article");
    item.className = "session-item";

    const problemSummary = session.problems
      .map((problem) => `
        <div class="problem-entry">
          <strong>${problem.name || "Untitled Problem"}</strong>
          <div class="problem-summary">
            <span class="tag-pill">${problem.platform || "Other"}</span>
            <span class="tag-pill">${problem.difficulty || "Unspecified"}</span>
            ${buildTagList(problem.topics)}
          </div>
        </div>
      `)
      .join("");

    item.innerHTML = `
      <div class="session-header">
        <div>
          <h3>${session.name || "Practice Session"}</h3>
          <p class="session-meta">${getSessionProblemCount(session)} problem${getSessionProblemCount(session) === 1 ? "" : "s"} - ${session.overallTime || "Time not set"}</p>
        </div>
        <strong>${formatDate(session.date)}</strong>
      </div>
      <div class="session-note">${problemSummary}</div>
      <p class="session-note">${session.note || "No note added for this session."}</p>
      <div class="session-actions">
        <button class="secondary-button" type="button" data-action="edit-session" data-session-id="${session.id}">Edit</button>
        <button class="ghost-button" type="button" data-action="delete-session" data-session-id="${session.id}">Delete</button>
      </div>
    `;
    sessionFeed.appendChild(item);
  });
}

function renderTopics() {
  topicGrid.innerHTML = "";

  state.topics.forEach((topic) => {
    const card = document.createElement("article");
    card.className = "topic-card";
    card.innerHTML = `
      <div class="topic-topline">
        <h3>${topic.name}</h3>
        <span class="topic-percent">${topic.mastery}% mastery</span>
      </div>
      <p>${topic.target}</p>
      <div class="meter-track">
        <div class="meter-fill" style="width: ${topic.mastery}%"></div>
      </div>
      <label>
        Adjust confidence
        <input type="range" min="0" max="100" value="${topic.mastery}" data-topic="${topic.name}">
      </label>
    `;
    topicGrid.appendChild(card);
  });
}

function renderGoals() {
  goalGrid.innerHTML = "";
  const contestCount = getContestSessions();
  const estimatedRating = getEstimatedRating();

  const goals = [
    {
      name: "Weekly Problem Goal",
      progress: Math.min(100, Math.round((getCurrentWeekSolved() / state.weeklyGoal) * 100)),
      detail: `${getCurrentWeekSolved()} / ${state.weeklyGoal} problems`
    },
    {
      name: "Rating Milestone",
      progress: Math.min(100, Math.round((estimatedRating / state.ratingGoal) * 100)),
      detail: `Estimated ${estimatedRating} toward ${state.ratingGoal}`
    },
    {
      name: "Contest Habit",
      progress: Math.min(100, Math.round((contestCount / state.contestGoal) * 100)),
      detail: `${contestCount} / ${state.contestGoal} contest sessions`
    }
  ];

  goals.forEach((goal) => {
    const card = document.createElement("article");
    card.className = "goal-card";
    card.innerHTML = `
      <h3>${goal.name}</h3>
      <p>${goal.detail}</p>
      <div class="goal-track">
        <div class="goal-fill" style="width: ${goal.progress}%"></div>
      </div>
      <div class="goal-progress">
        <span>progress</span>
        <strong>${goal.progress}%</strong>
      </div>
    `;
    goalGrid.appendChild(card);
  });
}

function syncGoalForm() {
  goalFields.weeklyGoal.value = state.weeklyGoal;
  goalFields.ratingGoal.value = state.ratingGoal;
  goalFields.contestGoal.value = state.contestGoal;
}

function renderRevisionList() {
  revisionList.innerHTML = "";

  [...state.topics]
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4)
    .forEach((topic) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <div>
          <strong>${topic.name}</strong>
          <p>${topic.target}</p>
        </div>
        <span class="revision-tag">${topic.mastery}% ready</span>
      `;
      revisionList.appendChild(item);
    });
}

function renderFocusCard() {
  const weakest = [...state.topics].sort((a, b) => a.mastery - b.mastery)[0];
  const strongest = getTopTopic();
  const streak = getStreak();

  focusTopic.textContent = `${weakest.name} needs the next push`;
  focusMessage.textContent = `Your strongest area is ${strongest.name}. Use that confidence, but give extra revision time to ${weakest.name} this week.`;
  focusMeter.style.width = `${weakest.mastery}%`;
  focusPercent.textContent = `${weakest.mastery}% ready`;
  streakBadge.textContent = `${streak} day${streak === 1 ? "" : "s"} streak`;
}

function renderTagPreview(container, value) {
  const tags = parseTopics(value);
  container.innerHTML = buildTagList(tags, "tag-chip");
}

function buildProblemEntry(
  index,
  name = `Problem ${index + 1}`,
  platform = "Codeforces",
  difficulty = DEFAULT_DIFFICULTIES[index % DEFAULT_DIFFICULTIES.length],
  topicText = ""
) {
  return `
    <article class="problem-entry">
      <div class="problem-builder-head">
        <div>
          <p class="panel-label">Problem ${index + 1}</p>
          <h3>Problem details</h3>
        </div>
      </div>
      <div class="problem-entry-grid">
        <label>
          Problem Name
          <input type="text" class="problem-name" value="${name}" placeholder="e.g. Road Reparation" required>
        </label>
        <label>
          Platform
          <select class="problem-platform">
            <option value="Codeforces" ${platform === "Codeforces" ? "selected" : ""}>Codeforces</option>
            <option value="AtCoder" ${platform === "AtCoder" ? "selected" : ""}>AtCoder</option>
            <option value="LeetCode" ${platform === "LeetCode" ? "selected" : ""}>LeetCode</option>
            <option value="CodeChef" ${platform === "CodeChef" ? "selected" : ""}>CodeChef</option>
            <option value="Other" ${platform === "Other" ? "selected" : ""}>Other</option>
          </select>
        </label>
        <label>
          Difficulty
          <input type="text" class="problem-difficulty" list="difficultySuggestions" value="${difficulty}" placeholder="e.g. 1200, Medium, Hard" required>
        </label>
        <label>
          Topic Tags
          <input type="text" class="problem-topics" value="${topicText}" placeholder="graphs, bfs, shortest path" required>
          <div class="tag-preview"></div>
        </label>
      </div>
    </article>
  `;
}

function renderProblemEntries() {
  const count = Math.max(1, Math.min(12, Number(formFields.problemCount.value) || 1));
  const previousEntries = [...problemEntries.querySelectorAll(".problem-entry")].map((entry) => ({
    name: entry.querySelector(".problem-name")?.value || "",
    platform: entry.querySelector(".problem-platform")?.value || "Codeforces",
    difficulty: entry.querySelector(".problem-difficulty")?.value || "",
    topicText: entry.querySelector(".problem-topics")?.value || ""
  }));

  problemEntries.innerHTML = Array.from({ length: count }, (_, index) => {
    const previous = previousEntries[index];
    return buildProblemEntry(index, previous?.name, previous?.platform, previous?.difficulty, previous?.topicText);
  }).join("");

  syncTagPreviews();
}

function syncTagPreviews() {
  problemEntries.querySelectorAll(".problem-entry").forEach((entry) => {
    const topicInput = entry.querySelector(".problem-topics");
    const preview = entry.querySelector(".tag-preview");
    renderTagPreview(preview, topicInput.value);
  });
}

function renderAll() {
  renderHeroStats();
  renderDashboard();
  renderSessions();
  renderTopics();
  renderGoals();
  renderRevisionList();
  renderFocusCard();
  syncGoalForm();
}

function resetFormDefaults() {
  editingSessionId = null;
  practiceLog.reset();
  formFields.sessionDate.value = getLocalDateValue();
  formFields.overallTime.value = "";
  formFields.problemCount.value = 2;
  saveSessionBtn.textContent = "Save Session";
  cancelEditBtn.hidden = true;
  renderProblemEntries();
}

function loadSessionIntoForm(session) {
  editingSessionId = session.id;
  formFields.sessionName.value = session.name || "";
  formFields.sessionDate.value = session.date || getLocalDateValue();
  formFields.overallTime.value = session.overallTime || "";
  formFields.problemCount.value = getSessionProblemCount(session);
  formFields.sessionNote.value = session.note || "";

  problemEntries.innerHTML = session.problems
    .map((problem, index) =>
      buildProblemEntry(
        index,
        problem.name || `Problem ${index + 1}`,
        problem.platform || "Other",
        problem.difficulty || "Unspecified",
        (problem.topics || []).join(", ")
      )
    )
    .join("");

  saveSessionBtn.textContent = "Update Session";
  cancelEditBtn.hidden = false;
  syncTagPreviews();
  practiceLog.scrollIntoView({ behavior: "smooth", block: "start" });
}

practiceLog.addEventListener("submit", (event) => {
  event.preventDefault();

  const problemDetails = [...problemEntries.querySelectorAll(".problem-entry")].map((entry) => ({
    name: entry.querySelector(".problem-name").value.trim() || "Untitled Problem",
    platform: entry.querySelector(".problem-platform").value,
    difficulty: entry.querySelector(".problem-difficulty").value.trim() || "Unspecified",
    topics: parseTopics(entry.querySelector(".problem-topics").value)
  }));

  const newSession = {
    id: editingSessionId || createSessionId(),
    name: formFields.sessionName.value.trim() || "Practice Session",
    date: formFields.sessionDate.value,
    overallTime: formFields.overallTime.value.trim(),
    note: formFields.sessionNote.value.trim(),
    problems: problemDetails
  };

  if (editingSessionId) {
    const sessionIndex = state.sessions.findIndex((session) => session.id === editingSessionId);
    if (sessionIndex !== -1) {
      state.sessions[sessionIndex] = newSession;
    } else {
      state.sessions.unshift(newSession);
    }
  } else {
    state.sessions.unshift(newSession);
  }

  if (!editingSessionId) {
    const topicBoosts = new Map();
    problemDetails.forEach((problem) => {
      problem.topics.forEach((topicTag) => {
        topicBoosts.set(topicTag, (topicBoosts.get(topicTag) || 0) + 1);
      });
    });

    topicBoosts.forEach((count, topicName) => {
      const topic = ensureTopicExists(topicName);
      topic.mastery = Math.min(100, topic.mastery + Math.max(2, count * 2));
    });
  }

  saveState();
  renderAll();
  resetFormDefaults();
});

topicGrid.addEventListener("input", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "range") return;

  const topicName = input.dataset.topic;
  const trackedTopic = state.topics.find((topic) => topic.name === topicName);
  if (!trackedTopic) return;

  trackedTopic.mastery = Number(input.value);
  saveState();
  renderAll();
});

problemEntries.addEventListener("input", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.classList.contains("problem-topics")) return;

  const preview = input.closest(".problem-entry")?.querySelector(".tag-preview");
  if (preview) renderTagPreview(preview, input.value);
});

formFields.problemCount.addEventListener("input", () => {
  renderProblemEntries();
});

sessionFeed.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const sessionId = target.dataset.sessionId;
  if (!sessionId) return;

  if (target.dataset.action === "edit-session") {
    const session = state.sessions.find((item) => item.id === sessionId);
    if (session) loadSessionIntoForm(session);
    return;
  }

  if (target.dataset.action === "delete-session") {
    const session = state.sessions.find((item) => item.id === sessionId);
    const confirmed = window.confirm(`Delete "${session?.name || "this session"}"?`);
    if (!confirmed) return;

    state.sessions = state.sessions.filter((item) => item.id !== sessionId);
    if (editingSessionId === sessionId) {
      resetFormDefaults();
    }
    saveState();
    renderAll();
  }
});

cancelEditBtn.addEventListener("click", () => {
  resetFormDefaults();
});

goalForm.addEventListener("submit", (event) => {
  event.preventDefault();

  state.weeklyGoal = Math.max(1, Number(goalFields.weeklyGoal.value) || defaultState.weeklyGoal);
  state.ratingGoal = Math.max(1, Number(goalFields.ratingGoal.value) || defaultState.ratingGoal);
  state.contestGoal = Math.max(1, Number(goalFields.contestGoal.value) || defaultState.contestGoal);

  saveState();
  renderAll();
});

exportDataBtn.addEventListener("click", () => {
  const payload = JSON.stringify(getExportPayload(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = getLocalDateValue();

  link.href = url;
  link.download = `cp-pulse-backup-${dateStamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

importDataBtn.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const rawText = await file.text();
    const parsed = JSON.parse(rawText);
    const importedState = parsed?.data ?? parsed;

    if (!importedState || typeof importedState !== "object") {
      throw new Error("Invalid data");
    }

    state = normalizeState(importedState);
    saveState();
    renderAll();
    resetFormDefaults();
    alert("Import successful.");
  } catch {
    alert("Import failed. Please choose a valid CP Pulse JSON backup file.");
  } finally {
    importFileInput.value = "";
  }
});

document.querySelectorAll("[data-scroll-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const selector = button.getAttribute("data-scroll-target");
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

formFields.sessionDate.value = getLocalDateValue();
renderProblemEntries();
renderAll();
