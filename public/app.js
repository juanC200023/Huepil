let token = localStorage.getItem('token');
let currentUser = null;
const API = 'http://103.199.185.202:8080';

// Inicialización
window.onload = () => {
    if (token) {
        verificarToken();
    } else {
        showLogin();
    }
};

function showLogin() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('mainSection').classList.add('hidden');
}

function showMain() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainSection').classList.remove('hidden');

    if (currentUser) {
        document.getElementById('userInfo').textContent =
            `${currentUser.nombre} ${currentUser.apellido} (${currentUser.rol})`;

        if (currentUser.rol === 'admin') {
            document.getElementById('adminTab').classList.remove('hidden');
        }

        if (currentUser.rol === 'profesional') {
            document.getElementById('crearTurnoCard').style.display = 'none';
            document.getElementById('crearPacienteCard').style.display = 'none';
        }

        listarPacientes();
        cargarProfesionales();
        turnosHoy();
    }
}

async function verificarToken() {
    try {
        const response = await fetch(`${API}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentUser = await response.json();
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
    try {
        const response = await fetch(`${API}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            showMain();
        } else {
            showMessage('loginMessage', data.error, 'error');
        }
    } catch {
        showMessage('loginMessage', 'Error de conexión', 'error');
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    showLogin();
}

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tabName + 'Content').classList.add('active');
}

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `alert ${type}`;
    element.classList.remove('hidden');
    setTimeout(() => element.classList.add('hidden'), 5000);
}

/* ---------------- TURNOS ---------------- */
async function crearTurno() {
    try {
        const response = await fetch(`${API}/api/turnos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                paciente_id: parseInt(document.getElementById('turnoPaciente').value),
                profesional_id: parseInt(document.getElementById('turnoProfesional').value),
                fecha: new Date(document.getElementById('turnoFecha').value).toISOString(),
                centro: document.getElementById('turnoCentro').value,
                servicio: document.getElementById('turnoServicio').value
            })
        });

        if (response.ok) {
            alert('Turno creado exitosamente');
            document.getElementById('turnoFecha').value = '';
            listarTurnos();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch {
        alert('Error de conexión');
    }
}

async function listarTurnos() {
    try {
        const params = new URLSearchParams();

        const desde = document.getElementById('filtroDesde').value;
        const hasta = document.getElementById('filtroHasta').value;
        const estado = document.getElementById('filtroEstado').value;

        if (desde) params.append('desde', desde + 'T00:00:00Z');
        if (hasta) params.append('hasta', hasta + 'T23:59:59Z');
        if (estado) params.append('estado', estado);

        const response = await fetch(`${API}/api/turnos?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const turnos = await response.json();
        mostrarTurnos(turnos);
    } catch {
        alert('Error cargando turnos');
    }
}

async function turnosHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('filtroDesde').value = hoy;
    document.getElementById('filtroHasta').value = hoy;
    listarTurnos();
}

function mostrarTurnos(turnos) {
    const lista = document.getElementById('turnosLista');

    if (!turnos.length) {
        lista.innerHTML = '<p>No hay turnos para mostrar</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Profesional</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            ${turnos.map(t => `
                <tr>
                    <td>${new Date(t.fecha).toLocaleString()}</td>
                    <td>${t.paciente_apellido}, ${t.paciente_nombre}</td>
                    <td>${t.profesional_apellido}, ${t.profesional_nombre}</td>
                    <td><span class="status ${t.estado}">${t.estado}</span></td>
                    <td>
                        ${currentUser.rol !== 'profesional' || currentUser.id === t.profesional_id ?
                            `<select onchange="cambiarEstado(${t.id}, this.value)">
                                <option value="${t.estado}">${t.estado}</option>
                                <option value="presente">Presente</option>
                                <option value="ausente">Ausente</option>
                                <option value="cancelado">Cancelado</option>
                                <option value="ausente_profesional">Ausente Prof.</option>
                            </select>` : ''}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;

    lista.innerHTML = '';
    lista.appendChild(table);
}

async function cambiarEstado(turnoId, nuevoEstado) {
    try {
        const response = await fetch(`${API}/api/turnos/${turnoId}/estado`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        if (response.ok) {
            listarTurnos();
        } else {
            alert('Error actualizando estado');
        }
    } catch {
        alert('Error de conexión');
    }
}

/* ---------------- PACIENTES ---------------- */
async function crearPaciente() {
    try {
        const response = await fetch(`${API}/api/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                dni: document.getElementById('pacienteDni').value,
                apellido: document.getElementById('pacienteApellido').value,
                nombre: document.getElementById('pacienteNombre').value,
                telefono: document.getElementById('pacienteTelefono').value,
                email: document.getElementById('pacienteEmail').value,
                obra_social: document.getElementById('pacienteObraSocial').value
            })
        });

        if (response.ok) {
            alert('Paciente creado exitosamente');
            listarPacientes();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch {
        alert('Error de conexión');
    }
}

async function listarPacientes() {
    try {
        const q = document.getElementById('buscarPaciente')?.value || '';
        const response = await fetch(`${API}/api/patients?q=${encodeURIComponent(q)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const pacientes = await response.json();
        actualizarSelectPacientes(pacientes);
    } catch {
        alert('Error cargando pacientes');
    }
}

function actualizarSelectPacientes(pacientes) {
    const selects = ['turnoPaciente', 'historiaPaciente'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Seleccionar paciente...</option>';
            pacientes.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.apellido}, ${p.nombre}</option>`;
            });
        }
    });
}

async function cargarProfesionales() {
    try {
        const response = await fetch(`${API}/api/auth/usuarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const usuarios = await response.json();
            const profesionales = usuarios.filter(u => u.rol === 'profesional');

            const select = document.getElementById('turnoProfesional');
            select.innerHTML = '<option value="">Seleccionar profesional...</option>';
            profesionales.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.apellido}, ${p.nombre} (${p.especialidad || 'General'})</option>`;
            });
        }
    } catch (e) {
        console.error('Error cargando profesionales:', e);
    }
}
