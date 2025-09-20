const form = document.getElementById('question-form');
const questionsList = document.getElementById('questions-list');
const authModal = document.getElementById('auth-modal');
const authBtn = document.getElementById('auth-btn');
const closeBtn = document.querySelector('.close-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const welcomeMessage = document.getElementById('welcome-message');
const usernameDisplay = document.getElementById('username-display');
const addQuestionSection = document.getElementById('add-question-section');

// New selectors for the edit form
const editSection = document.getElementById('edit-question-section');
const editForm = document.getElementById('edit-form');
const editQuestionId = document.getElementById('edit-question-id');
const editTitle = document.getElementById('edit-title');
const editProblemStatement = document.getElementById('edit-problemStatement');
const editSolution = document.getElementById('edit-solution');
const editTopic = document.getElementById('edit-topic');
const cancelEditBtn = document.getElementById('cancel-edit-btn');


// Helper function to format the date
const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

// Check authentication status on page load
const checkAuth = () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) {
        addQuestionSection.style.display = 'block';
        authBtn.textContent = 'Logout';
        welcomeMessage.style.display = 'inline';
        usernameDisplay.textContent = username;
        return true;
    } else {
        addQuestionSection.style.display = 'none';
        authBtn.textContent = 'Login';
        welcomeMessage.style.display = 'none';
        return false;
    }
};

const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    checkAuth();
    fetchQuestions();
};

// --- Modal and Form Switching Logic ---
authBtn.addEventListener('click', () => {
    if (authBtn.textContent === 'Logout') {
        handleLogout();
    } else {
        authModal.style.display = 'block';
    }
});

closeBtn.addEventListener('click', () => {
    authModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === authModal) {
        authModal.style.display = 'none';
    }
});

showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form-container').style.display = 'none';
    document.getElementById('register-form-container').style.display = 'block';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form-container').style.display = 'block';
    document.getElementById('register-form-container').style.display = 'none';
});

// --- Authentication Forms ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const res = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('userId', data.userId);
            authModal.style.display = 'none';
            checkAuth();
            fetchQuestions();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    try {
        const res = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            document.getElementById('register-form-container').style.display = 'none';
            document.getElementById('login-form-container').style.display = 'block';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
    }
});

// --- API Calls ---
const fetchQuestions = async () => {
    try {
        const response = await fetch('http://localhost:3000/questions');
        const questions = await response.json();
        
        questionsList.innerHTML = '';
        questions.forEach(question => {
            const questionElement = document.createElement('div');
            questionElement.className = 'question-card';
            questionElement.innerHTML = `
                <h3 class="question-title">${question.title}</h3>
                <p class="problem-statement"><strong>Problem:</strong> ${question.problemStatement}</p>
                <div class="question-meta">
                    <span class="submission-topic">Topic: ${question.topic}</span>
                    <span class="submission-date">Submitted on ${formatDate(question.dateCreated)}</span>
                </div>
                <div class="card-actions">
                    <button class="view-solution-btn">View Solution</button>
                    ${localStorage.getItem('token') ? `
                        <button class="edit-btn" data-id="${question._id}">Edit</button>
                        <button class="delete-btn" data-id="${question._id}">Delete</button>
                    ` : ''}
                </div>
                <pre class="solution-code" style="display: none;">${question.solution}</pre>
            `;
            questionsList.appendChild(questionElement);

            const viewSolutionBtn = questionElement.querySelector('.view-solution-btn');
            const solutionCode = questionElement.querySelector('.solution-code');
            viewSolutionBtn.addEventListener('click', () => {
                const isHidden = solutionCode.style.display === 'none';
                solutionCode.style.display = isHidden ? 'block' : 'none';
                viewSolutionBtn.textContent = isHidden ? 'Hide Solution' : 'View Solution';
            });
        });

        // Set up event listeners for delete and edit buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const confirmed = confirm("Are you sure you want to delete this question?");
                if (confirmed) {
                    const questionId = e.target.dataset.id;
                    const token = localStorage.getItem('token');
                    try {
                        const deleteResponse = await fetch(`http://localhost:3000/questions/${questionId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (deleteResponse.ok) {
                            fetchQuestions();
                        } else {
                            console.error('Failed to delete question');
                            alert('You are not authorized to delete this question.');
                        }
                    } catch (error) {
                        console.error('Error deleting question:', error);
                    }
                }
            });
        });
        
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const questionId = e.target.dataset.id;
                const questionToEdit = questions.find(q => q._id === questionId);
                
                // Show edit form and hide the add form
                addQuestionSection.style.display = 'none';
                editSection.style.display = 'block';

                // Populate the edit form with current data
                editQuestionId.value = questionToEdit._id;
                editTitle.value = questionToEdit.title;
                editProblemStatement.value = questionToEdit.problemStatement;
                editSolution.value = questionToEdit.solution;
                editTopic.value = questionToEdit.topic;
            });
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
    }
};

// Add an event listener for the edit form submission
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const questionId = editQuestionId.value;

    const updatedQuestion = {
        title: editTitle.value,
        problemStatement: editProblemStatement.value,
        solution: editSolution.value,
        topic: editTopic.value
    };

    try {
        const response = await fetch(`http://localhost:3000/questions/${questionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedQuestion),
        });

        if (response.ok) {
            alert('Question updated successfully!');
            editSection.style.display = 'none';
            addQuestionSection.style.display = 'block';
            fetchQuestions(); // Refresh the list
        } else {
            console.error('Failed to update question.');
            alert('You must be logged in to update a question.');
        }
    } catch (error) {
        console.error('Error updating question:', error);
        alert('You must be logged in to update a question.');
    }
});

// Add an event listener for the cancel button on the edit form
cancelEditBtn.addEventListener('click', () => {
    addQuestionSection.style.display = 'block';
    editSection.style.display = 'none';
    editForm.reset();
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let title = document.getElementById('title').value;
    const problemStatement = document.getElementById('problemStatement').value;
    const solution = document.getElementById('solution').value;
    const topic = document.getElementById('topic').value;

    if (title.trim() === '') {
        title = 'Untitled Question';
    }

    const newQuestion = { title, problemStatement, solution, topic };
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('https://coding-questions-solver.vercel.app/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newQuestion),
        });

        if (response.ok) {
            form.reset();
            fetchQuestions();
        } else {
            console.error('Failed to submit question.');
            alert('You must be logged in to submit a question.');
        }
    } catch (error) {
        console.error('Error submitting question:', error);
        alert('You must be logged in to submit a question.');
    }
});

// Initial calls on page load
checkAuth();
fetchQuestions();