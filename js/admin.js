class AdminManager {
    constructor() {
        this.token = Auth.getToken();
        this.API_BASE_URL = 'http://localhost:3000/api';
        this.trainers = [];
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    init() {
        console.log('Инициализация админ-панели...');
        this.bindEvents();
        this.loadTrainers();
        this.loadStats();
        this.loadGroupSessions();
    }

    bindEvents() {
        console.log('Привязка событий админ-панели...');
        
        const trainerForm = document.getElementById('trainer-form');
        if (trainerForm) {
            trainerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTrainer(trainerForm);
            });
        }

        const sessionForm = document.getElementById('session-form');
        if (sessionForm) {
            sessionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSession(sessionForm);
            });
            
            const dayCheckboxes = sessionForm.querySelectorAll('input[name="days"]');
            dayCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const checked = sessionForm.querySelectorAll('input[name="days"]:checked');
                    if (checked.length > 2) {
                        e.target.checked = false;
                    }
                });
            });
        }

        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.closeModals());
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }

    async loadStats() {
        try {
            const response = await fetch(this.API_BASE_URL + '/admin/stats', {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderStats(data.stats);
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            const fallbackStats = {
                totalClients: 0,
                activeTrainers: 0,
                todaySessions: 0,
                monthlyRevenue: 0
            };
            this.renderStats(fallbackStats);
        }
    }

    renderStats(stats) {
        console.log('Статистика:', stats);
        if (stats.totalClients !== undefined) {
            document.getElementById('totalClients').textContent = stats.totalClients;
        }
        if (stats.activeTrainers !== undefined) {
            document.getElementById('activeTrainers').textContent = stats.activeTrainers;
        }
        if (stats.todaySessions !== undefined) {
            document.getElementById('todaySessions').textContent = stats.todaySessions;
        }
        if (stats.monthlyRevenue !== undefined) {
            document.getElementById('monthlyRevenue').textContent = stats.monthlyRevenue + ' ₽';
        }
    }

    async loadTrainers() {
        try {
            console.log('Загрузка тренеров...');
            const url = this.API_BASE_URL + '/trainers';
            console.log('URL запроса:', url);
            console.log('Токен:', this.token ? 'Есть' : 'Нет');
            
            const response = await fetch(url, {
                headers: this.getAuthHeaders()
            });
            
            console.log('Статус ответа:', response.status);
            console.log('Заголовки ответа:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка HTTP:', response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Ответ сервера:', data);
            
            if (data.success) {
                this.trainers = data.trainers;
                this.renderTrainers(data.trainers);
            } else {
                this.showNotification('Ошибка загрузки тренеров: ' + (data.error || 'неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('Ошибка загрузки тренеров:', error);
            this.showNotification('Ошибка загрузки тренеров: ' + error.message, 'error');
        }
    }

    renderTrainers(trainers) {
        const container = document.getElementById('admin-trainers-list');
        if (!container) {
            console.error('Контейнер тренеров не найден');
            return;
        }

        console.log('Рендерим тренеров:', trainers);

        if (!trainers || trainers.length === 0) {
            container.innerHTML = '<div class="card"><p>Тренеры не найдены</p></div>';
            return;
        }

        container.innerHTML = trainers.map(trainer => `
            <div class="card trainer-card">
                <div class="card-content">
                    <h3>${trainer.name || 'Без имени'}</h3>
                    <p><strong>Email:</strong> ${trainer.email || 'Не указан'}</p>
                    <p><strong>Телефон:</strong> ${trainer.phone || 'Не указан'}</p>
                    <p><strong>Опыт:</strong> ${this.getExperienceText(trainer.experience)}</p>
                    <p><strong>Специализация:</strong> ${trainer.specialization || 'Не указана'}</p>
                    <p><strong>Статус:</strong> ${trainer.is_active ? 'Активен' : 'Неактивен'}</p>
                    <div class="card-actions">
                        <button class="btn btn-outline" onclick="adminManager.editTrainer(${trainer.id})">Редактировать</button>
                        <button class="btn btn-danger" onclick="adminManager.deleteTrainer(${trainer.id})">Удалить</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    openCreateTrainerModal() {
        console.log('Открываем модальное окно тренера');
        const modal = document.getElementById('create-trainer-modal');
        if (modal) {
            modal.style.display = 'block';
            const form = document.getElementById('trainer-form');
            form.reset();
            form.dataset.mode = 'create';
            
            const passwordField = form.querySelector('#password-field');
            if (passwordField) passwordField.style.display = 'block';
            
            const activeField = form.querySelector('#active-field');
            if (activeField) activeField.remove();
        } else {
            console.error('Модальное окно не найдено');
        }
    }

    async saveTrainer(form) {
        console.log('Сохраняем тренера...');
        
        const mode = form.dataset.mode;
        const trainerId = form.dataset.trainerId;
        
        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            experience: formData.get('experience'),
            specialization: formData.get('specialization'),
            bio: formData.get('bio'),
            is_active: formData.get('is_active') ? true : false
        };

        if (mode === 'create') {
            const password = formData.get('password');
            if (!password) {
                this.showNotification('Пароль обязателен', 'error');
                return;
            }
            data.password = password;
        }

        try {
            let response;
            const url = mode === 'create' 
                ? this.API_BASE_URL + '/trainers' 
                : this.API_BASE_URL + '/trainers/' + trainerId;
            const method = mode === 'create' ? 'POST' : 'PUT';

            console.log(`Отправка запроса: ${method} ${url}`, data);

            response = await fetch(url, {
                method: method,
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('Ответ сервера:', result);
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.closeModals();
                this.loadTrainers();
                this.loadStats();
            } else {
                this.showNotification(result.error || 'Ошибка сервера', 'error');
            }
        } catch (error) {
            console.error('Ошибка сохранения тренера:', error);
            this.showNotification('Ошибка сохранения: ' + error.message, 'error');
        }
    }

    async editTrainer(trainerId) {
        console.log('Редактируем тренера:', trainerId);
        try {
            const response = await fetch(this.API_BASE_URL + '/trainers', {
                headers: this.getAuthHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                const trainer = data.trainers.find(t => t.id == trainerId);
                if (trainer) {
                    this.openEditTrainerModal(trainer);
                } else {
                    this.showNotification('Тренер не найден', 'error');
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки данных тренера:', error);
            this.showNotification('Ошибка загрузки данных тренера', 'error');
        }
    }

    openEditTrainerModal(trainer) {
        console.log('Открываем редактирование тренера:', trainer);
        const modal = document.getElementById('create-trainer-modal');
        if (modal) {
            modal.style.display = 'block';
            const form = document.getElementById('trainer-form');
            form.dataset.mode = 'edit';
            form.dataset.trainerId = trainer.id;
            
            form.name.value = trainer.name || '';
            form.email.value = trainer.email || '';
            form.phone.value = trainer.phone || '';
            form.experience.value = trainer.experience || '';
            form.specialization.value = trainer.specialization || '';
            form.bio.value = trainer.bio || '';
            
            const passwordField = form.querySelector('#password-field');
            if (passwordField) passwordField.style.display = 'none';
            
            let activeField = form.querySelector('#active-field');
            if (!activeField) {
                activeField = document.createElement('div');
                activeField.id = 'active-field';
                activeField.innerHTML = `
                    <label style="display: flex; align-items: center; gap: 8px; margin: 10px 0;">
                        <input type="checkbox" name="is_active" ${trainer.is_active ? 'checked' : ''}>
                        Активный тренер
                    </label>
                `;
                form.insertBefore(activeField, form.querySelector('button'));
            }
        }
    }

    async deleteTrainer(trainerId) {
        try {
            const response = await fetch(this.API_BASE_URL + '/trainers', {
                headers: this.getAuthHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                const trainer = data.trainers.find(t => t.id == trainerId);
                if (trainer) {
                    this.openDeleteConfirmModal(trainer);
                } else {
                    this.showNotification('Тренер не найден', 'error');
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки данных тренера:', error);
            this.showNotification('Ошибка загрузки данных тренера', 'error');
        }
    }

    openDeleteConfirmModal(trainer) {
        console.log('Подтверждение удаления тренера:', trainer);
        const modal = document.getElementById('delete-confirm-modal');
        if (modal) {
            modal.style.display = 'block';
            
            document.getElementById('delete-trainer-name').textContent = trainer.name || 'Без имени';
            
            const confirmBtn = document.getElementById('confirm-delete-btn');
            confirmBtn.onclick = null;
            confirmBtn.onclick = () => this.confirmDeleteTrainer(trainer.id);
        }
    }

    async confirmDeleteTrainer(trainerId) {
        try {
            console.log('Удаляем тренера:', trainerId);
            const response = await fetch(this.API_BASE_URL + '/trainers/' + trainerId, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message, 'success');
                this.closeModals();
                this.loadTrainers();
                this.loadStats();
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Ошибка удаления тренера:', error);
            this.showNotification('Ошибка удаления', 'error');
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    getExperienceText(experience) {
        const experiences = {
            '1-3': '1-3 года',
            '3-5': '3-5 лет', 
            '5+': 'Более 5 лет'
        };
        return experiences[experience] || 'Не указан';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async loadUsers() {
        try {
            console.log('Загрузка клиентов...');
            const response = await fetch(this.API_BASE_URL + '/users', {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Получены пользователи:', data);
            
            if (data.success) {
                const clients = data.users.filter(user => user.role === 'client');
                this.renderUsers(clients);
                this.updateUserStats(clients);
            } else {
                this.showNotification('Ошибка загрузки клиентов', 'error');
            }
        } catch (error) {
            console.error('Ошибка загрузки клиентов:', error);
            this.showNotification('Ошибка загрузки клиентов: ' + error.message, 'error');
        }
    }

    renderUsers(clients) {
        const container = document.getElementById('admin-users-list');
        if (!container) {
            console.error('Контейнер пользователей не найден');
            return;
        }

        if (!clients || clients.length === 0) {
            container.innerHTML = '<div class="card"><p>Клиенты не найдены</p></div>';
            return;
        }

        container.innerHTML = clients.map(client => `
            <div class="card user-card">
                <div class="card-content">
                    <div class="user-header">
                        <h3>${client.name || 'Без имени'}</h3>
                        <span class="role-badge client">Клиент</span>
                    </div>
                    <div class="user-info">
                        <p><strong>Email:</strong> ${client.email || 'Не указан'}</p>
                        <p><strong>Телефон:</strong> ${client.phone || 'Не указан'}</p>
                        <p><strong>Дата регистрации:</strong> ${this.formatDate(client.created_at)}</p>
                        <p><strong>ID:</strong> ${client.id}</p>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-danger" onclick="adminManager.deleteUser(${client.id}, '${client.name || 'Клиент'}')">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateUserStats(clients) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const newClientsThisMonth = clients.filter(client => {
            if (!client.created_at) return false;
            const createdDate = new Date(client.created_at);
            return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
        }).length;

        document.getElementById('newClientsThisMonth').textContent = newClientsThisMonth;
    }

    async deleteUser(userId, userName) {
    if (!confirm(`Вы уверены, что хотите удалить клиента "${userName}"? Это действие нельзя отменить.`)) {
        return;
    }

    try {
        console.log('Удаляем клиента:', userId);
        const response = await fetch(this.API_BASE_URL + '/users/' + userId, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
        
        console.log('Статус ответа удаления:', response.status);
        console.log('Заголовки ответа:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка HTTP:', response.status, errorText);
            
            if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
                throw new Error(`Сервер вернул HTML вместо JSON. Проверьте endpoint. Статус: ${response.status}`);
            }
            
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 100)}`);
        }
       
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`Клиент "${userName}" успешно удален`, 'success');
                this.loadUsers();
            } else {
                this.showNotification(data.error || 'Ошибка удаления клиента', 'error');
            }
        } else {
            const text = await response.text();
            console.error('Сервер вернул не JSON:', text.substring(0, 200));
            this.showNotification('Ошибка сервера: неверный формат ответа', 'error');
        }
        
    } catch (error) {
        console.error('Ошибка удаления клиента:', error);
        this.showNotification('Ошибка удаления клиента: ' + error.message, 'error');
    }
}

    formatDate(dateString) {
        if (!dateString) return 'Не указана';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    async loadGroupSessions() {
        try {
            console.log('Загрузка групповых занятий...');
            const response = await fetch(this.API_BASE_URL + '/group-sessions', {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Ответ сервера занятий:', data);
            
            if (data.success) {
                this.renderGroupSessions(data.sessions);
            } else {
                this.showNotification('Ошибка загрузки занятий: ' + (data.error || 'неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('Ошибка загрузки групповых занятий:', error);
            this.showNotification('Ошибка загрузки занятий: ' + error.message, 'error');
        }
    }

    renderGroupSessions(sessions) {
        const container = document.getElementById('admin-sessions-list');
        if (!container) return;

        container.innerHTML = sessions.map(session => `
            <div class="class-card" data-session-id="${session.id}">
                <div class="card-header">
                    <h3>${session.name}</h3>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-outline" onclick="adminManager.openEditSessionModal(${JSON.stringify(session).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminManager.deleteSession(${session.id}, '${session.name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="card-content">
                    <p class="class-description">${session.description || 'Описание отсутствует'}</p>
                    
                    <div class="class-details">
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <span>${this.getDaysText(session.days)}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>${session.time ? session.time.substring(0, 5) : '--:--'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-stopwatch"></i>
                            <span>${session.duration || 0} мин.</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <span>${session.current_participants || 0}/${session.max_participants || 0}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-user-tie"></i>
                            <span>${session.trainer_name || 'Не назначен'}</span>
                        </div>
                    </div>

                    <div class="class-status ${session.is_active ? 'active' : 'inactive'}">
                        ${session.is_active ? '✅ Активно' : '❌ Неактивно'}
                    </div>
                </div>
            </div>
        `).join('');
    }

    openCreateSessionModal() {
        console.log('Открываем модальное окно занятия');
        const modal = document.getElementById('create-session-modal');
        if (modal) {
            modal.style.display = 'block';
            const form = document.getElementById('session-form');
            form.reset();
            form.dataset.mode = 'create';
            document.getElementById('session-modal-title').textContent = 'Добавить групповое занятие';
            
            this.populateSessionTrainerSelect();
            
            const activeField = form.querySelector('#session-active-field');
            if (activeField) activeField.remove();
        }
    }

    async editSession(sessionId) {
        console.log('Редактируем занятие:', sessionId);
        try {
            const response = await fetch(`${this.API_BASE_URL}/group-sessions/${sessionId}`, {
                headers: this.getAuthHeaders()
            });
            
            console.log('Статус ответа редактирования:', response.status);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Занятие не найдено');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Данные для редактирования:', data);
            
            if (data.success) {
                this.openEditSessionModal(data.session);
            } else {
                this.showNotification('Ошибка загрузки данных: ' + (data.error || ''), 'error');
            }
        } catch (error) {
            console.error('Ошибка загрузки данных занятия:', error);
            this.showNotification('Ошибка загрузки данных занятия: ' + error.message, 'error');
        }
    }

    openEditSessionModal(session) {
        console.log('Открываем редактирование занятия:', session);
        const modal = document.getElementById('create-session-modal');
        if (modal) {
            modal.style.display = 'block';
            const form = document.getElementById('session-form');
            form.dataset.mode = 'edit';
            form.dataset.sessionId = session.id;
            document.getElementById('session-modal-title').textContent = 'Редактировать занятие';
            
            form.name.value = session.name || '';
            form.description.value = session.description || '';
            form.time.value = session.time ? session.time.substring(0, 5) : '10:00';
            form.max_participants.value = session.max_participants || '';
            form.duration.value = session.duration || '';
            
            const days = session.days ? (Array.isArray(session.days) ? session.days : session.days.split(',')) : [];
            console.log('Дни для чекбоксов:', days);
            
            form.querySelectorAll('input[name="days"]').forEach(checkbox => {
                checkbox.checked = days.includes(checkbox.value);
            });
            
            this.populateSessionTrainerSelect(session.trainer_id);
            
            const activeCheckbox = form.querySelector('input[name="is_active"]');
            if (activeCheckbox) {
                activeCheckbox.checked = session.is_active;
            }
        }
    }

    populateSessionTrainerSelect(selectedTrainerId = null) {
        const select = document.getElementById('session-trainer-select');
        if (!select) {
            console.error('select для тренеров не найден');
            return;
        }

        if (!this.trainers || this.trainers.length === 0) {
            console.log('Список тренеров пуст');
            select.innerHTML = '<option value="">Нет доступных тренеров</option>';
            return;
        }

        console.log('Заполняем select тренеров:', this.trainers);
        
        select.innerHTML = '<option value="">Без тренера</option>' +
            this.trainers
                .filter(trainer => trainer.is_active)
                .map(trainer => `
                    <option value="${trainer.id}" ${trainer.id == selectedTrainerId ? 'selected' : ''}>
                        ${trainer.name} - ${trainer.specialization || 'Без специализации'}
                    </option>
                `).join('');
    }

    async saveSession(form) {
        console.log('Сохраняем занятие...');
        
        const mode = form.dataset.mode;
        const sessionId = form.dataset.sessionId;
        
        const formData = new FormData(form);
        const selectedDays = Array.from(form.querySelectorAll('input[name="days"]:checked'))
            .map(checkbox => checkbox.value);
        
        if (selectedDays.length !== 2) {
            this.showNotification('Пожалуйста, выберите ровно два дня недели', 'error');
            return;
        }
        
        const trainerId = form.trainer_id.value;
        console.log('🔍 trainer_id:', trainerId);
        
        const data = {
            name: form.name.value,
            description: form.description.value,
            days: selectedDays,
            time: form.time.value,
            max_participants: parseInt(form.max_participants.value),
            duration: parseInt(form.duration.value),
            is_active: form.is_active.checked,
            trainer_id: trainerId === '' ? null : parseInt(trainerId)
        };

        console.log('Данные для отправки:', data);

        try {
            const url = mode === 'create' 
                ? this.API_BASE_URL + '/group-sessions' 
                : this.API_BASE_URL + '/group-sessions/' + sessionId;
            const method = mode === 'create' ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method: method,
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.closeModals();
                this.loadGroupSessions();
            } else {
                this.showNotification(result.error || 'Ошибка сервера', 'error');
            }
        } catch (error) {
            console.error('Ошибка сохранения занятия:', error);
            this.showNotification('Ошибка сохранения: ' + error.message, 'error');
        }
    }

    async deleteSession(sessionId) {
        console.log('Удаляем занятие:', sessionId);
        try {
            const response = await fetch(this.API_BASE_URL + '/group-sessions/' + sessionId, {
                headers: this.getAuthHeaders()
            });
            
            console.log('Статус ответа удаления:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка HTTP при удалении:', response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Ответ удаления:', data);
            
            if (data.success) {
                this.openDeleteSessionConfirmModal(data.session);
            } else {
                this.showNotification('Ошибка удаления: ' + (data.error || ''), 'error');
            }
        } catch (error) {
            console.error('Ошибка загрузки данных занятия для удаления:', error);
            this.showNotification('Ошибка: ' + error.message, 'error');
        }
    }

    openDeleteSessionConfirmModal(session) {
        console.log('Подтверждение удаления занятия:', session);
        const modal = document.getElementById('delete-session-confirm-modal');
        if (modal) {
            modal.style.display = 'block';
            
            document.getElementById('delete-session-name').textContent = session.name || 'Без названия';
            
            const confirmBtn = document.getElementById('confirm-session-delete-btn');
            confirmBtn.onclick = null;
            confirmBtn.onclick = () => this.confirmDeleteSession(session.id);
        }
    }

    async confirmDeleteSession(sessionId) {
        try {
            console.log('Удаляем занятие:', sessionId);
            const response = await fetch(this.API_BASE_URL + '/group-sessions/' + sessionId, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message, 'success');
                this.closeModals();
                this.loadGroupSessions();
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Ошибка удаления занятия:', error);
            this.showNotification('Ошибка удаления', 'error');
        }
    }

    getDaysText(daysString) {
        const daysMap = {
            'monday': 'Понедельник',
            'tuesday': 'Вторник',
            'wednesday': 'Среда',
            'thursday': 'Четверг',
            'friday': 'Пятница',
            'saturday': 'Суббота',
            'sunday': 'Воскресенье'
        };
        
        if (!daysString) return 'Не указаны';
        
        return daysString.split(',')
            .map(day => daysMap[day] || day)
            .join(', ');
    }
}

window.adminManager = new AdminManager();
