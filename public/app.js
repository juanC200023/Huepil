let token = localStorage.getItem('token');
let currentUser  = null;
const API = 'http://103.199.185.202:8080';

window.onload = () => {
    if (token) {
        verificarToken();
    } else {
        showLogin();
    }

    // Event listeners para pestañas
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            showTab(tabName);
        });
    });

    // Event listener para botón Ingresar
    const btnIngresar = document.getElementById('btnIngresar');
    if (btnIngresar) {
        btnIngresar.addEventListener('click', login);
    }

    // Event listener para botón Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }
};

function showLogin() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('mainSection').classList.add('hidden');
    clearMessage('loginMessage');
}

function showMain() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainSection').classList.remove('hidden');

    if (currentUser ) {
        document.getElementById('userInfo').textContent =
            `${currentUser .nombre} ${currentUser .apellido} (${currentUser .rol})`;

        if (currentUser .rol === 'admin') {
            document.getElementById('adminTab').classList.remove('hidden');
        } else {
            document.getElementById('adminTab').classList.add('hidden');
        }

        // Aquí puedes llamar funciones para cargar datos iniciales
        // listarPacientes();
        // cargarProfesionales();
        // turnosHoy();

        showTab('turnos'); // Mostrar pestaña por defecto
    }
}

async function verificarToken() {
    try {
        const response = await fetch(`${API}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentUser  = await response.json();
            showMain();
        } else {
            localStorage.removeItem('token');
            token = null;
            showLogin();
        }
    } catch {
        localStorage.removeItem('token');
        token = null;
        showLogin();
    }
}

async function login() {
    clearMessage('loginMessage');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        showMessage('loginMessage', 'Por favor ingresa email y contraseña', 'error');
        return;
    }

    try {
        const response = await fetch(`${API}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            currentUser  = data.user;
            localStorage.setItem('token', token);
            showMain();
        } else {
            showMessage('loginMessage', data.error || 'Error en login', 'error');
        }
    } catch {
        showMessage('loginMessage', 'Error de conexión', 'error');
    }
}

function logout() {
    token = null;
    currentUser  = null;
    localStorage.removeItem('token');
    showLogin();
}

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const tab = Array.from(document.querySelectorAll('.tab')).find(t => t.getAttribute('data-tab') === tabName);
    if (tab) tab.classList.add('active');

    const content = document.getElementById(tabName + 'Content');
    if (content) content.classList.add('active');
}

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `alert ${type}`;
    element.classList.remove('hidden');
    setTimeout(() => element.classList.add('hidden'), 5000);
}

function clearMessage(elementId) {
    const element = document.getElementById(elementId);
    element.textContent = '';
    element.className = 'alert hidden';
}
