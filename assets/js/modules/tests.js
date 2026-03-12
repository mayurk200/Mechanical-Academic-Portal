// ============================================================
// LMS Platform — Tests Module
// Test creation, question bank, test-taking with timer, auto-grading
// ============================================================

import { TestService, ResultService, CourseService } from '../../../services/database.js';
import { showToast, closeModal, formatDate, formatTime, escapeHtml, showConfirm, LMSLogger } from '../core/utils.js';

let currentUser = null;
let timerInterval = null;

export function init(user) {
  currentUser = user;
  if (currentUser.role === 'student') {
    loadStudentView();
  } else {
    loadTeacherView();
  }
}

// ── TEACHER VIEW ─────────────────────────
async function loadTeacherView() {
  document.getElementById('teacher-panel').style.display = 'block';
  document.getElementById('student-panel').style.display = 'none';

  // Load courses for dropdown
  let courses;
  if (currentUser.role === 'admin') {
    courses = await CourseService.getAll();
  } else {
    courses = await CourseService.getByTeacher(currentUser.uid);
  }
  const courseSelect = document.getElementById('test-course');
  courseSelect.innerHTML = '<option value="">Select Course</option>' +
    courses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');

  // Load existing tests
  let tests;
  if (currentUser.role === 'admin') {
    tests = await TestService.getAll();
  } else {
    tests = await TestService.getByCreator(currentUser.uid);
  }
  renderTeacherTests(tests);
  setupCreateTest();
}

function renderTeacherTests(tests) {
  const container = document.getElementById('teacher-tests-list');
  if (tests.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><h3>No tests created yet</h3></div>';
    return;
  }
  container.innerHTML = tests.map(t => `
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h4 style="font-size:1rem;">${escapeHtml(t.title)}</h4>
          <div style="font-size:0.78rem;color:var(--text-muted);display:flex;gap:16px;margin-top:4px;">
            <span>⏱️ ${t.duration} min</span>
            <span>❓ ${t.questions ? t.questions.length : 0} questions</span>
            <span>📊 ${t.totalMarks} marks</span>
            <span>📅 ${formatDate(t.createdAt)}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <a href="result-page.html?testId=${t.id}" class="btn btn-outline btn-sm">📊 Results</a>
          <button class="btn btn-danger btn-sm delete-test" data-id="${t.id}">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.delete-test').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await showConfirm('Delete Test', 'Are you sure you want to delete this test? All results will be lost.', { confirmText: 'Delete', type: 'danger' });
      if (confirmed) {
        try {
          await TestService.delete(btn.dataset.id);
          showToast('Test deleted successfully', 'success');
          loadTeacherView();
        } catch (err) {
          LMSLogger.database('Test deletion failed', err);
          showToast('Failed to delete test: ' + err.message, 'error');
        }
      }
    });
  });
}

function setupCreateTest() {
  let questions = [];

  const addQuestionBtn = document.getElementById('add-question-btn');
  const questionsContainer = document.getElementById('questions-container');
  const createTestForm = document.getElementById('create-test-form');

  addQuestionBtn.addEventListener('click', () => {
    const idx = questions.length;
    questions.push({ question: '', type: 'mcq', options: ['', '', '', ''], correctAnswer: 0, marks: 1 });
    renderQuestionBuilder(questions, questionsContainer);
  });

  function renderQuestionBuilder(qs, container) {
    container.innerHTML = qs.map((q, i) => `
      <div class="question-card" data-index="${i}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div class="question-number">${i + 1}</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <select class="form-control q-type" data-index="${i}" style="width:140px;padding:6px 10px;font-size:0.8rem;">
              <option value="mcq" ${q.type === 'mcq' ? 'selected' : ''}>MCQ</option>
              <option value="truefalse" ${q.type === 'truefalse' ? 'selected' : ''}>True/False</option>
              <option value="short" ${q.type === 'short' ? 'selected' : ''}>Short Answer</option>
            </select>
            <input type="number" class="form-control q-marks" data-index="${i}" value="${q.marks}" min="1" style="width:70px;padding:6px 10px;font-size:0.8rem;" placeholder="Marks">
            <button type="button" class="btn btn-danger btn-sm remove-q" data-index="${i}">✕</button>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <input type="text" class="form-control q-text" data-index="${i}" value="${escapeHtml(q.question)}" placeholder="Enter your question..." required>
        </div>
        ${q.type === 'mcq' ? `
          <div class="option-group">
            ${q.options.map((opt, j) => `
              <div class="option-item ${q.correctAnswer === j ? 'selected' : ''}" style="margin-bottom:6px;">
                <label class="option-label" style="cursor:pointer;">
                  <input type="radio" name="correct-${i}" value="${j}" ${q.correctAnswer === j ? 'checked' : ''} style="display:none;" class="q-correct" data-index="${i}">
                  ${String.fromCharCode(65 + j)}
                </label>
                <input type="text" class="form-control q-option" data-index="${i}" data-opt="${j}" value="${escapeHtml(opt)}" placeholder="Option ${String.fromCharCode(65 + j)}" style="flex:1;padding:8px 12px;font-size:0.85rem;">
              </div>
            `).join('')}
          </div>
        ` : q.type === 'truefalse' ? `
          <div class="option-group">
            <div class="option-item ${q.correctAnswer === 0 ? 'selected' : ''}">
              <label class="option-label" style="cursor:pointer;">
                <input type="radio" name="correct-${i}" value="0" ${q.correctAnswer === 0 ? 'checked' : ''} style="display:none;" class="q-correct" data-index="${i}"> A
              </label>
              <span class="option-text">True</span>
            </div>
            <div class="option-item ${q.correctAnswer === 1 ? 'selected' : ''}">
              <label class="option-label" style="cursor:pointer;">
                <input type="radio" name="correct-${i}" value="1" ${q.correctAnswer === 1 ? 'checked' : ''} style="display:none;" class="q-correct" data-index="${i}"> B
              </label>
              <span class="option-text">False</span>
            </div>
          </div>
        ` : `
          <div class="form-group">
            <input type="text" class="form-control q-short-answer" data-index="${i}" value="${escapeHtml(q.options[0] || '')}" placeholder="Expected answer...">
          </div>
        `}
      </div>
    `).join('');

    // Event delegation for question builder
    container.querySelectorAll('.q-text').forEach(el => {
      el.addEventListener('input', e => { questions[e.target.dataset.index].question = e.target.value; });
    });
    container.querySelectorAll('.q-type').forEach(el => {
      el.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.index);
        questions[idx].type = e.target.value;
        if (e.target.value === 'truefalse') questions[idx].options = ['True', 'False'];
        else if (e.target.value === 'short') questions[idx].options = [''];
        else questions[idx].options = ['', '', '', ''];
        questions[idx].correctAnswer = 0;
        renderQuestionBuilder(questions, container);
      });
    });
    container.querySelectorAll('.q-marks').forEach(el => {
      el.addEventListener('input', e => { questions[e.target.dataset.index].marks = parseInt(e.target.value) || 1; });
    });
    container.querySelectorAll('.q-option').forEach(el => {
      el.addEventListener('input', e => {
        const idx = parseInt(e.target.dataset.index);
        const opt = parseInt(e.target.dataset.opt);
        questions[idx].options[opt] = e.target.value;
      });
    });
    container.querySelectorAll('.q-correct').forEach(el => {
      el.addEventListener('change', e => {
        questions[e.target.dataset.index].correctAnswer = parseInt(e.target.value);
        renderQuestionBuilder(questions, container);
      });
    });
    container.querySelectorAll('.q-short-answer').forEach(el => {
      el.addEventListener('input', e => { questions[e.target.dataset.index].options[0] = e.target.value; });
    });
    container.querySelectorAll('.remove-q').forEach(el => {
      el.addEventListener('click', e => {
        questions.splice(parseInt(e.target.dataset.index), 1);
        renderQuestionBuilder(questions, container);
      });
    });
  }

  createTestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('test-title').value.trim();
    const courseId = document.getElementById('test-course').value;
    const duration = parseInt(document.getElementById('test-duration').value) || 30;
    const attemptLimit = parseInt(document.getElementById('test-attempts').value) || 1;
    const negativeMarking = document.getElementById('test-negative').checked;
    const randomOrder = document.getElementById('test-random').checked;

    if (!title) { showToast('Test title required', 'error'); return; }
    if (!courseId) { showToast('Select a course', 'error'); return; }
    if (questions.length === 0) { showToast('Add at least one question', 'error'); return; }

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    try {
      await TestService.create({
        title, courseId, duration, attemptLimit,
        negativeMarking, randomOrder, totalMarks,
        questions, createdBy: currentUser.uid
      });
      showToast('Test created successfully!', 'success');
      createTestForm.reset();
      questions = [];
      document.getElementById('questions-container').innerHTML = '';
      loadTeacherView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ── STUDENT VIEW ─────────────────────────
async function loadStudentView() {
  document.getElementById('teacher-panel').style.display = 'none';
  document.getElementById('student-panel').style.display = 'block';

  const tests = await TestService.getAll();
  const container = document.getElementById('available-tests');

  if (tests.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><h3>No tests available</h3></div>';
    return;
  }

  const enriched = await Promise.all(tests.map(async t => {
    const attempts = await ResultService.hasAttempted(t.id, currentUser.uid);
    return { ...t, attempts };
  }));

  container.innerHTML = enriched.map(t => {
    const canAttempt = t.attempts < (t.attemptLimit || 1);
    return `
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <h4 style="font-size:1rem;">${escapeHtml(t.title)}</h4>
            <div style="font-size:0.78rem;color:var(--text-muted);display:flex;gap:16px;margin-top:4px;">
              <span>⏱️ ${t.duration} min</span>
              <span>❓ ${t.questions ? t.questions.length : 0} questions</span>
              <span>📊 ${t.totalMarks} marks</span>
              <span>🔄 ${t.attempts}/${t.attemptLimit || 1} attempts</span>
            </div>
          </div>
          ${canAttempt
            ? `<button class="btn btn-primary btn-sm start-test" data-id="${t.id}">▶ Start Test</button>`
            : `<span class="badge badge-warning">Max attempts reached</span>`
          }
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.start-test').forEach(btn => {
    btn.addEventListener('click', () => startTest(btn.dataset.id));
  });
}

async function startTest(testId) {
  const test = await TestService.get(testId);
  if (!test) { showToast('Test not found', 'error'); return; }

  document.getElementById('student-panel').innerHTML = '';
  const testArea = document.getElementById('student-panel');

  let questions = [...test.questions];
  if (test.randomOrder) questions = shuffleArray(questions);

  let answers = new Array(questions.length).fill(null);
  let currentQ = 0;
  let timeLeft = test.duration * 60;

  testArea.innerHTML = `
    <div style="display:flex;gap:24px;flex-wrap:wrap;">
      <div style="flex:1;min-width:400px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h3>${escapeHtml(test.title)}</h3>
          <div class="test-timer" id="test-timer">
            <span class="timer-icon">⏱️</span>
            <span id="timer-display">${formatTime(timeLeft)}</span>
          </div>
        </div>
        <div id="question-area"></div>
        <div style="display:flex;justify-content:space-between;margin-top:16px;">
          <button class="btn btn-ghost" id="prev-q" disabled>← Previous</button>
          <button class="btn btn-primary" id="next-q">Next →</button>
        </div>
        <button class="btn btn-success btn-lg" id="submit-test" style="width:100%;margin-top:16px;">📤 Submit Test</button>
      </div>
      <div style="width:260px;">
        <div class="card">
          <h4 style="margin-bottom:12px;font-size:0.9rem;">Questions</h4>
          <div class="question-nav" id="question-nav"></div>
        </div>
      </div>
    </div>`;

  renderQuestion(currentQ);
  renderNav();
  startTimer();

  function renderQuestion(idx) {
    const q = questions[idx];
    const area = document.getElementById('question-area');
    area.innerHTML = `
      <div class="question-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div class="question-number">${idx + 1}</div>
          <span class="badge badge-primary">${q.marks} mark${q.marks > 1 ? 's' : ''}</span>
        </div>
        <div class="question-text">${escapeHtml(q.question)}</div>
        ${q.type === 'mcq' ? `
          <div class="option-group">
            ${q.options.map((opt, j) => `
              <div class="option-item ${answers[idx] === j ? 'selected' : ''}" data-opt="${j}">
                <div class="option-label">${String.fromCharCode(65 + j)}</div>
                <div class="option-text">${escapeHtml(opt)}</div>
              </div>
            `).join('')}
          </div>
        ` : q.type === 'truefalse' ? `
          <div class="option-group">
            <div class="option-item ${answers[idx] === 0 ? 'selected' : ''}" data-opt="0">
              <div class="option-label">A</div><div class="option-text">True</div>
            </div>
            <div class="option-item ${answers[idx] === 1 ? 'selected' : ''}" data-opt="1">
              <div class="option-label">B</div><div class="option-text">False</div>
            </div>
          </div>
        ` : `
          <div class="form-group" style="margin-top:12px;">
            <textarea class="form-control short-answer-input" placeholder="Type your answer...">${answers[idx] || ''}</textarea>
          </div>
        `}
      </div>`;

    // Option click
    area.querySelectorAll('.option-item').forEach(el => {
      el.addEventListener('click', () => {
        answers[idx] = parseInt(el.dataset.opt);
        renderQuestion(idx);
        renderNav();
      });
    });

    // Short answer
    const shortInput = area.querySelector('.short-answer-input');
    if (shortInput) {
      shortInput.addEventListener('input', (e) => {
        answers[idx] = e.target.value;
        renderNav();
      });
    }

    // Nav buttons
    document.getElementById('prev-q').disabled = idx === 0;
    document.getElementById('next-q').textContent = idx === questions.length - 1 ? 'Finish' : 'Next →';
  }

  function renderNav() {
    const nav = document.getElementById('question-nav');
    nav.innerHTML = questions.map((_, i) => {
      let cls = '';
      if (i === currentQ) cls = 'current';
      else if (answers[i] !== null) cls = 'answered';
      return `<div class="q-dot ${cls}" data-idx="${i}">${i + 1}</div>`;
    }).join('');
    nav.querySelectorAll('.q-dot').forEach(d => {
      d.addEventListener('click', () => { currentQ = parseInt(d.dataset.idx); renderQuestion(currentQ); renderNav(); });
    });
  }

  document.getElementById('prev-q').addEventListener('click', () => {
    if (currentQ > 0) { currentQ--; renderQuestion(currentQ); renderNav(); }
  });
  document.getElementById('next-q').addEventListener('click', () => {
    if (currentQ < questions.length - 1) { currentQ++; renderQuestion(currentQ); renderNav(); }
  });
  document.getElementById('submit-test').addEventListener('click', () => submitTest(test, questions, answers));

  function startTimer() {
    const display = document.getElementById('timer-display');
    const timerEl = document.getElementById('test-timer');
    timerInterval = setInterval(() => {
      timeLeft--;
      display.textContent = formatTime(timeLeft);
      if (timeLeft <= 300) timerEl.className = 'test-timer warning';
      if (timeLeft <= 60) timerEl.className = 'test-timer danger';
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        submitTest(test, questions, answers);
      }
    }, 1000);
  }
}

async function submitTest(test, questions, answers) {
  if (timerInterval) clearInterval(timerInterval);

  let score = 0, correctCount = 0, wrongCount = 0;

  questions.forEach((q, i) => {
    const userAns = answers[i];
    if (userAns === null || userAns === undefined) return;

    if (q.type === 'short') {
      if (String(userAns).toLowerCase().trim() === String(q.options[0]).toLowerCase().trim()) {
        score += q.marks; correctCount++;
      } else { wrongCount++; if (test.negativeMarking) score -= (test.negativeMarkValue || 0); }
    } else {
      if (userAns === q.correctAnswer) {
        score += q.marks; correctCount++;
      } else { wrongCount++; if (test.negativeMarking) score -= (test.negativeMarkValue || 0); }
    }
  });

  score = Math.max(0, score);
  const percentage = Math.round((score / test.totalMarks) * 100);

  try {
    await ResultService.submit({
      testId: test.id, studentId: currentUser.uid,
      studentName: currentUser.name, answers,
      score, totalMarks: test.totalMarks,
      percentage, correctCount, wrongCount
    });

    showToast('Test submitted successfully!', 'success');

    // Show result
    const panel = document.getElementById('student-panel');
    const color = percentage >= 70 ? 'var(--success)' : percentage >= 40 ? 'var(--warning)' : 'var(--danger)';

    panel.innerHTML = `
      <div class="card" style="text-align:center;max-width:500px;margin:40px auto;">
        <h2 style="margin-bottom:24px;">🎉 Test Submitted!</h2>
        <div class="result-score-circle" style="--score:${percentage}">
          <div class="inner">
            <div class="score-value" style="color:${color};">${percentage}%</div>
            <div class="score-label">Score</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0;">
          <div><div style="font-size:1.3rem;font-weight:700;color:var(--success);">${correctCount}</div><div style="font-size:0.78rem;color:var(--text-muted);">Correct</div></div>
          <div><div style="font-size:1.3rem;font-weight:700;color:var(--danger);">${wrongCount}</div><div style="font-size:0.78rem;color:var(--text-muted);">Wrong</div></div>
          <div><div style="font-size:1.3rem;font-weight:700;color:var(--text-primary);">${score}/${test.totalMarks}</div><div style="font-size:0.78rem;color:var(--text-muted);">Score</div></div>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <a href="result-page.html?testId=${test.id}" class="btn btn-primary">📊 View Detailed Results</a>
          <a href="test-page.html" class="btn btn-outline">← Back to Tests</a>
        </div>
      </div>`;
  } catch (err) {
    LMSLogger.database('Test submission failed', err);
    showToast('Failed to submit test. Please try again.', 'error');
  }
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
