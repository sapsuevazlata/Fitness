class AdminScheduleManager {
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
        console.log('🔧 Инициализация управления расписанием тренеров...');
        this.bindEvents();
        this.loadTrainerSchedule();
        this.loadTrainers();
    }

    bindEvents() {
        const scheduleForm = document.getElementById('trainer-schedule-form');
        if (scheduleForm) {
            scheduleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTrainerSchedule(scheduleForm);
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

        const startTimeInput = document.getElementById('schedule-start-time');
        const endTimeInput = document.getElementById('schedule-end-time');
        if (startTimeInput && endTimeInput) {
            startTimeInput.addEventListener('change', () => this.validateTime());
            endTimeInput.addEventListener('change', () => this.validateTime());
        }
    }

    async loadTrainerSchedule() {
        try {
            const response = await fetch(this.API_BASE_URL + '/admin/trainer-schedule', {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderTrainerSchedule(data.schedule);
            } else {
                this.showNotification('Ошибка загрузки расписания', 'error');
            }
        } catch (error) {
            console.error('Ошибка загрузки расписания:', error);
            this.showNotification('Ошибка загрузки расписания', 'error');
        }
    }

    renderTrainerSchedule(schedule) {
        const container = document.getElementById('admin-trainer-schedule');
        if (!container) return;

        if (!schedule || schedule.length === 0) {
            container.innerHTML = `
                <div class="empty-schedule">
                    <p>Расписание тренеров не настроено</p>
                    <button class="btn btn-primary" onclick="adminScheduleManager.openCreateScheduleModal()">
                        Добавить расписание
                    </button>
                </div>
            `;
            return;
        }

        const trainersMap = {};
        schedule.forEach(slot => {
            if (!trainersMap[slot.trainer_id]) {
                trainersMap[slot.trainer_id] = {
                    name: slot.trainer_name,
                    specialization: slot.specialization,
                    slots: []
                };
            }
            trainersMap[slot.trainer_id].slots.push(slot);
        });

        container.innerHTML = `
            <div class="schedule-header">
                <h3>Расписание тренеров</h3>
            </div>
            <div class="trainers-schedule-grid">
                ${Object.entries(trainersMap).map(([trainerId, trainer]) => `
                    <div class="trainer-schedule-card">
                        <div class="trainer-header">
                            <h4>${trainer.name}</h4>
                            <span class="specialization">${trainer.specialization || 'Специализация не указана'}</span>
                            <div class="schedule-stats">
                                <span class="stat">${this.getDaysCount(trainer.slots)}/3 дней в неделю</span>
                                <span class="stat">${this.getDailyHours(trainer.slots)}/5 часов в день</span>
                            </div>
                        </div>
                        <div class="schedule-slots">
                            ${this.renderTrainerSlots(trainer.slots)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getDaysCount(slots) {
        const uniqueDays = new Set(slots.map(slot => slot.day_of_week));
        return uniqueDays.size;
    }

    getDailyHours(slots) {
        const hoursByDay = {};
        slots.forEach(slot => {
            const start = new Date(`2000-01-01T${slot.start_time}`);
            const end = new Date(`2000-01-01T${slot.end_time}`);
            const duration = (end - start) / (1000 * 60 * 60);
            
            if (!hoursByDay[slot.day_of_week]) {
                hoursByDay[slot.day_of_week] = 0;
            }
            hoursByDay[slot.day_of_week] += duration;
        });

        const totalHours = Object.values(hoursByDay).reduce((sum, hours) => sum + hours, 0);
        const avgHours = totalHours / Object.keys(hoursByDay).length;
        return avgHours.toFixed(1);
    }

    renderTrainerSlots(slots) {
        const days = {
            monday: { name: 'Понедельник', slots: [] },
            tuesday: { name: 'Вторник', slots: [] },
            wednesday: { name: 'Среда', slots: [] },
            thursday: { name: 'Четверг', slots: [] },
            friday: { name: 'Пятница', slots: [] },
            saturday: { name: 'Суббота', slots: [] },
            sunday: { name: 'Воскресенье', slots: [] }
        };

        slots.forEach(slot => {
            if (days[slot.day_of_week]) {
                days[slot.day_of_week].slots.push(slot);
            }
        });

        return `
            <div class="weekly-schedule">
                ${Object.entries(days).map(([dayKey, day]) => `
                    <div class="day-column ${day.slots.length > 0 ? 'has-slots' : 'no-slots'}">
                        <div class="day-header">${day.name}</div>
                        <div class="day-slots">
                            ${day.slots.map(slot => this.renderScheduleSlot(slot)).join('')}
                            ${day.slots.length === 0 ? '<div class="no-slots-message">Нет тренировок</div>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderScheduleSlot(slot) {
        const startTime = slot.start_time.substring(0, 5);
        const endTime = slot.end_time.substring(0, 5);
        const duration = this.calculateDuration(slot.start_time, slot.end_time);
        
        return `
            <div class="schedule-slot personal">
                <div class="slot-time">${startTime}-${endTime}</div>
                <div class="slot-duration">${duration}ч</div>
                <div class="slot-type-badge">Индивидуальная</div>
                <div class="slot-info">
                    <span class="slots-count">${slot.max_slots} мест</span>
                </div>
                <div class="slot-actions">
                    <button class="btn btn-sm btn-outline" onclick="adminScheduleManager.editScheduleSlot(${slot.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminScheduleManager.deleteScheduleSlot(${slot.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    calculateDuration(startTime, endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        return ((end - start) / (1000 * 60 * 60)).toFixed(1);
    }

    async loadTrainers() {
        try {
            const response = await fetch(this.API_BASE_URL + '/trainers', {
                headers: this.getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.trainers = data.trainers;
                console.log('👥 Загружены тренеры:', this.trainers);
            }
        } catch (error) {
            console.error('Ошибка загрузки тренеров:', error);
        }
    }

    openCreateScheduleModal() {
        const modal = document.getElementById('create-trainer-schedule-modal');
        if (modal) {
            modal.style.display = 'block';
            const form = document.getElementById('trainer-schedule-form');
            form.reset();
            form.dataset.mode = 'create';
            document.getElementById('schedule-modal-title').textContent = 'Добавить расписание тренера';
            
            this.populateScheduleTrainerSelect();
        }
    }

    populateScheduleTrainerSelect(selectedTrainerId = null) {
        const select = document.getElementById('schedule-trainer-select');
        if (!select) {
            console.error('select для тренеров расписания не найден');
            return;
        }

        if (!this.trainers || this.trainers.length === 0) {
            select.innerHTML = '<option value="">Нет доступных тренеров</option>';
            return;
        }
        
        select.innerHTML = '<option value="">Выберите тренера</option>' +
            this.trainers
                .filter(trainer => trainer.is_active)
                .map(trainer => `
                    <option value="${trainer.id}" ${trainer.id == selectedTrainerId ? 'selected' : ''}>
                        ${trainer.name} - ${trainer.specialization || 'Без специализации'}
                    </option>
                `).join('');
    }

    validateTime() {
        const startTimeInput = document.getElementById('schedule-start-time');
        const endTimeInput = document.getElementById('schedule-end-time');
        
        if (!startTimeInput.value || !endTimeInput.value) return;

        const startTime = new Date(`2000-01-01T${startTimeInput.value}`);
        const endTime = new Date(`2000-01-01T${endTimeInput.value}`);
        const duration = (endTime - startTime) / (1000 * 60 * 60);

        if (duration < 5) {
            this.showNotification('Продолжительность тренировки должна быть не менее 5 часов', 'warning');
        }
    }

    async saveTrainerSchedule(form) {
        console.log('Сохраняем расписание тренера...');
        
        const mode = form.dataset.mode;
        const slotId = form.dataset.slotId;
        
        const formData = new FormData(form);
        
        const startTime = formData.get('start_time');
        const endTime = formData.get('end_time');
        
        if (startTime && endTime) {
            const start = new Date(`2000-01-01T${startTime}`);
            const end = new Date(`2000-01-01T${endTime}`);
            const durationHours = (end - start) / (1000 * 60 * 60);
            
            console.log(`⏱️ Продолжительность: ${durationHours} часов`);
            
            if (durationHours < 5) {
                this.showNotification('Продолжительность тренировки должна быть не менее 5 часов', 'error');
                return;
            }
        }

        const data = {
            trainer_id: parseInt(formData.get('trainer_id')),
            day_of_week: formData.get('day_of_week'),
            start_time: startTime + ':00',
            end_time: endTime + ':00',
            max_slots: parseInt(formData.get('max_slots')) || 1
        };

        console.log('Данные для отправки:', data);

        try {
            const url = mode === 'create' 
                ? this.API_BASE_URL + '/admin/trainer-schedule' 
                : this.API_BASE_URL + '/admin/trainer-schedule/' + slotId;
            const method = mode === 'create' ? 'POST' : 'PUT';

            console.log('Отправка запроса:', method, url);

            const response = await fetch(url, {
                method: method,
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('Ответ сервера:', result);
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.closeModals();
                this.loadTrainerSchedule();
            } else {
                this.showNotification(result.error || 'Ошибка сервера', 'error');
            }
        } catch (error) {
            console.error('Ошибка сохранения расписания:', error);
            this.showNotification('Ошибка сохранения: ' + error.message, 'error');
        }
    }

    async editScheduleSlot(slotId) {
        try {
            const response = await fetch(this.API_BASE_URL + '/admin/trainer-schedule', {
                headers: this.getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (data.success) {
                const slot = data.schedule.find(s => s.id == slotId);
                if (slot) {
                    this.openEditScheduleModal(slot);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки данных слота:', error);
            this.showNotification('Ошибка загрузки данных', 'error');
        }
    }

    openEditScheduleModal(slot) {
        const modal = document.getElementById('create-trainer-schedule-modal');
        if (modal) {
            modal.style.display = 'block';
            const form = document.getElementById('trainer-schedule-form');
            form.dataset.mode = 'edit';
            form.dataset.slotId = slot.id;
            document.getElementById('schedule-modal-title').textContent = 'Редактировать расписание';

            form.trainer_id.value = slot.trainer_id;
            form.day_of_week.value = slot.day_of_week;
            form.start_time.value = slot.start_time.substring(0, 5);
            form.end_time.value = slot.end_time.substring(0, 5);
            form.max_slots.value = slot.max_slots;

            this.populateScheduleTrainerSelect(slot.trainer_id);
        }
    }

    async deleteScheduleSlot(slotId) {
        if (!confirm('Вы уверены, что хотите удалить этот слот расписания?')) {
            return;
        }

        try {
            const response = await fetch(this.API_BASE_URL + '/admin/trainer-schedule/' + slotId, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(data.message, 'success');
                this.loadTrainerSchedule();
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Ошибка удаления слота:', error);
            this.showNotification('Ошибка удаления', 'error');
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
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
}

window.adminScheduleManager = new AdminScheduleManager();